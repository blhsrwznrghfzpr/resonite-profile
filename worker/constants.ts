export const RESONITE_API_BASE = 'https://api.resonite.com';
export const DEFAULT_AVATAR_URL =
  'https://assets.resonite.com/9adc7bf85f005413174dbb26c1ef3f62b6ce9e1abbbaf5b504d490b872107373';
export const DEFAULT_API_TIMEOUT_MS = 10000;
export const DEFAULT_GET_RETRY_COUNT = 1;
export const DEFAULT_SEARCH_CACHE_TTL_SECONDS = 60;
export const USER_SEARCH_CACHE_CONTROL =
  'public, max-age=60, s-maxage=300, stale-while-revalidate=30, stale-if-error=600';
export const USER_DETAIL_CACHE_CONTROL =
  'public, max-age=60, s-maxage=300, stale-while-revalidate=30, stale-if-error=600';
export const SESSIONS_CACHE_CONTROL =
  'public, max-age=30, s-maxage=120, stale-while-revalidate=15, stale-if-error=300';
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
export const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 120;
export const RATE_LIMIT_PRUNE_INTERVAL_MS = 5 * 60_000;
export const DEFAULT_RATE_LIMIT_MAX_TRACKED_IPS = 5000;
