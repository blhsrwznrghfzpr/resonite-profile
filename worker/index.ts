import type { Env } from './types.ts';
import { getRuntimeConfig } from './lib/config.ts';
import {
  withRequestId,
  errorResponse,
  jsonResponse,
  asHeadResponse,
  isGetLikeMethod,
  methodNotAllowed,
  attachRateLimitHeaders,
} from './lib/response.ts';
import { isOriginAllowed, withCors, optionsResponse } from './middleware/cors.ts';
import { getRateLimitConfig, checkRateLimit } from './middleware/rateLimit.ts';
import { handleHealth } from './routes/health.ts';
import { handleUsers, handleUserDetail } from './routes/users.ts';
import { handleSessions } from './routes/sessions.ts';
import { handleWorlds } from './routes/worlds.ts';
import { buildUserPage } from './routes/ogp.ts';

function createRequestId(): string {
  return crypto.randomUUID();
}

async function handleApi(
  request: Request,
  pathname: string,
  searchParams: URLSearchParams,
  env: Env,
  requestId: string
): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return optionsResponse(request, env, requestId);
  }

  if (!isOriginAllowed(request, env)) {
    return asHeadResponse(
      withCors(
        errorResponse(403, 'Origin not allowed'),
        request,
        env,
        requestId
      ),
      request.method
    );
  }

  // /api/health is exempt from rate limiting
  if (pathname === '/api/health') {
    if (!isGetLikeMethod(request.method)) {
      return withCors(
        methodNotAllowed(['GET', 'HEAD']),
        request,
        env,
        requestId
      );
    }
    return asHeadResponse(
      withCors(handleHealth(), request, env, requestId),
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
    return handleUsers(
      request,
      searchParams,
      env,
      rateState,
      rateLimitConfig,
      runtimeConfig,
      requestId
    );
  }

  if (pathname.startsWith('/api/users/')) {
    const userId = pathname.replace('/api/users/', '');
    return handleUserDetail(
      request,
      userId,
      env,
      rateState,
      rateLimitConfig,
      runtimeConfig,
      requestId
    );
  }

  if (pathname === '/api/sessions') {
    return handleSessions(
      request,
      env,
      rateState,
      rateLimitConfig,
      runtimeConfig,
      requestId
    );
  }

  if (pathname === '/api/worlds') {
    return handleWorlds(
      request,
      env,
      rateState,
      rateLimitConfig,
      runtimeConfig,
      requestId
    );
  }

  return asHeadResponse(
    withCors(
      attachRateLimitHeaders(
        errorResponse(404, 'Not Found'),
        rateState,
        rateLimitConfig
      ),
      request,
      env,
      requestId
    ),
    request.method
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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
