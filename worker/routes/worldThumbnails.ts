import type { RuntimeConfig } from '../types.ts';
import {
  asHeadResponse,
  errorResponse,
  isGetLikeMethod,
  methodNotAllowed,
} from '../lib/response.ts';

export const MAX_THUMBNAIL_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  'image/webp',
  'image/png',
  'image/jpeg',
  'image/avif',
]);

/** Same-origin readback for public Resonite images; never an arbitrary URL proxy. */
export async function handleWorldThumbnail(
  request: Request,
  hash: string,
  config: RuntimeConfig
): Promise<Response> {
  if (!isGetLikeMethod(request.method)) {
    return methodNotAllowed(['GET', 'HEAD']);
  }
  if (!/^[a-f0-9]{64}$/.test(hash)) {
    return asHeadResponse(
      errorResponse(400, 'Invalid asset hash'),
      request.method
    );
  }

  const cacheUrl = new URL(request.url);
  cacheUrl.search = '';
  const cacheKey = new Request(cacheUrl, { method: 'GET' });
  const cached = await caches.default.match(cacheKey);
  if (cached) return asHeadResponse(cached, request.method);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(`https://assets.resonite.com/${hash}`, {
      method: request.method,
      redirect: 'error',
      signal: controller.signal,
      // Do not forward cookies, authorization, Origin, or user-supplied headers.
    });
    if (!response.ok) {
      return asHeadResponse(
        errorResponse(response.status === 404 ? 404 : 502, 'Image unavailable'),
        request.method
      );
    }
    const contentType = response.headers
      .get('Content-Type')
      ?.split(';')[0]
      .trim();
    if (!contentType || !IMAGE_TYPES.has(contentType)) {
      await response.body?.cancel();
      return asHeadResponse(
        errorResponse(502, 'Unsupported image type'),
        request.method
      );
    }
    if (Number(response.headers.get('Content-Length')) > MAX_THUMBNAIL_BYTES) {
      await response.body?.cancel();
      return asHeadResponse(
        errorResponse(502, 'Image too large'),
        request.method
      );
    }

    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': response.headers.get('Cache-Control') ?? 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    // Keep the asset host's cache policy and validators, including Age so a
    // cached upstream response does not receive a fresh lifetime here.
    for (const name of ['Age', 'ETag', 'Last-Modified', 'Expires']) {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    }
    if (request.method === 'HEAD') return new Response(null, { headers });

    const chunks: Uint8Array[] = [];
    let length = 0;
    const reader = response.body?.getReader();
    if (!reader) return errorResponse(502, 'Empty image');
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_THUMBNAIL_BYTES) {
        await reader.cancel();
        return errorResponse(502, 'Image too large');
      }
      chunks.push(value);
    }
    if (length === 0) return errorResponse(502, 'Empty image');
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    headers.set('Content-Length', String(length));
    const result = new Response(bytes, { headers });
    // Cache failures must not hide an otherwise usable image.
    try {
      const policy = headers.get('Cache-Control') ?? '';
      if (!/(?:no-store|private|no-cache)/i.test(policy)) {
        await caches.default.put(cacheKey, result.clone());
      }
    } catch {
      // A subsequent request can still use the browser cache or fetch again.
    }
    return result;
  } catch {
    return asHeadResponse(
      errorResponse(
        controller.signal.aborted ? 504 : 502,
        'Image fetch failed'
      ),
      request.method
    );
  } finally {
    clearTimeout(timeout);
  }
}
