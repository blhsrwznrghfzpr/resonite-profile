import {
  DEFAULT_API_TIMEOUT_MS,
  DEFAULT_GET_RETRY_COUNT,
  DEFAULT_SEARCH_CACHE_TTL_SECONDS,
} from '../constants.ts';
import type { Env, RuntimeConfig } from '../types.ts';

export function getRuntimeConfig(env: Env): RuntimeConfig {
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
