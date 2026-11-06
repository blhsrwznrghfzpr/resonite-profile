import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../worker/index.ts';
import {
  handleWorldThumbnail,
  MAX_THUMBNAIL_BYTES,
} from '../worker/routes/worldThumbnails.ts';

const hash = 'd5affd43f43f55c35e0117406874778c27d391e4c4792060a3b65ffbc2f22b8e';
const url = `https://preview.example/api/world-thumbnails/${hash}`;
const config = { timeoutMs: 100 };
function setup(fetchImpl, cache = {}) {
  globalThis.fetch =
    fetchImpl ??
    (() => {
      throw new Error('Unexpected fetch');
    });
  globalThis.caches = {
    default: { match: async () => undefined, put: async () => {}, ...cache },
  };
}
function imageResponse(body = new Uint8Array([82, 73, 70, 70]), headers = {}) {
  return new Response(body, {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'max-age=14400',
      ...headers,
    },
  });
}

test('same-origin route returns binary image despite upstream having no CORS', async () => {
  let stored;
  setup(
    async (target, init) => {
      assert.equal(target, `https://assets.resonite.com/${hash}`);
      assert.equal(init.redirect, 'error');
      assert.equal(init.headers, undefined);
      assert.equal(init.method, 'GET');
      return imageResponse(undefined, { 'Set-Cookie': 'unwanted=1' });
    },
    {
      put: async (key, value) => {
        stored = value;
        assert.equal(key.url, url);
      },
    }
  );
  const response = await worker.fetch(
    new Request(url, {
      headers: {
        Origin: 'https://preview.example',
        Cookie: 'private=1',
        Authorization: 'Bearer private',
      },
    }),
    { CORS_ALLOW_ORIGIN: '*' }
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'image/webp');
  assert.equal(response.headers.get('Set-Cookie'), null);
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.match(response.headers.get('Cache-Control'), /max-age=14400/);
  assert.deepEqual(
    [...new Uint8Array(await response.arrayBuffer())],
    [82, 73, 70, 70]
  );
  assert.ok(stored);
});

test('rejects arbitrary URLs, traversal and malformed hashes without fetching', async () => {
  setup();
  for (const invalid of [
    'https://evil.example/image',
    '../image',
    'a'.repeat(63),
    `${hash}/other`,
    `${hash}?url=https://evil.example`,
  ]) {
    assert.equal(
      (await handleWorldThumbnail(new Request(url), invalid, config)).status,
      400
    );
  }
});

test('rejects unsupported methods', async () => {
  setup();
  const response = await handleWorldThumbnail(
    new Request(url, { method: 'POST' }),
    hash,
    config
  );
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'GET, HEAD');
});

test('rejects HTML/SVG and upstream failures without caching', async () => {
  for (const type of ['text/html', 'image/svg+xml']) {
    setup(
      async () => new Response('<svg/>', { headers: { 'Content-Type': type } })
    );
    const response = await handleWorldThumbnail(new Request(url), hash, config);
    assert.equal(response.status, 502);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
  for (const status of [302, 404, 500]) {
    setup(async () => new Response(null, { status }));
    assert.equal(
      (await handleWorldThumbnail(new Request(url), hash, config)).status,
      status === 404 ? 404 : 502
    );
  }
});

test('bounds both declared and streamed image size', async () => {
  setup(async () =>
    imageResponse(undefined, {
      'Content-Length': String(MAX_THUMBNAIL_BYTES + 1),
    })
  );
  assert.equal(
    (await handleWorldThumbnail(new Request(url), hash, config)).status,
    502
  );
  setup(async () => imageResponse(new Uint8Array(MAX_THUMBNAIL_BYTES + 1)));
  assert.equal(
    (await handleWorldThumbnail(new Request(url), hash, config)).status,
    502
  );
});

test('uses canonical cache key and serves HEAD with no body', async () => {
  setup(undefined, {
    match: async key => {
      assert.equal(key.url, url);
      return imageResponse();
    },
  });
  const response = await handleWorldThumbnail(
    new Request(`${url}?ignored=1`, { method: 'HEAD' }),
    hash,
    config
  );
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
});

test('HEAD cache miss forwards HEAD and never stores an empty image', async () => {
  setup(
    async (_url, init) => {
      assert.equal(init.method, 'HEAD');
      return imageResponse(null);
    },
    { put: () => assert.fail('HEAD must not populate GET cache') }
  );
  const response = await handleWorldThumbnail(
    new Request(url, { method: 'HEAD' }),
    hash,
    config
  );
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
});

test('timeout returns 504 and cache write failure preserves the image', async () => {
  setup(
    (_url, init) =>
      new Promise((resolve, reject) =>
        init.signal.addEventListener('abort', () =>
          reject(new Error('aborted'))
        )
      )
  );
  assert.equal(
    (await handleWorldThumbnail(new Request(url), hash, { timeoutMs: 1 }))
      .status,
    504
  );
  setup(async () => imageResponse(), {
    put: async () => {
      throw new Error('cache full');
    },
  });
  assert.equal(
    (await handleWorldThumbnail(new Request(url), hash, config)).status,
    200
  );
});

test('preserves upstream asset caching policy and age without extending lifetime', async () => {
  setup(async () =>
    imageResponse(undefined, {
      'Cache-Control': 'max-age=14400',
      Age: '111',
      ETag: '"asset-version"',
      'Last-Modified': 'Sun, 13 Sep 2026 15:56:51 GMT',
    })
  );
  const response = await handleWorldThumbnail(new Request(url), hash, config);
  assert.equal(response.headers.get('Cache-Control'), 'max-age=14400');
  assert.equal(response.headers.get('Age'), '111');
  assert.equal(response.headers.get('ETag'), '"asset-version"');
  assert.equal(
    response.headers.get('Last-Modified'),
    'Sun, 13 Sep 2026 15:56:51 GMT'
  );
});

test('does not cache assets when upstream caching is absent or restricted', async () => {
  for (const policy of [null, 'private, max-age=60', 'no-store', 'no-cache']) {
    setup(
      async () => {
        const response = imageResponse();
        if (policy === null) response.headers.delete('Cache-Control');
        else response.headers.set('Cache-Control', policy);
        return response;
      },
      { put: () => assert.fail('restricted image must not be cached') }
    );
    const response = await handleWorldThumbnail(new Request(url), hash, config);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), policy ?? 'no-store');
  }
});
