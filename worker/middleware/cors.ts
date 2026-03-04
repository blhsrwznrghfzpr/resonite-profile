import type { Env } from '../types.ts';

export function parseAllowedOrigins(env: Env): string | string[] {
  const configured = env.CORS_ALLOW_ORIGIN || '*';
  if (configured.trim() === '*') return '*';

  return configured
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

export function isOriginAllowed(request: Request, env: Env): boolean {
  const requestOrigin = request.headers.get('Origin');
  if (!requestOrigin) return true;

  const allowedOrigins = parseAllowedOrigins(env);
  if (allowedOrigins === '*') return true;

  return (allowedOrigins as string[]).includes(requestOrigin);
}

export function resolveAllowedOrigin(request: Request, env: Env): string {
  const requestOrigin = request.headers.get('Origin');
  const allowedOrigins = parseAllowedOrigins(env);

  if (!requestOrigin) {
    return allowedOrigins === '*' ? '*' : 'null';
  }

  if (allowedOrigins === '*') return '*';

  if ((allowedOrigins as string[]).includes(requestOrigin)) {
    return requestOrigin;
  }

  return 'null';
}

export function withCors(
  response: Response,
  request: Request,
  env: Env,
  requestId?: string
): Response {
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

  return new Response(response.body, { status: response.status, headers });
}

export function optionsResponse(
  request: Request,
  env: Env,
  requestId: string
): Response {
  const status = isOriginAllowed(request, env) ? 204 : 403;

  return withCors(
    new Response(null, {
      status,
      headers: { 'Access-Control-Max-Age': '86400' },
    }),
    request,
    env,
    requestId
  );
}
