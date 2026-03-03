import test from 'node:test';
import assert from 'node:assert/strict';

import worker from '../worker.js';

function createEnv(overrides = {}) {
  return {
    CORS_ALLOW_ORIGIN: 'https://allowed.example',
    ASSETS: {
      async fetch() {
        return new Response(
          '<html><head><title>Resonite ユーザー検索</title></head></html>',
          {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
            },
          }
        );
      },
    },
    ...overrides,
  };
}

function installWorkerGlobals({ fetchImpl } = {}) {
  globalThis.caches = {
    default: {
      async match() {
        return undefined;
      },
      async put() {
        return undefined;
      },
    },
  };

  globalThis.fetch =
    fetchImpl ||
    (async () => {
      throw new Error('Unexpected fetch call in test');
    });
}

function createJsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

test('OPTIONS preflight rejects non-allowed origin', async () => {
  installWorkerGlobals();
  const env = createEnv();

  const request = new Request('https://worker.example/api/users?name=a', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://blocked.example',
      'Access-Control-Request-Method': 'GET',
    },
  });

  const response = await worker.fetch(request, env);

  assert.equal(response.status, 403);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'null');
  assert.equal(
    response.headers.get('Access-Control-Allow-Methods'),
    'GET,HEAD,POST,OPTIONS'
  );
});

test('OPTIONS preflight allows configured origin and returns 204', async () => {
  installWorkerGlobals();
  const env = createEnv();

  const request = new Request('https://worker.example/api/users?name=a', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://allowed.example',
      'Access-Control-Request-Method': 'GET',
    },
  });

  const response = await worker.fetch(request, env);

  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get('Access-Control-Allow-Origin'),
    'https://allowed.example'
  );
  assert.equal(response.headers.get('Access-Control-Max-Age'), '86400');
  assert.match(
    response.headers.get('Vary') || '',
    /Origin, Access-Control-Request-Method, Access-Control-Request-Headers/
  );
});

test('HEAD /api/health returns no body and no-store', async () => {
  installWorkerGlobals();
  const env = createEnv();

  const request = new Request('https://worker.example/api/health', {
    method: 'HEAD',
    headers: {
      Origin: 'https://allowed.example',
    },
  });

  const response = await worker.fetch(request, env);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(body, '');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.ok(response.headers.get('X-Request-Id'));
});

test('HEAD /api/health rejects disallowed origin with bodyless 403', async () => {
  installWorkerGlobals();

  const env = createEnv();
  const response = await worker.fetch(
    new Request('https://worker.example/api/health', {
      method: 'HEAD',
      headers: {
        Origin: 'https://blocked.example',
      },
    }),
    env
  );

  assert.equal(response.status, 403);
  assert.equal(await response.text(), '');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'null');
});

test('HEAD /api/users returns bodyless 429 when rate limit is exceeded', async () => {
  let fetchCalls = 0;
  installWorkerGlobals({
    fetchImpl: async () => {
      fetchCalls += 1;
      return createJsonResponse([
        {
          id: 'U-HEAD-LIMIT',
          username: 'head-limit',
        },
      ]);
    },
  });

  const env = createEnv({
    RATE_LIMIT_MAX_REQUESTS: '1',
    RATE_LIMIT_WINDOW_MS: '60000',
  });

  const headers = {
    Origin: 'https://allowed.example',
    'CF-Connecting-IP': '198.51.100.120',
  };

  const first = await worker.fetch(
    new Request('https://worker.example/api/users?name=head-limit-1', {
      method: 'HEAD',
      headers,
    }),
    env
  );
  const second = await worker.fetch(
    new Request('https://worker.example/api/users?name=head-limit-2', {
      method: 'HEAD',
      headers,
    }),
    env
  );

  assert.equal(first.status, 200);
  assert.equal(await first.text(), '');
  assert.equal(second.status, 429);
  assert.equal(await second.text(), '');
  assert.equal(second.headers.get('X-RateLimit-Remaining'), '0');
  assert.ok(second.headers.get('Retry-After'));
  assert.equal(fetchCalls, 1);
});
test('GET /api/health rejects disallowed origin with 403', async () => {
  installWorkerGlobals();

  const env = createEnv();
  const request = new Request('https://worker.example/api/health', {
    method: 'GET',
    headers: {
      Origin: 'https://blocked.example',
    },
  });

  const response = await worker.fetch(request, env);
  const payload = await response.json();

  assert.equal(response.status, 403);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'null');
  assert.equal(payload.error, 'Origin not allowed');
});

