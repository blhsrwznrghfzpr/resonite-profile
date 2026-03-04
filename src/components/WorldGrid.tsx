import { convertIconUrl, DEFAULT_AVATAR_URL } from '../lib/url.ts';
import type { World } from '../types.ts';

interface Props {
  worlds: World[];
}

function truncateText(text: string, maxLength = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function safeStripHtmlTags(text: string): string {
  try {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    return doc.body.textContent ?? '';
  } catch {
    return '';
  }
}

export function WorldGrid({ worlds }: Props) {
  if (worlds.length === 0) {
    return (
      <div style="text-align: center; color: #999;">
        公開されたワールドがありません
      </div>
    );
  }

  return (
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
      {worlds.map(world => {
        const thumbnailUrl = world.thumbnailUri
          ? convertIconUrl(world.thumbnailUri)
          : DEFAULT_AVATAR_URL;
        const publishDate = world.firstPublishTime
          ? new Date(world.firstPublishTime).toLocaleDateString('ja-JP')
          : '';
        const worldName = safeStripHtmlTags(world.name ?? '');
        const worldDescription = world.description
          ? truncateText(safeStripHtmlTags(world.description), 120)
          : '';
        const worldUrl = `https://go.resonite.com/world/${encodeURIComponent(world.ownerId)}/${encodeURIComponent(world.id)}`;

        return (
          <a
            key={world.id}
            href={worldUrl}
            target="_blank"
            style="text-decoration: none; color: inherit;"
          >
            <div class="world-card world-item">
              <img
                src={thumbnailUrl}
                alt={worldName}
                class="world-thumbnail"
                onError={e => {
                  (e.target as HTMLImageElement).src = DEFAULT_AVATAR_URL;
                }}
              />
              <div class="world-content">
                <div class="world-title">{worldName}</div>
                <div class="world-date">公開日: {publishDate}</div>
                {worldDescription && (
                  <div class="world-description">{worldDescription}</div>
                )}
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
