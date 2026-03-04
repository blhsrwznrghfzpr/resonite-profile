const RESONITE_API_BASE = 'https://api.resonite.com';
const DEFAULT_AVATAR_URL =
  'https://assets.resonite.com/9adc7bf85f005413174dbb26c1ef3f62b6ce9e1abbbaf5b504d490b872107373';
const DEFAULT_API_TIMEOUT_MS = 10000;
const DEFAULT_GET_RETRY_COUNT = 1;
const DEFAULT_SEARCH_CACHE_TTL_SECONDS = 60;
const USER_SEARCH_CACHE_CONTROL =
  'public, max-age=60, s-maxage=300, stale-while-revalidate=30, stale-if-error=600';
const USER_DETAIL_CACHE_CONTROL =
  'public, max-age=60, s-maxage=300, stale-while-revalidate=30, stale-if-error=600';
const SESSIONS_CACHE_CONTROL =
  'public, max-age=30, s-maxage=120, stale-while-revalidate=15, stale-if-error=300';
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 120;
const RATE_LIMIT_PRUNE_INTERVAL_MS = 5 * 60_000;
const DEFAULT_RATE_LIMIT_MAX_TRACKED_IPS = 5000;
// NOTE: This rate limiter uses in-memory state (per-isolate).
// Cloudflare Workers may run across multiple isolates, so limits are not
// shared globally. This provides best-effort abuse prevention, not a strict
// global rate limit. For strict global rate limiting, use Durable Objects
// or Cloudflare's Rate Limiting API.
const rateLimitStore = new Map();
let lastRateLimitPruneAt = 0;

function createRequestId() {
  return crypto.randomUUID();
}

function withRequestId(response, requestId) {
  const headers = new Headers(response.headers);
  headers.set('X-Request-Id', requestId);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
      ...extraHeaders,
    },
  });
}

function errorResponse(status, message) {
  return jsonResponse({ error: message }, status, {
    'Cache-Control': 'no-store',
  });
}

function isGetLikeMethod(method) {
  return method === 'GET' || method === 'HEAD';
}

function asHeadResponse(response, method) {
  if (method !== 'HEAD') return response;

  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}

function methodNotAllowed(allowedMethods) {
  return jsonResponse({ error: 'Method not allowed' }, 405, {
    Allow: allowedMethods.join(', '),
    'Cache-Control': 'no-store',
  });
}