test('unsupported method returns 405 and Allow header', async () => {
  installWorkerGlobals();
  const env = createEnv();

  const request = new Request('https://worker.example/api/sessions', {
    method: 'POST',
    headers: {
      Origin: 'https://allowed.example',
    },
  });

  const response = await worker.fetch(request, env);
  const payload = await response.json();

  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'GET, HEAD');
  assert.equal(payload.error, 'Method not allowed');
});

test('GET /api/users returns proxied payload with CORS and rate headers', async () => {
  installWorkerGlobals({
    fetchImpl: async (url, init) => {
      assert.equal(url, 'https://api.resonite.com/users/?name=alice');
      assert.ok(init?.headers);
      assert.ok(init.headers['X-Request-Id']);
      return createJsonResponse([
        {
          id: 'U-alice',
          username: 'alice',
        },
      ]);
    },
  });

  const env = createEnv();

  const request = new Request('https://worker.example/api/users?name=alice', {
    method: 'GET',
    headers: {
      Origin: 'https://allowed.example',
    },
  });

  const response = await worker.fetch(request, env);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get('Access-Control-Allow-Origin'),
    'https://allowed.example'
  );
  assert.equal(response.headers.get('X-Worker-Cache'), 'MISS');
  assert.match(
    response.headers.get('Cache-Control') || '',
    /stale-while-revalidate=30/
  );
  assert.match(
    response.headers.get('Cache-Control') || '',
    /stale-if-error=600/
  );
  assert.ok(response.headers.get('X-RateLimit-Limit'));
  assert.ok(response.headers.get('X-RateLimit-Remaining'));
  assert.ok(response.headers.get('X-RateLimit-Reset'));
  assert.match(
    response.headers.get('Access-Control-Expose-Headers') || '',
    /Server-Timing/
  );
  assert.match(response.headers.get('Server-Timing') || '', /upstream;dur=/);
  assert.equal(payload[0].id, 'U-alice');
});

test('HEAD /api/users returns bodyless response', async () => {
  installWorkerGlobals({
    fetchImpl: async () => createJsonResponse([{ id: 'U-head' }]),
  });

  const env = createEnv();
  const request = new Request('https://worker.example/api/users?name=head', {
    method: 'HEAD',
    headers: {
      Origin: 'https://allowed.example',
    },
  });

  const response = await worker.fetch(request, env);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(body, '');
  assert.equal(
    response.headers.get('Access-Control-Allow-Origin'),
    'https://allowed.example'
  );
});

test('GET /api/users rejects disallowed origin before upstream fetch', async () => {
  let fetchCalled = false;
  installWorkerGlobals({
    fetchImpl: async () => {
      fetchCalled = true;
      return createJsonResponse([]);
    },
  });

  const env = createEnv();
  const request = new Request('https://worker.example/api/users?name=alice', {
    method: 'GET',
    headers: {
      Origin: 'https://blocked.example',
    },
  });

  const response = await worker.fetch(request, env);
  const payload = await response.json();

  assert.equal(response.status, 403);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'null');
  assert.equal(payload.error, 'Origin not allowed');
  assert.equal(fetchCalled, false);
});

test('GET /api/sessions proxies upstream payload and sets cache header', async () => {
  installWorkerGlobals({
    fetchImpl: async (url, init) => {
      assert.equal(
        url,
        'https://api.resonite.com/sessions?minActiveUsers=1&includeEmptyHeadless=false'
      );
      assert.ok(init?.headers);
      assert.ok(init.headers['X-Request-Id']);
      return createJsonResponse([
        {
          sessionId: 'S-1',
          name: 'Test Session',
          sessionUsers: [],
        },
      ]);
    },
  });

  const env = createEnv();
  const request = new Request('https://worker.example/api/sessions', {
    method: 'GET',
    headers: {
      Origin: 'https://allowed.example',
    },
  });

  const response = await worker.fetch(request, env);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Worker-Cache'), 'MISS');
  assert.match(
    response.headers.get('Cache-Control') || '',
    /stale-while-revalidate=15/
  );
  assert.match(
    response.headers.get('Cache-Control') || '',
    /stale-if-error=300/
  );
  assert.equal(
    response.headers.get('Access-Control-Allow-Origin'),
    'https://allowed.example'
  );
  assert.equal(payload[0].sessionId, 'S-1');
});

