const RESONITE_API_BASE = 'https://api.resonite.com';
const DEFAULT_AVATAR_URL =
  'https://assets.resonite.com/9adc7bf85f005413174dbb26c1ef3f62b6ce9e1abbbaf5b504d490b872107373';
const API_TIMEOUT_MS = 10000;

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}

function errorResponse(status, message) {
  return jsonResponse({ error: message }, status);
}

function convertIconUrl(iconUrl) {
  if (!iconUrl) return DEFAULT_AVATAR_URL;

  if (iconUrl.startsWith('resdb:///')) {
    const filename = iconUrl.replace('resdb:///', '');
    const filenameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    return `https://assets.resonite.com/${filenameWithoutExt}`;
  }

  return iconUrl;
}

async function fetchWithTimeout(url, init = {}, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function proxyGet(url, cacheControl) {
  try {
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      return errorResponse(response.status, `API returned ${response.status}`);
    }

    const data = await response.json();
    return jsonResponse(data, 200, {
      'Cache-Control': cacheControl,
    });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    return errorResponse(
      500,
      isTimeout ? 'Upstream request timeout' : 'Internal server error'
    );
  }
}

async function proxyWorlds(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Invalid JSON body');
  }

  try {
    const response = await fetchWithTimeout(
      `${RESONITE_API_BASE}/records/pagedSearch`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      return errorResponse(response.status, `API returned ${response.status}`);
    }

    const data = await response.json();
    return jsonResponse(data, 200, {
      'Cache-Control': 'public, max-age=60',
    });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    return errorResponse(
      500,
      isTimeout ? 'Upstream request timeout' : 'Internal server error'
    );
  }
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function buildUserPage(request, env, userId) {
  const indexResponse = await env.ASSETS.fetch(
    new Request(new URL('/', request.url))
  );

  if (!indexResponse.ok) {
    return indexResponse;
  }

  let html = await indexResponse.text();

  try {
    const userResponse = await fetchWithTimeout(
      `${RESONITE_API_BASE}/users/${encodeURIComponent(userId)}`
    );

    if (userResponse.ok) {
      const userData = await userResponse.json();
      const username = userData.username || 'Unknown User';
      const avatarUrl = convertIconUrl(userData.profile?.iconUrl);
      const registrationDate = new Date(
        userData.registrationDate
      ).toLocaleDateString('ja-JP');
      const description = `${username} • ${registrationDate}登録`;
      const host = new URL(request.url).host;

      const ogpTags = `
    <meta property="og:title" content="${escapeHtml(username)} - Resonite Profile" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(avatarUrl)}" />
    <meta property="og:url" content="https://${escapeHtml(host)}/user/${escapeHtml(userId)}" />
    <meta property="og:type" content="profile" />
    <meta property="og:site_name" content="Resonite ユーザー検索" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(username)} - Resonite Profile" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(avatarUrl)}" />
    <title>${escapeHtml(username)} - Resonite Profile</title>`;

      html = html.replace('<title>Resonite ユーザー検索</title>', ogpTags);
    }
  } catch {
    // OGP generation failure should fall back to plain index.html
  }

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

async function handleApi(request, pathname, searchParams) {
  if (request.method === 'GET' && pathname === '/api/users') {
    const name = searchParams.get('name');
    if (!name) return errorResponse(400, 'Name parameter is required');

    return proxyGet(
      `${RESONITE_API_BASE}/users/?name=${encodeURIComponent(name)}`,
      'public, max-age=60, s-maxage=300'
    );
  }

  if (request.method === 'GET' && pathname.startsWith('/api/users/')) {
    const userId = pathname.replace('/api/users/', '');
    if (!userId) return errorResponse(400, 'User ID is required');

    return proxyGet(
      `${RESONITE_API_BASE}/users/${encodeURIComponent(userId)}`,
      'public, max-age=60, s-maxage=300'
    );
  }

  if (request.method === 'GET' && pathname === '/api/sessions') {
    return proxyGet(
      `${RESONITE_API_BASE}/sessions?minActiveUsers=1&includeEmptyHeadless=false`,
      'public, max-age=30, s-maxage=120'
    );
  }

  if (request.method === 'POST' && pathname === '/api/worlds') {
    return proxyWorlds(request);
  }

  return errorResponse(404, 'Not Found');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;

    if (pathname.startsWith('/api/')) {
      return handleApi(request, pathname, searchParams);
    }

    if (pathname.startsWith('/user/')) {
      const userId = pathname.replace('/user/', '');
      if (userId) {
        return buildUserPage(request, env, userId);
      }
    }

    return env.ASSETS.fetch(request);
  },
};
