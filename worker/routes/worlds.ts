import type { Env, RateLimitConfig, RateLimitState, RuntimeConfig } from '../types.ts';
import {
  asHeadResponse,
  methodNotAllowed,
  attachRateLimitHeaders,
} from '../lib/response.ts';
import { proxyWorlds } from '../lib/proxy.ts';
import { withCors } from '../middleware/cors.ts';

export async function handleWorlds(
  request: Request,
  env: Env,
  rateState: RateLimitState,
  rateLimitConfig: RateLimitConfig,
  runtimeConfig: RuntimeConfig,
  requestId: string
): Promise<Response> {
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
