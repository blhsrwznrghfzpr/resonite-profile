import type { RateLimitConfig, RateLimitState } from '../types.ts';

export function jsonResponse(
  payload: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
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

export function errorResponse(status: number, message: string): Response {
  return jsonResponse({ error: message }, status, {
    'Cache-Control': 'no-store',
  });
}

export function isGetLikeMethod(method: string): boolean {
  return method === 'GET' || method === 'HEAD';
}

export function asHeadResponse(response: Response, method: string): Response {
  if (method !== 'HEAD') return response;
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}

export function methodNotAllowed(allowedMethods: string[]): Response {
  return jsonResponse({ error: 'Method not allowed' }, 405, {
    Allow: allowedMethods.join(', '),
    'Cache-Control': 'no-store',
  });
}

export function withRequestId(response: Response, requestId: string): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Request-Id', requestId);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  return new Response(response.body, { status: response.status, headers });
}

export function withServerTiming(
  response: Response,
  metricName: string,
  durationMs: number
): Response {
  const headers = new Headers(response.headers);
  const safeDuration = Number.isFinite(durationMs)
    ? Math.max(0, Math.round(durationMs))
    : 0;
  headers.append('Server-Timing', `${metricName};dur=${safeDuration}`);
  return new Response(response.body, { status: response.status, headers });
}

export function withCacheHeaders(
  response: Response,
  cacheControl: string,
  cacheStatus: string
): Response {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', cacheControl);
  headers.set('X-Worker-Cache', cacheStatus);
  return new Response(response.body, { status: response.status, headers });
}

export function attachRateLimitHeaders(
  response: Response,
  rateState: RateLimitState,
  config: RateLimitConfig
): Response {
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
  return new Response(response.body, { status: response.status, headers });
}