test('GET /api/sessions returns upstream status payload with Server-Timing on non-ok', async () => {
  installWorkerGlobals({
    fetchImpl: async () =>
      createJsonResponse({ message: 'sessions upstream error' }, 502),
  });

  const env = createEnv();
  const request = new Request('https://worker.example/api/sessions', {
    method: 'GET',
    headers: {
      Origin: 'https://allowed.example',
    },
  });

  const response = await worker.fetch(request, env);
  const payload = await response.json();

  assert.equal(response.status, 502);
  assert.equal(payload.error, 'API returned 502');
  assert.match(response.headers.get('Server-Timing') || '', /upstream;dur=/);
  assert.equal(
    response.headers.get('Access-Control-Allow-Origin'),
    'https://allowed.example'
  );
});

test('HEAD /api/sessions returns bodyless upstream non-ok with Server-Timing', async () => {
  installWorkerGlobals({
    fetchImpl: async () =>
      createJsonResponse({ message: 'sessions upstream error' }, 502),
  });

  const env = createEnv();
  const request = new Request('https://worker.example/api/sessions', {
    method: 'HEAD',
    headers: {
      Origin: 'https://allowed.example',
    },
  });

  const response = await worker.fetch(request, env);

  assert.equal(response.status, 502);
  assert.equal(await response.text(), '');
  assert.match(response.headers.get('Server-Timing') || '', /upstream;dur=/);
  assert.equal(
    response.headers.get('Access-Control-Allow-Origin'),
    'https://allowed.example'
  );
});

test('GET /api/health is excluded from rate limiting', async () => {
  let fetchCalls = 0;
  installWorkerGlobals({
    fetchImpl: async () => {
      fetchCalls += 1;
      return createJsonResponse([{ id: 'U-rate' }]);
    },
  });

  const env = createEnv({
    RATE_LIMIT_MAX_REQUESTS: '1',
    RATE_LIMIT_WINDOW_MS: '60000',
  });

  const healthRequest = new Request('https://worker.example/api/health', {
    method: 'GET',
    headers: {
      Origin: 'https://allowed.example',
      'CF-Connecting-IP': '203.0.113.10',
    },
  });

  const usersRequest = new Request(
    'https://worker.example/api/users?name=rate',
    {
      method: 'GET',
      headers: {
        Origin: 'https://allowed.example',
        'CF-Connecting-IP': '203.0.113.10',
      },
    }
  );

  const health1 = await worker.fetch(healthRequest, env);
  const health2 = await worker.fetch(healthRequest, env);
  const users = await worker.fetch(usersRequest, env);

  assert.equal(health1.status, 200);
  assert.equal(health2.status, 200);
  assert.equal(users.status, 200);
  assert.equal(fetchCalls, 1);
  assert.equal(users.headers.get('X-RateLimit-Remaining'), '0');
});

test('POST /api/worlds returns 400 for invalid JSON body', async () => {
  let fetchCalled = false;
  installWorkerGlobals({
    fetchImpl: async () => {
      fetchCalled = true;
      return createJsonResponse({});
    },
  });

  const env = createEnv();
  const request = new Request('https://worker.example/api/worlds', {
    method: 'POST',
    headers: {
      Origin: 'https://allowed.example',
      'Content-Type': 'application/json',
    },
    body: '{"invalid"',
  });

  const response = await worker.fetch(request, env);
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.error, 'Invalid JSON body');
  assert.equal(fetchCalled, false);
});

test('GET /api/worlds returns 405 with Allow: POST', async () => {
  installWorkerGlobals();

  const env = createEnv();
  const request = new Request('https://worker.example/api/worlds', {
    method: 'GET',
    headers: {
      Origin: 'https://allowed.example',
    },
  });

  const response = await worker.fetch(request, env);
  const payload = await response.json();

  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'POST');
  assert.equal(payload.error, 'Method not allowed');
});