function parseAllowedOrigins(env) {
  const configured = env.CORS_ALLOW_ORIGIN || '*';

  if (configured.trim() === '*') return '*';

  return configured
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

function isOriginAllowed(request, env) {
  const requestOrigin = request.headers.get('Origin');
  if (!requestOrigin) return true;

  const allowedOrigins = parseAllowedOrigins(env);
  if (allowedOrigins === '*') return true;

  return allowedOrigins.includes(requestOrigin);
}

function resolveAllowedOrigin(request, env) {
  const requestOrigin = request.headers.get('Origin');
  const allowedOrigins = parseAllowedOrigins(env);

  if (!requestOrigin) {
    return allowedOrigins === '*' ? '*' : 'null';
  }

  if (allowedOrigins === '*') {
    return '*';
  }

  if (allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  return 'null';
}

function withCors(response, request, env, requestId) {
  const headers = new Headers(response.headers);
  headers.set(
    'Access-Control-Allow-Origin',
    resolveAllowedOrigin(request, env)
  );
  headers.set('Access-Control-Allow-Methods', 'GET,HEAD,POST,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set(
    'Access-Control-Expose-Headers',
    'X-Request-Id, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Worker-Cache, Server-Timing'
  );
  const vary = headers.get('Vary');
  if (requestId) {
    headers.set('X-Request-Id', requestId);
  }

  const varyParts = new Set(
    (vary || '')
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)
  );
  varyParts.add('Origin');
  varyParts.add('Access-Control-Request-Method');
  varyParts.add('Access-Control-Request-Headers');
  headers.set('Vary', Array.from(varyParts).join(', '));

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

function optionsResponse(request, env, requestId) {
  const status = isOriginAllowed(request, env) ? 204 : 403;

  return withCors(
    new Response(null, {
      status,
      headers: {
        'Access-Control-Max-Age': '86400',
      },
    }),
    request,
    env,
    requestId
  );
}

function convertIconUrl(iconUrl) {
  if (!iconUrl) return DEFAULT_AVATAR_URL;

  if (iconUrl.startsWith('resdb:///')) {
    const filename = iconUrl.replace('resdb:///', '');
    const filenameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    return `https://assets.resonite.com/${filenameWithoutExt}`;
  }

  return iconUrl;
}

function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

function getRateLimitConfig(env) {
  const windowMs = Number.parseInt(env.RATE_LIMIT_WINDOW_MS || '', 10);
  const maxRequests = Number.parseInt(env.RATE_LIMIT_MAX_REQUESTS || '', 10);
  const maxTrackedIps = Number.parseInt(
    env.RATE_LIMIT_MAX_TRACKED_IPS || '',
    10
  );

  return {
    windowMs:
      Number.isFinite(windowMs) && windowMs > 0
        ? windowMs
        : DEFAULT_RATE_LIMIT_WINDOW_MS,
    maxRequests:
      Number.isFinite(maxRequests) && maxRequests > 0
        ? maxRequests
        : DEFAULT_RATE_LIMIT_MAX_REQUESTS,
    maxTrackedIps:
      Number.isFinite(maxTrackedIps) && maxTrackedIps > 0
        ? maxTrackedIps
        : DEFAULT_RATE_LIMIT_MAX_TRACKED_IPS,
  };
}

function enforceRateLimitStoreBound(ip, config) {
  if (rateLimitStore.has(ip) || rateLimitStore.size < config.maxTrackedIps) {
    return;
  }

  const oldestIp = rateLimitStore.keys().next().value;
  if (oldestIp) {
    rateLimitStore.delete(oldestIp);
  }
}

function checkRateLimit(request, config) {
  const now = Date.now();
  pruneRateLimitStore(now);
  const ip = getClientIp(request);

  enforceRateLimitStoreBound(ip, config);
  const current = rateLimitStore.get(ip);
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return {
      ok: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  if (current.count >= config.maxRequests) {
    return { ok: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  rateLimitStore.set(ip, current);
  return {
    ok: true,
    remaining: config.maxRequests - current.count,
    resetAt: current.resetAt,
  };
}

function pruneRateLimitStore(now) {
  if (now - lastRateLimitPruneAt < RATE_LIMIT_PRUNE_INTERVAL_MS) {
    return;
  }

  for (const [ip, state] of rateLimitStore.entries()) {
    if (state.resetAt <= now) {
      rateLimitStore.delete(ip);
    }
  }

  lastRateLimitPruneAt = now;
}

function attachRateLimitHeaders(response, rateState, config) {
  const headers = new Headers(response.headers);
  headers.set('X-RateLimit-Limit', String(config.maxRequests));
  headers.set(
    'X-RateLimit-Remaining',
    String(Math.max(rateState.remaining, 0))
  );
  headers.set(
    'X-RateLimit-Reset',
    String(Math.floor(rateState.resetAt / 1000))
  );

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

function withServerTiming(response, metricName, durationMs) {
  const headers = new Headers(response.headers);
  const safeDuration = Number.isFinite(durationMs)
    ? Math.max(0, Math.round(durationMs))
    : 0;
  headers.append('Server-Timing', `${metricName};dur=${safeDuration}`);

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

function withCacheHeaders(response, cacheControl, cacheStatus) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', cacheControl);
  headers.set('X-Worker-Cache', cacheStatus);

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

function getRuntimeConfig(env) {
  const timeoutMs = Number.parseInt(env.API_TIMEOUT_MS || '', 10);
  const getRetryCount = Number.parseInt(env.GET_RETRY_COUNT || '', 10);
  const searchCacheTtlSeconds = Number.parseInt(
    env.SEARCH_CACHE_TTL_SECONDS || '',
    10
  );

  return {
    timeoutMs:
      Number.isFinite(timeoutMs) && timeoutMs > 0
        ? timeoutMs
        : DEFAULT_API_TIMEOUT_MS,
    getRetryCount:
      Number.isFinite(getRetryCount) && getRetryCount >= 0
        ? getRetryCount
        : DEFAULT_GET_RETRY_COUNT,
    searchCacheTtlSeconds:
      Number.isFinite(searchCacheTtlSeconds) && searchCacheTtlSeconds > 0
        ? searchCacheTtlSeconds
        : DEFAULT_SEARCH_CACHE_TTL_SECONDS,
  };
}

function canUseKvCache(kvNamespace) {
  return (
    kvNamespace &&
    typeof kvNamespace.get === 'function' &&
    typeof kvNamespace.put === 'function'
  );
}

function buildKvCacheKey(requestUrl) {
  return `search-cache:${requestUrl}`;
}

async function readKvCache(requestUrl, kvNamespace) {
  if (!canUseKvCache(kvNamespace)) return null;

  try {
    const value = await kvNamespace.get(buildKvCacheKey(requestUrl));
    if (!value) return null;

    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function writeKvCache(requestUrl, payload, kvNamespace, ttlSeconds) {
  if (!canUseKvCache(kvNamespace)) return;

  try {
    await kvNamespace.put(
      buildKvCacheKey(requestUrl),
      JSON.stringify(payload),
      {
        expirationTtl: ttlSeconds,
      }
    );
  } catch {
    // cache write failure should not break API response
  }
}

async function fetchWithTimeout(
  url,
  init = {},
  timeoutMs = DEFAULT_API_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithRetry(url, init = {}, retries, timeoutMs) {
  let lastError;

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

async function proxyGet(
  request,
  upstreamUrl,
  cacheControl,
  runtimeConfig,
  options = {}
) {
  const {
    kvNamespace = null,
    kvTtlSeconds = runtimeConfig.searchCacheTtlSeconds,
    requestId = '',
  } = options;
  const cache = caches.default;
  const canPopulateCache = request.method !== 'HEAD';
  const cacheKey = new Request(request.url, {
    method: 'GET',
  });

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
      {
        headers: requestId ? { 'X-Request-Id': requestId } : undefined,
      },
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

async function proxyWorlds(request, runtimeConfig, requestId = '') {
  const upstreamStart = Date.now();
  let body;
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

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function buildUserPage(request, env, userId) {
  const indexResponse = await env.ASSETS.fetch(
    new Request(new URL('/', request.url))
  );

  if (!indexResponse.ok) {
    return indexResponse;
  }

  let html = await indexResponse.text();

  try {
    const userResponse = await fetchWithTimeout(
      `${RESONITE_API_BASE}/users/${encodeURIComponent(userId)}`
    );

    if (userResponse.ok) {
      const userData = await userResponse.json();
      const username = userData.username || 'Unknown User';
      const avatarUrl = convertIconUrl(userData.profile?.iconUrl);
      const registrationDate = new Date(
        userData.registrationDate
      ).toLocaleDateString('ja-JP');
      const description = `${username} • ${registrationDate}登録`;
      const host = new URL(request.url).host;

      const ogpTags = `
    <meta property="og:title" content="${escapeHtml(username)} - Resonite Profile" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(avatarUrl)}" />
    <meta property="og:url" content="https://${escapeHtml(host)}/user/${escapeHtml(userId)}" />
    <meta property="og:type" content="profile" />
    <meta property="og:site_name" content="Resonite ユーザー検索" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(username)} - Resonite Profile" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(avatarUrl)}" />
    <title>${escapeHtml(username)} - Resonite Profile</title>`;

      html = html.replace('<title>Resonite ユーザー検索</title>', ogpTags);
    }
  } catch {
    // OGP generation failure should fall back to plain index.html
  }

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

async function handleApi(request, pathname, searchParams, env, requestId) {
  if (request.method === 'OPTIONS') {
    return optionsResponse(request, env, requestId);
  }

  if (!isOriginAllowed(request, env)) {
    return asHeadResponse(
      withCors(errorResponse(403, 'Origin not allowed'), request, env, requestId),
      request.method
    );
  }

  // /api/health is exempt from rate limiting
  if (pathname === '/api/health') {
    if (!isGetLikeMethod(request.method)) {
      return withCors(methodNotAllowed(['GET', 'HEAD']), request, env, requestId);
    }
    return asHeadResponse(
      withCors(
        jsonResponse(
          { status: 'ok', service: 'resonite-profile-worker', now: new Date().toISOString() },
          200,
          { 'Cache-Control': 'no-store' }
        ),
        request,
        env,
        requestId
      ),
      request.method
    );
  }

  const runtimeConfig = getRuntimeConfig(env);
  const rateLimitConfig = getRateLimitConfig(env);
  const rateState = checkRateLimit(request, rateLimitConfig);
  if (!rateState.ok) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((rateState.resetAt - Date.now()) / 1000)
    );
    return asHeadResponse(
      withCors(
        jsonResponse({ error: 'Too many requests' }, 429, {
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': String(rateLimitConfig.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(rateState.resetAt / 1000)),
        }),
        request,
        env,
        requestId
      ),
      request.method
    );
  }

  if (pathname === '/api/users') {
    if (!isGetLikeMethod(request.method)) {
      return asHeadResponse(
        withCors(methodNotAllowed(['GET', 'HEAD']), request, env, requestId),
        request.method
      );
    }
    const name = searchParams.get('name');
    if (!name) {
      return asHeadResponse(
        withCors(errorResponse(400, 'Name parameter is required'), request, env, requestId),
        request.method
      );
    }
    const response = await proxyGet(
      request,
      `${RESONITE_API_BASE}/users/?name=${encodeURIComponent(name)}`,
      USER_SEARCH_CACHE_CONTROL,
      runtimeConfig,
      { kvNamespace: env.SEARCH_CACHE, requestId }
    );
    return asHeadResponse(
      withCors(attachRateLimitHeaders(response, rateState, rateLimitConfig), request, env, requestId),
      request.method
    );
  }

  if (pathname.startsWith('/api/users/')) {
    if (!isGetLikeMethod(request.method)) {
      return asHeadResponse(
        withCors(methodNotAllowed(['GET', 'HEAD']), request, env, requestId),
        request.method
      );
    }
    const userId = pathname.replace('/api/users/', '');
    if (!userId) {
      return asHeadResponse(
        withCors(errorResponse(400, 'User ID is required'), request, env, requestId),
        request.method
      );
    }
    const response = await proxyGet(
      request,
      `${RESONITE_API_BASE}/users/${encodeURIComponent(userId)}`,
      USER_DETAIL_CACHE_CONTROL,
      runtimeConfig,
      { requestId }
    );
    return asHeadResponse(
      withCors(attachRateLimitHeaders(response, rateState, rateLimitConfig), request, env, requestId),
      request.method
    );
  }

  if (pathname === '/api/sessions') {
    if (!isGetLikeMethod(request.method)) {
      return asHeadResponse(
        withCors(methodNotAllowed(['GET', 'HEAD']), request, env, requestId),
        request.method
      );
    }
    const response = await proxyGet(
      request,
      `${RESONITE_API_BASE}/sessions?minActiveUsers=1&includeEmptyHeadless=false`,
      SESSIONS_CACHE_CONTROL,
      runtimeConfig,
      { requestId }
    );
    return asHeadResponse(
      withCors(attachRateLimitHeaders(response, rateState, rateLimitConfig), request, env, requestId),
      request.method
    );
  }

  if (pathname === '/api/worlds') {
    if (request.method !== 'POST') {
      return asHeadResponse(
        withCors(methodNotAllowed(['POST']), request, env, requestId),
        request.method
      );
    }
    const response = await proxyWorlds(request, runtimeConfig, requestId);
    return withCors(
      attachRateLimitHeaders(response, rateState, rateLimitConfig),
      request,
      env,
      requestId
    );
  }

  return asHeadResponse(
    withCors(
      attachRateLimitHeaders(errorResponse(404, 'Not Found'), rateState, rateLimitConfig),
      request,
      env,
      requestId
    ),
    request.method
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;
    const requestId = createRequestId();

    if (pathname.startsWith('/api/')) {
      return handleApi(request, pathname, searchParams, env, requestId);
    }

    if (pathname.startsWith('/user/')) {
      const userId = pathname.replace('/user/', '');
      if (userId) {
        const response = await buildUserPage(request, env, userId);
        return withRequestId(response, requestId);
      }
    }

    const response = await env.ASSETS.fetch(request);
    return withRequestId(response, requestId);
  },
};
