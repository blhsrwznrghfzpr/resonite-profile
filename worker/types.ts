export interface Env {
  CORS_ALLOW_ORIGIN?: string;
  API_TIMEOUT_MS?: string;
  GET_RETRY_COUNT?: string;
  SEARCH_CACHE_TTL_SECONDS?: string;
  RATE_LIMIT_WINDOW_MS?: string;
  RATE_LIMIT_MAX_REQUESTS?: string;
  RATE_LIMIT_MAX_TRACKED_IPS?: string;
  SEARCH_CACHE?: KVNamespace;
  ASSETS: Fetcher;
}

export interface RuntimeConfig {
  timeoutMs: number;
  getRetryCount: number;
  searchCacheTtlSeconds: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  maxTrackedIps: number;
}

export interface RateLimitState {
  ok: boolean;
  remaining: number;
  resetAt: number;
}