test('GET /api/users returns 429 when rate limit is exceeded', async () => {
  let fetchCalls = 0;
  installWorkerGlobals({
    fetchImpl: async () => {
      fetchCalls += 1;
      return createJsonResponse([{ id: 'U-limited' }]);
    },
  });

  const env = createEnv({
    RATE_LIMIT_MAX_REQUESTS: '1',
    RATE_LIMIT_WINDOW_MS: '60000',
  });

  const headers = {
    Origin: 'https://allowed.example',
    'CF-Connecting-IP': '198.51.100.77',
  };

  const first = await worker.fetch(
    new Request('https://worker.example/api/users?name=limit', {
      method: 'GET',
      headers,
    }),
    env
  );
  const second = await worker.fetch(
    new Request('https://worker.example/api/users?name=limit2', {
      method: 'GET',
      headers,
    }),
    env
  );

  const payload = await second.json();

  assert.equal(first.status, 200);
  assert.equal(second.status, 429);
  assert.equal(payload.error, 'Too many requests');
  assert.equal(second.headers.get('X-RateLimit-Remaining'), '0');
  assert.ok(second.headers.get('Retry-After'));
  assert.equal(fetchCalls, 1);
});

test('GET /api/users without name returns 400 and skips upstream fetch', async () => {
  let fetchCalls = 0;
  installWorkerGlobals({
    fetchImpl: async () => {
      fetchCalls += 1;
      return createJsonResponse([]);
    },
  });

  const env = createEnv();
  const request = new Request('https://worker.example/api/users', {
    method: 'GET',
    headers: {
      Origin: 'https://allowed.example',
    },
  });

  const response = await worker.fetch(request, env);
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.error, 'Name parameter is required');
  assert.equal(fetchCalls, 0);
});

test('GET /api/users returns upstream status payload with Server-Timing on non-ok', async () => {
  installWorkerGlobals({
    fetchImpl: async () =>
      createJsonResponse({ message: 'upstream error' }, 503),
  });

  const env = createEnv();
  const request = new Request('https://worker.example/api/users?name=error', {
    method: 'GET',
    headers: {
      Origin: 'https://allowed.example',
    },
  });

  const response = await worker.fetch(request, env);
  const payload = await response.json();

  assert.equal(response.status, 503);
  assert.equal(payload.error, 'API returned 503');
  assert.match(response.headers.get('Server-Timing') || '', /upstream;dur=/);
});

test('HEAD /api/users returns bodyless upstream non-ok with Server-Timing', async () => {
  installWorkerGlobals({
    fetchImpl: async () =>
      createJsonResponse({ message: 'upstream unavailable' }, 503),
  });

  const env = createEnv();
  const request = new Request(
    'https://worker.example/api/users?name=head-error',
    {
      method: 'HEAD',
      headers: {
        Origin: 'https://allowed.example',
      },
    }
  );

  const response = await worker.fetch(request, env);

  assert.equal(response.status, 503);
  assert.equal(await response.text(), '');
  assert.match(response.headers.get('Server-Timing') || '', /upstream;dur=/);
  assert.equal(
    response.headers.get('Access-Control-Allow-Origin'),
    'https://allowed.example'
  );
});

test('POST /api/health returns 405 with Allow: GET, HEAD', async () => {
  installWorkerGlobals();

  const env = createEnv();
  const request = new Request('https://worker.example/api/health', {
    method: 'POST',
    headers: {
      Origin: 'https://allowed.example',
    },
  });

  const response = await worker.fetch(request, env);
  const payload = await response.json();

  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'GET, HEAD');
  assert.equal(payload.error, 'Method not allowed');
});

test('GET /user/:id injects OGP tags when upstream user is available', async () => {
  installWorkerGlobals({
    fetchImpl: async url => {
      assert.equal(url, 'https://api.resonite.com/users/U-OGP');
      return createJsonResponse({
        username: 'OGP User',
        registrationDate: '2024-01-02T00:00:00.000Z',
        profile: {
          iconUrl: 'resdb:///abc123.png',
        },
      });
    },
  });

  const env = createEnv({
    ASSETS: {
      async fetch() {
        return new Response(
          '<!doctype html><html><head><title>Resonite ユーザー検索</title></head><body>app</body></html>',
          {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
            },
          }
        );
      },
    },
  });

  const request = new Request('https://worker.example/user/U-OGP');
  const response = await worker.fetch(request, env);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.ok(response.headers.get('X-Request-Id'));
  assert.match(
    html,
    /<meta property="og:title" content="OGP User - Resonite Profile"/
  );
  assert.match(
    html,
    /<meta property="og:image" content="https:\/\/assets\.resonite\.com\/abc123"/
  );
  assert.match(html, /<title>OGP User - Resonite Profile<\/title>/);
});

