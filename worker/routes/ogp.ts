import { RESONITE_API_BASE } from '../constants.ts';
import type { Env } from '../types.ts';
import { fetchWithTimeout } from '../lib/proxy.ts';
import { convertIconUrl, escapeHtml } from '../lib/url.ts';

export async function buildUserPage(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
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
      const userData = await userResponse.json<{
        username?: string;
        registrationDate?: string;
        profile?: { iconUrl?: string };
      }>();
      const username = userData.username || 'Unknown User';
      const avatarUrl = convertIconUrl(userData.profile?.iconUrl);
      const registrationDate = new Date(
        userData.registrationDate ?? ''
      ).toLocaleDateString('ja-JP');
      const description = `${username} • ${registrationDate}登録`;
      const host = new URL(request.url).host;

      const ogpTags = `
    <meta property="og:title" content="${escapeHtml(username)} - Resonite Profile" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(avatarUrl)}" />
    <meta property="og:url" content="https://${escapeHtml(host)}/${escapeHtml(userId)}" />
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
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
