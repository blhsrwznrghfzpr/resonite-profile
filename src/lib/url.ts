export const DEFAULT_AVATAR_URL =
  'https://assets.resonite.com/9adc7bf85f005413174dbb26c1ef3f62b6ce9e1abbbaf5b504d490b872107373';

export function convertIconUrl(iconUrl: string | undefined | null): string {
  if (!iconUrl) return DEFAULT_AVATAR_URL;

  if (iconUrl.startsWith('resdb:///')) {
    const filename = iconUrl.replace('resdb:///', '');
    const filenameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    return `https://assets.resonite.com/${filenameWithoutExt}`;
  }

  return iconUrl;
}