test('GET /user/:id falls back to base index when upstream lookup fails', async () => {
  installWorkerGlobals({
    fetchImpl: async () => {
      throw new Error('upstream unavailable');
    },
  });

  const env = createEnv({
    ASSETS: {
      async fetch() {
        return new Response(
          '<!doctype html><html><head><title>Resonite ユーザー検索</title></head><body>fallback</body></html>',
          {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
            },
          }
        );
      },
    },
  });

  const request = new Request('https://worker.example/user/U-FALLBACK');
  const response = await worker.fetch(request, env);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.match(html, /<title>Resonite ユーザー検索<\/title>/);
  assert.doesNotMatch(html, /og:title/);
});

test('GET /api/users/:id proxies upstream payload', async () => {
  installWorkerGlobals({
    fetchImpl: async (url, init) => {
      assert.equal(url, 'https://api.resonite.com/users/U-DETAIL');
      assert.ok(init?.headers);
      assert.ok(init.headers['X-Request-Id']);
      return createJsonResponse({
        id: 'U-DETAIL',
        username: 'detail-user',
      });
    },
  });

  const env = createEnv();
  const request = new Request('https://worker.example/api/users/U-DETAIL', {
    method: 'GET',
    headers: {
      Origin: 'https://allowed.example',
    },
  });

  const response = await worker.fetch(request, env);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.id, 'U-DETAIL');
  assert.equal(
    response.headers.get('Access-Control-Allow-Origin'),
    'https://allowed.example'
  );
  assert.equal(response.headers.get('X-Worker-Cache'), 'MISS');
});

test('GET /api/users/:id returns upstream status payload with Server-Timing on non-ok', async () => {
  installWorkerGlobals({
    fetchImpl: async () =>
      createJsonResponse({ message: 'user detail upstream error' }, 404),
  });

  const env = createEnv();
  const request = new Request('https://worker.example/api/users/U-MISSING', {
    method: 'GET',
    headers: {
      Origin: 'https://allowed.example',
    },
  });

  const response = await worker.fetch(request, env);
  const payload = await response.json();

  assert.equal(response.status, 404);
  assert.equal(payload.error, 'API returned 404');
  assert.match(response.headers.get('Server-Timing') || '', /upstream;dur=/);
  assert.equal(
    response.headers.get('Access-Control-Allow-Origin'),
    'https://allowed.example'
  );
});

test('HEAD /api/users/:id returns bodyless upstream non-ok with Server-Timing', async () => {
  installWorkerGlobals({
    fetchImpl: async () =>
      createJsonResponse({ message: 'user detail upstream error' }, 404),
  });

  const env = createEnv();
  const request = new Request('https://worker.example/api/users/U-MISSING', {
    method: 'HEAD',
    headers: {
      Origin: 'https://allowed.example',
    },
  });

  const response = await worker.fetch(request, env);

  assert.equal(response.status, 404);
  assert.equal(await response.text(), '');
  assert.match(response.headers.get('Server-Timing') || '', /upstream;dur=/);
  assert.equal(
    response.headers.get('Access-Control-Allow-Origin'),
    'https://allowed.example'
  );
});

test('POST /api/worlds proxies payload and forwards X-Request-Id', async () => {
  installWorkerGlobals({
    fetchImpl: async (url, init) => {
      assert.equal(url, 'https://api.resonite.com/records/pagedSearch');
      assert.equal(init?.method, 'POST');
      assert.equal(init?.headers?.['Content-Type'], 'application/json');
      assert.ok(init?.headers?.['X-Request-Id']);
      assert.deepEqual(JSON.parse(init?.body || '{}'), {
        name: 'TestWorld',
      });
      return createJsonResponse({
        records: [{ id: 'R-1' }],
      });
    },
  });

  const env = createEnv();
  const request = new Request('https://worker.example/api/worlds', {
    method: 'POST',
    headers: {
      Origin: 'https://allowed.example',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'TestWorld' }),
  });

  const response = await worker.fetch(request, env);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('Server-Timing') || '', /upstream;dur=/);
  assert.equal(payload.records[0].id, 'R-1');
  assert.equal(
    response.headers.get('Access-Control-Allow-Origin'),
    'https://allowed.example'
  );
});

