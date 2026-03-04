import {
  DEFAULT_RATE_LIMIT_WINDOW_MS,
  DEFAULT_RATE_LIMIT_MAX_REQUESTS,
  DEFAULT_RATE_LIMIT_MAX_TRACKED_IPS,
  RATE_LIMIT_PRUNE_INTERVAL_MS,
} from '../constants.ts';
import type { Env, RateLimitConfig, RateLimitState } from '../types.ts';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// NOTE: This rate limiter uses in-memory state (per-isolate).
// Cloudflare Workers may run across multiple isolates, so limits are not
// shared globally. This provides best-effort abuse prevention, not a strict
// global rate limit. For strict global rate limiting, use Durable Objects
// or Cloudflare's Rate Limiting API.
const rateLimitStore = new Map<string, RateLimitEntry>();
let lastRateLimitPruneAt = 0;

function getClientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

export function getRateLimitConfig(env: Env): RateLimitConfig {
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

function pruneRateLimitStore(now: number): void {
  if (now - lastRateLimitPruneAt < RATE_LIMIT_PRUNE_INTERVAL_MS) return;

  for (const [ip, state] of rateLimitStore.entries()) {
    if (state.resetAt <= now) {
      rateLimitStore.delete(ip);
    }
  }

  lastRateLimitPruneAt = now;
}

function enforceRateLimitStoreBound(ip: string, config: RateLimitConfig): void {
  if (rateLimitStore.has(ip) || rateLimitStore.size < config.maxTrackedIps) {
    return;
  }

  const oldestIp = rateLimitStore.keys().next().value;
  if (oldestIp) {
    rateLimitStore.delete(oldestIp);
  }
}

export function checkRateLimit(
  request: Request,
  config: RateLimitConfig
): RateLimitState {
  const now = Date.now();
  pruneRateLimitStore(now);
  const ip = getClientIp(request);

  enforceRateLimitStoreBound(ip, config);
  const current = rateLimitStore.get(ip);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + config.windowMs });
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
