import { RESONITE_API_BASE, SESSIONS_CACHE_CONTROL } from '../constants.ts';
import type {
  Env,
  RateLimitConfig,
  RateLimitState,
  RuntimeConfig,
} from '../types.ts';
import {
  asHeadResponse,
  isGetLikeMethod,
  methodNotAllowed,
  attachRateLimitHeaders,
} from '../lib/response.ts';
import { proxyGet } from '../lib/proxy.ts';
import { withCors } from '../middleware/cors.ts';

export async function handleSessions(
  request: Request,
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

  const response = await proxyGet(
    request,
    `${RESONITE_API_BASE}/sessions?minActiveUsers=1&includeEmptyHeadless=false`,
    SESSIONS_CACHE_CONTROL,
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