test('POST /api/worlds returns upstream status payload with Server-Timing on non-ok', async () => {
  installWorkerGlobals({
    fetchImpl: async () =>
      createJsonResponse({ message: 'upstream error' }, 502),
  });

  const env = createEnv();
  const request = new Request('https://worker.example/api/worlds', {
    method: 'POST',
    headers: {
      Origin: 'https://allowed.example',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'FailWorld' }),
  });

  const response = await worker.fetch(request, env);
  const payload = await response.json();

  assert.equal(response.status, 502);
  assert.equal(payload.error, 'API returned 502');
  assert.match(response.headers.get('Server-Timing') || '', /upstream;dur=/);
});

test('HEAD /api/users/:id returns bodyless response', async () => {
  installWorkerGlobals({
    fetchImpl: async () =>
      createJsonResponse({
        id: 'U-HEAD-DETAIL',
        username: 'head-detail',
      }),
  });

  const env = createEnv();
  const request = new Request(
    'https://worker.example/api/users/U-HEAD-DETAIL',
    {
      method: 'HEAD',
      headers: {
        Origin: 'https://allowed.example',
      },
    }
  );

  const response = await worker.fetch(request, env);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(body, '');
  assert.equal(
    response.headers.get('Access-Control-Allow-Origin'),
    'https://allowed.example'
  );
});

test('HEAD /api/sessions returns bodyless response', async () => {
  installWorkerGlobals({
    fetchImpl: async () =>
      createJsonResponse([
        {
          sessionId: 'S-HEAD',
          name: 'head-session',
          sessionUsers: [],
        },
      ]),
  });

  const env = createEnv();
  const request = new Request('https://worker.example/api/sessions', {
    method: 'HEAD',
    headers: {
      Origin: 'https://allowed.example',
    },
  });

  const response = await worker.fetch(request, env);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(body, '');
  assert.equal(
    response.headers.get('Access-Control-Allow-Origin'),
    'https://allowed.example'
  );
});

test('GET /api/users/ with empty id returns 400 and skips upstream fetch', async () => {
  let fetchCalls = 0;
  installWorkerGlobals({
    fetchImpl: async () => {
      fetchCalls += 1;
      return createJsonResponse({});
    },
  });

  const env = createEnv();
  const request = new Request('https://worker.example/api/users/', {
    method: 'GET',
    headers: {
      Origin: 'https://allowed.example',
    },
  });

  const response = await worker.fetch(request, env);
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.error, 'User ID is required');
  assert.equal(fetchCalls, 0);
});

test('GET /api/users responses include X-Robots-Tag noindex header', async () => {
  installWorkerGlobals({
    fetchImpl: async () =>
      createJsonResponse([
        {
          id: 'U-ROBOTS',
          username: 'robots-user',
        },
      ]),
  });

  const env = createEnv();
  const request = new Request('https://worker.example/api/users?name=robots', {
    method: 'GET',
    headers: {
      Origin: 'https://allowed.example',
    },
  });

  const response = await worker.fetch(request, env);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
});

test('unknown /api path returns 404 with rate-limit headers', async () => {
  installWorkerGlobals();

  const env = createEnv();
  const request = new Request('https://worker.example/api/unknown', {
    method: 'GET',
    headers: {
      Origin: 'https://allowed.example',
      'CF-Connecting-IP': '198.51.100.90',
    },
  });

  const response = await worker.fetch(request, env);
  const payload = await response.json();

  assert.equal(response.status, 404);
  assert.equal(payload.error, 'Not Found');
  assert.ok(response.headers.get('X-RateLimit-Limit'));
  assert.ok(response.headers.get('X-RateLimit-Remaining'));
  assert.ok(response.headers.get('X-RateLimit-Reset'));
});

test('non-api asset responses include X-Request-Id header', async () => {
  installWorkerGlobals();

  const env = createEnv({
    ASSETS: {
      async fetch(request) {
        if (new URL(request.url).pathname === '/favicon.ico') {
          return new Response('icon', {
            status: 200,
            headers: {
              'Content-Type': 'image/x-icon',
            },
          });
        }

        return new Response('not-found', { status: 404 });
      },
    },
  });

  const response = await worker.fetch(
    new Request('https://worker.example/favicon.ico'),
    env
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'icon');
  assert.ok(response.headers.get('X-Request-Id'));
});

