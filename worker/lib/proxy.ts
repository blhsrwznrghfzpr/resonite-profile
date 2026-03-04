import { DEFAULT_API_TIMEOUT_MS, RESONITE_API_BASE } from '../constants.ts';
import type { RuntimeConfig } from '../types.ts';
import {
  jsonResponse,
  errorResponse,
  withCacheHeaders,
  withServerTiming,
} from './response.ts';
import { readKvCache, writeKvCache } from './cache.ts';

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_API_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  retries: number,
  timeoutMs: number
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetchWithTimeout(url, init, timeoutMs);
    } catch (error) {
      lastError = error;
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      if (!isTimeout || attempt === retries) {
        throw error;
      }
    }
  }

  throw lastError;
}

interface ProxyGetOptions {
  kvNamespace?: KVNamespace | null;
  kvTtlSeconds?: number;
  requestId?: string;
}

export async function proxyGet(
  request: Request,
  upstreamUrl: string,
  cacheControl: string,
  runtimeConfig: RuntimeConfig,
  options: ProxyGetOptions = {}
): Promise<Response> {
  const {
    kvNamespace = null,
    kvTtlSeconds = runtimeConfig.searchCacheTtlSeconds,
    requestId = '',
  } = options;

  const cache = caches.default;
  const canPopulateCache = request.method !== 'HEAD';
  const cacheKey = new Request(request.url, { method: 'GET' });

  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    const hitResponse = withCacheHeaders(cachedResponse, cacheControl, 'HIT');
    return withServerTiming(hitResponse, 'edge-cache', 0);
  }

  const kvReadStart = Date.now();
  const kvCachedPayload = await readKvCache(request.url, kvNamespace);
  if (kvCachedPayload) {
    const kvHitResponse = jsonResponse(kvCachedPayload, 200, {
      'Cache-Control': cacheControl,
      'X-Worker-Cache': 'KV-HIT',
    });
    return withServerTiming(
      kvHitResponse,
      'kv-cache',
      Date.now() - kvReadStart
    );
  }

  const upstreamStart = Date.now();

  try {
    const response = await fetchWithRetry(
      upstreamUrl,
      { headers: requestId ? { 'X-Request-Id': requestId } : undefined },
      runtimeConfig.getRetryCount,
      runtimeConfig.timeoutMs
    );

    if (!response.ok) {
      const upstreamErrorResponse = errorResponse(
        response.status,
        `API returned ${response.status}`
      );
      return withServerTiming(
        upstreamErrorResponse,
        'upstream',
        Date.now() - upstreamStart
      );
    }

    const data = await response.json();
    const payload = jsonResponse(data, 200, {
      'Cache-Control': cacheControl,
      'X-Worker-Cache': 'MISS',
    });

    if (canPopulateCache) {
      await cache.put(cacheKey, payload.clone());
      await writeKvCache(request.url, data, kvNamespace, kvTtlSeconds);
    }
    return withServerTiming(payload, 'upstream', Date.now() - upstreamStart);
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    const upstreamErrorResponse = errorResponse(
      isTimeout ? 504 : 500,
      isTimeout ? 'Upstream request timeout' : 'Internal server error'
    );
    return withServerTiming(
      upstreamErrorResponse,
      'upstream',
      Date.now() - upstreamStart
    );
  }
}

export async function proxyWorlds(
  request: Request,
  runtimeConfig: RuntimeConfig,
  requestId = ''
): Promise<Response> {
  const upstreamStart = Date.now();
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Invalid JSON body');
  }

  try {
    const response = await fetchWithTimeout(
      `${RESONITE_API_BASE}/records/pagedSearch`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(requestId ? { 'X-Request-Id': requestId } : {}),
        },
        body: JSON.stringify(body),
      },
      runtimeConfig.timeoutMs
    );

    if (!response.ok) {
      const upstreamErrorResponse = errorResponse(
        response.status,
        `API returned ${response.status}`
      );
      return withServerTiming(
        upstreamErrorResponse,
        'upstream',
        Date.now() - upstreamStart
      );
    }

    const data = await response.json();
    const payload = jsonResponse(data, 200, {
      'Cache-Control': 'public, max-age=60',
    });
    return withServerTiming(payload, 'upstream', Date.now() - upstreamStart);
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    const upstreamErrorResponse = errorResponse(
      isTimeout ? 504 : 500,
      isTimeout ? 'Upstream request timeout' : 'Internal server error'
    );
    return withServerTiming(
      upstreamErrorResponse,
      'upstream',
      Date.now() - upstreamStart
    );
  }
}
