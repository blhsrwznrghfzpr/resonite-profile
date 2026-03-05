import { Hono } from 'hono';
import type {
  Env,
  RateLimitState,
  RateLimitConfig,
  RuntimeConfig,
} from './types.ts';
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
import {
  isOriginAllowed,
  withCors,
  optionsResponse,
} from './middleware/cors.ts';
import { getRateLimitConfig, checkRateLimit } from './middleware/rateLimit.ts';
import { handleHealth } from './routes/health.ts';
import { handleUsers, handleUserDetail } from './routes/users.ts';
import { handleSessions } from './routes/sessions.ts';
import { handleWorlds } from './routes/worlds.ts';
import { buildUserPage } from './routes/ogp.ts';

type Variables = {
  requestId: string;
  rateState: RateLimitState;
  rateLimitConfig: RateLimitConfig;
  runtimeConfig: RuntimeConfig;
};

type HonoEnv = {
  Bindings: Env;
  Variables: Variables;
};

const app = new Hono<HonoEnv>();

// ─── Global: generate X-Request-Id for every request ─────────────────────────
app.use('*', async (c, next) => {
  c.set('requestId', crypto.randomUUID());
  await next();
});

// ─── /api/*: OPTIONS preflight ────────────────────────────────────────────────
// Handled before CORS middleware because optionsResponse() manages its own
// origin check internally (returns 204 or 403 based on origin).
app.options('/api/*', c =>
  optionsResponse(c.req.raw, c.env, c.get('requestId'))
);

// ─── /api/*: CORS origin check ────────────────────────────────────────────────
app.use('/api/*', async (c, next) => {
  if (!isOriginAllowed(c.req.raw, c.env)) {
    return asHeadResponse(
      withCors(
        errorResponse(403, 'Origin not allowed'),
        c.req.raw,
        c.env,
        c.get('requestId')
      ),
      c.req.method
    );
  }
  await next();
});

// ─── /api/health (rate-limit exempt) ─────────────────────────────────────────
// Registered before the rate-limit middleware so it terminates the chain
// without ever reaching that middleware.
app.all('/api/health', c => {
  const requestId = c.get('requestId');
  if (!isGetLikeMethod(c.req.method)) {
    return withCors(
      methodNotAllowed(['GET', 'HEAD']),
      c.req.raw,
      c.env,
      requestId
    );
  }
  return asHeadResponse(
    withCors(handleHealth(), c.req.raw, c.env, requestId),
    c.req.method
  );
});

// ─── /api/*: rate limiting ────────────────────────────────────────────────────
// Runs after the health handler, so /api/health is always exempt.
app.use('/api/*', async (c, next) => {
  const rateLimitConfig = getRateLimitConfig(c.env);
  const rateState = checkRateLimit(c.req.raw, rateLimitConfig);

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
        c.req.raw,
        c.env,
        c.get('requestId')
      ),
      c.req.method
    );
  }

  c.set('rateState', rateState);
  c.set('rateLimitConfig', rateLimitConfig);
  c.set('runtimeConfig', getRuntimeConfig(c.env));
  await next();
});

// ─── API routes ───────────────────────────────────────────────────────────────

app.all('/api/users', async c => {
  const searchParams = new URL(c.req.url).searchParams;
  return handleUsers(
    c.req.raw,
    searchParams,
    c.env,
    c.get('rateState'),
    c.get('rateLimitConfig'),
    c.get('runtimeConfig'),
    c.get('requestId')
  );
});

// /api/users/ (trailing slash) and /api/users/:id — both delegate to handleUserDetail.
// handleUserDetail returns 400 when userId is empty, which covers the /api/users/ case.
app.all('/api/users/*', async c => {
  const userId = c.req.path.slice('/api/users/'.length);
  return handleUserDetail(
    c.req.raw,
    userId,
    c.env,
    c.get('rateState'),
    c.get('rateLimitConfig'),
    c.get('runtimeConfig'),
    c.get('requestId')
  );
});

app.all('/api/sessions', async c =>
  handleSessions(
    c.req.raw,
    c.env,
    c.get('rateState'),
    c.get('rateLimitConfig'),
    c.get('runtimeConfig'),
    c.get('requestId')
  )
);

app.all('/api/worlds', async c =>
  handleWorlds(
    c.req.raw,
    c.env,
    c.get('rateState'),
    c.get('rateLimitConfig'),
    c.get('runtimeConfig'),
    c.get('requestId')
  )
);

// Catch-all for unknown /api/* routes: return 404 with rate-limit headers
app.all('/api/*', c => {
  const requestId = c.get('requestId');
  return asHeadResponse(
    withCors(
      attachRateLimitHeaders(
        errorResponse(404, 'Not Found'),
        c.get('rateState'),
        c.get('rateLimitConfig')
      ),
      c.req.raw,
      c.env,
      requestId
    ),
    c.req.method
  );
});

// ─── OGP pages ────────────────────────────────────────────────────────────────

app.get('/:id', async c => {
  const userId = c.req.param('id');
  const requestId = c.get('requestId');
  const response = await buildUserPage(c.req.raw, c.env, userId);
  return withRequestId(response, requestId);
});

// ─── Static assets (Cloudflare Assets binding) ───────────────────────────────

app.all('*', async c => {
  const response = await c.env.ASSETS.fetch(c.req.raw);
  if (response.status === 404) {
    const indexResponse = await c.env.ASSETS.fetch(
      new Request(new URL('/index.html', c.req.url))
    );
    return withRequestId(indexResponse, c.get('requestId'));
  }
  return withRequestId(response, c.get('requestId'));
});

export default app;