test('GET /api/users can return payload from KV search cache without upstream fetch', async () => {
  let fetchCalls = 0;
  installWorkerGlobals({
    fetchImpl: async () => {
      fetchCalls += 1;
      return createJsonResponse([]);
    },
  });

  const env = createEnv({
    SEARCH_CACHE: {
      async get(key) {
        assert.equal(
          key,
          'search-cache:https://worker.example/api/users?name=kv'
        );
        return JSON.stringify([
          {
            id: 'U-KV-HIT',
            username: 'kv-user',
          },
        ]);
      },
      async put() {
        throw new Error('put should not be called on KV hit');
      },
    },
  });

  const response = await worker.fetch(
    new Request('https://worker.example/api/users?name=kv', {
      method: 'GET',
      headers: {
        Origin: 'https://allowed.example',
      },
    }),
    env
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Worker-Cache'), 'KV-HIT');
  assert.match(response.headers.get('Server-Timing') || '', /kv-cache;dur=/);
  assert.equal(payload[0].id, 'U-KV-HIT');
  assert.equal(fetchCalls, 0);
});

test('GET /api/users returns edge cache HIT with Server-Timing and skips upstream', async () => {
  let fetchCalls = 0;
  globalThis.caches = {
    default: {
      async match(request) {
        assert.equal(request.method, 'GET');
        return createJsonResponse([
          {
            id: 'U-EDGE-HIT',
            username: 'edge-cache-user',
          },
        ]);
      },
      async put() {
        throw new Error('put should not be called for cache hit');
      },
    },
  };
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return createJsonResponse([]);
  };

  const env = createEnv();
  const response = await worker.fetch(
    new Request('https://worker.example/api/users?name=edge-hit', {
      method: 'GET',
      headers: {
        Origin: 'https://allowed.example',
      },
    }),
    env
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Worker-Cache'), 'HIT');
  assert.match(response.headers.get('Server-Timing') || '', /edge-cache;dur=0/);
  assert.equal(payload[0].id, 'U-EDGE-HIT');
  assert.equal(fetchCalls, 0);
});

test('GET /api/users stores upstream payload to KV search cache when configured', async () => {
  const kvWrites = [];
  installWorkerGlobals({
    fetchImpl: async () =>
      createJsonResponse([
        {
          id: 'U-KV-MISS',
          username: 'kv-miss-user',
        },
      ]),
  });

  const env = createEnv({
    SEARCH_CACHE_TTL_SECONDS: '120',
    SEARCH_CACHE: {
      async get() {
        return null;
      },
      async put(key, value, options) {
        kvWrites.push({ key, value, options });
      },
    },
  });

  const response = await worker.fetch(
    new Request('https://worker.example/api/users?name=kv-miss', {
      method: 'GET',
      headers: {
        Origin: 'https://allowed.example',
      },
    }),
    env
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Worker-Cache'), 'MISS');
  assert.equal(kvWrites.length, 1);
  assert.equal(
    kvWrites[0].key,
    'search-cache:https://worker.example/api/users?name=kv-miss'
  );
  assert.deepEqual(JSON.parse(kvWrites[0].value), [
    {
      id: 'U-KV-MISS',
      username: 'kv-miss-user',
    },
  ]);
  assert.deepEqual(kvWrites[0].options, { expirationTtl: 120 });
});

test('HEAD /api/users does not populate cache stores on upstream fetch', async () => {
  let cachePutCalls = 0;
  globalThis.caches = {
    default: {
      async match() {
        return undefined;
      },
      async put() {
        cachePutCalls += 1;
      },
    },
  };
  globalThis.fetch = async () =>
    createJsonResponse([
      {
        id: 'U-HEAD-CACHE',
        username: 'head-cache-user',
      },
    ]);

  let kvPutCalls = 0;
  const env = createEnv({
    SEARCH_CACHE: {
      async get() {
        return null;
      },
      async put() {
        kvPutCalls += 1;
      },
    },
  });

  const response = await worker.fetch(
    new Request('https://worker.example/api/users?name=head-cache', {
      method: 'HEAD',
      headers: {
        Origin: 'https://allowed.example',
      },
    }),
    env
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
  assert.equal(cachePutCalls, 0);
  assert.equal(kvPutCalls, 0);
});

test('GET /api/users falls back to upstream when KV read fails', async () => {
  let fetchCalls = 0;
  installWorkerGlobals({
    fetchImpl: async () => {
      fetchCalls += 1;
      return createJsonResponse([
        {
          id: 'U-KV-READ-ERROR',
          username: 'kv-read-error-user',
        },
      ]);
    },
  });

  const env = createEnv({
    SEARCH_CACHE: {
      async get() {
        throw new Error('kv get unavailable');
      },
      async put() {
        return undefined;
      },
    },
  });

  const response = await worker.fetch(
    new Request('https://worker.example/api/users?name=kv-read-error', {
      method: 'GET',
      headers: {
        Origin: 'https://allowed.example',
      },
    }),
    env
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Worker-Cache'), 'MISS');
  assert.equal(payload[0].id, 'U-KV-READ-ERROR');
  assert.equal(fetchCalls, 1);
});

test('GET /api/users still succeeds when KV write fails', async () => {
  installWorkerGlobals({
    fetchImpl: async () =>
      createJsonResponse([
        {
          id: 'U-KV-WRITE-ERROR',
          username: 'kv-write-error-user',
        },
      ]),
  });

  const env = createEnv({
    SEARCH_CACHE: {
      async get() {
        return null;
      },
      async put() {
        throw new Error('kv put unavailable');
      },
    },
  });

  const response = await worker.fetch(
    new Request('https://worker.example/api/users?name=kv-write-error', {
      method: 'GET',
      headers: {
        Origin: 'https://allowed.example',
      },
    }),
    env
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Worker-Cache'), 'MISS');
  assert.equal(payload[0].id, 'U-KV-WRITE-ERROR');
});
test('missing non-api asset keeps status and includes X-Request-Id', async () => {
  installWorkerGlobals();

  const env = createEnv({
    ASSETS: {
      async fetch() {
        return new Response('missing', { status: 404 });
      },
    },
  });

  const response = await worker.fetch(
    new Request('https://worker.example/missing-asset.png'),
    env
  );

  assert.equal(response.status, 404);
  assert.equal(await response.text(), 'missing');
  assert.ok(response.headers.get('X-Request-Id'));
});

test('HEAD /api/unknown returns bodyless 404 response', async () => {
  installWorkerGlobals();

  const env = createEnv();
  const response = await worker.fetch(
    new Request('https://worker.example/api/unknown', {
      method: 'HEAD',
      headers: {
        Origin: 'https://allowed.example',
      },
    }),
    env
  );

  assert.equal(response.status, 404);
  assert.equal(await response.text(), '');
  assert.ok(response.headers.get('X-RateLimit-Limit'));
});

test('HEAD /api/users rejects disallowed origin with bodyless 403', async () => {
  installWorkerGlobals();

  const env = createEnv();
  const response = await worker.fetch(
    new Request('https://worker.example/api/users?name=blocked', {
      method: 'HEAD',
      headers: {
        Origin: 'https://blocked.example',
      },
    }),
    env
  );

  assert.equal(response.status, 403);
  assert.equal(await response.text(), '');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'null');
});

test('HEAD /api/users without name returns bodyless 400', async () => {
  installWorkerGlobals();

  const env = createEnv();
  const response = await worker.fetch(
    new Request('https://worker.example/api/users', {
      method: 'HEAD',
      headers: {
        Origin: 'https://allowed.example',
      },
    }),
    env
  );

  assert.equal(response.status, 400);
  assert.equal(await response.text(), '');
});

test('HEAD /api/users/:id with empty id returns bodyless 400', async () => {
  installWorkerGlobals();

  const env = createEnv();
  const response = await worker.fetch(
    new Request('https://worker.example/api/users/', {
      method: 'HEAD',
      headers: {
        Origin: 'https://allowed.example',
      },
    }),
    env
  );

  assert.equal(response.status, 400);
  assert.equal(await response.text(), '');
});

test('HEAD /api/worlds returns bodyless 405 with Allow header', async () => {
  installWorkerGlobals();

  const env = createEnv();
  const response = await worker.fetch(
    new Request('https://worker.example/api/worlds', {
      method: 'HEAD',
      headers: {
        Origin: 'https://allowed.example',
      },
    }),
    env
  );

  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'POST');
  assert.equal(await response.text(), '');
});
