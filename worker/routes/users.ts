import {
  RESONITE_API_BASE,
  USER_SEARCH_CACHE_CONTROL,
  USER_DETAIL_CACHE_CONTROL,
} from '../constants.ts';
import type {
  Env,
  RateLimitConfig,
  RateLimitState,
  RuntimeConfig,
} from '../types.ts';
import {
  errorResponse,
  asHeadResponse,
  isGetLikeMethod,
  methodNotAllowed,
  attachRateLimitHeaders,
} from '../lib/response.ts';
import { proxyGet } from '../lib/proxy.ts';
import { withCors } from '../middleware/cors.ts';

export async function handleUsers(
  request: Request,
  searchParams: URLSearchParams,
  env: Env,
  rateState: RateLimitState,
  rateLimitConfig: RateLimitConfig,
  runtimeConfig: RuntimeConfig,
  requestId: string
): Promise<Response> {
  if (!isGetLikeMethod(request.method)) {
    return asHeadResponse(
      withCors(methodNotAllowed(['GET', 'HEAD']), request, env, requestId),
      request.method
    );
  }

  const name = searchParams.get('name');
  if (!name) {
    return asHeadResponse(
      withCors(
        errorResponse(400, 'Name parameter is required'),
        request,
        env,
        requestId
      ),
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
    withCors(
      attachRateLimitHeaders(response, rateState, rateLimitConfig),
      request,
      env,
      requestId
    ),
    request.method
  );
}

export async function handleUserDetail(
  request: Request,
  userId: string,
  env: Env,
  rateState: RateLimitState,
  rateLimitConfig: RateLimitConfig,
  runtimeConfig: RuntimeConfig,
  requestId: string
): Promise<Response> {
  if (!isGetLikeMethod(request.method)) {
    return asHeadResponse(
      withCors(methodNotAllowed(['GET', 'HEAD']), request, env, requestId),
      request.method
    );
  }

  if (!userId) {
    return asHeadResponse(
      withCors(
        errorResponse(400, 'User ID is required'),
        request,
        env,
        requestId
      ),
      request.method
    );
  }

  const mintedColorsPathSuffix = '/mintedcolors';
  const isMintedColorsRequest = userId.endsWith(mintedColorsPathSuffix);
  const baseUserId = isMintedColorsRequest
    ? userId.slice(0, -mintedColorsPathSuffix.length)
    : userId;

  if (!baseUserId) {
    return asHeadResponse(
      withCors(
        errorResponse(400, 'User ID is required'),
        request,
        env,
        requestId
      ),
      request.method
    );
  }

  const upstreamPath = isMintedColorsRequest
    ? `/users/${encodeURIComponent(baseUserId)}/mintedcolors`
    : `/users/${encodeURIComponent(baseUserId)}`;

  const response = await proxyGet(
    request,
    `${RESONITE_API_BASE}${upstreamPath}`,
    USER_DETAIL_CACHE_CONTROL,
    runtimeConfig,
    { requestId }
  );

  return asHeadResponse(
    withCors(
      attachRateLimitHeaders(response, rateState, rateLimitConfig),
      request,
      env,
      requestId
    ),
    request.method
  );
}
