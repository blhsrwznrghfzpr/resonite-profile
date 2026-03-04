import { DEFAULT_AVATAR_URL } from '../constants.ts';

export function convertIconUrl(iconUrl: string | undefined | null): string {
  if (!iconUrl) return DEFAULT_AVATAR_URL;

  if (iconUrl.startsWith('resdb:///')) {
    const filename = iconUrl.replace('resdb:///', '');
    const filenameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    return `https://assets.resonite.com/${filenameWithoutExt}`;
  }

  return iconUrl;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
