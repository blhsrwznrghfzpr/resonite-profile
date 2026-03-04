import { getTagIcon } from '../data/tagImages.ts';

interface Props {
  tag: string;
  showLabel?: boolean;
}

export function TagBadge({ tag, showLabel = false }: Props) {
  const iconUrl = getTagIcon(tag);
  const displayName = tag.startsWith('custom badge:') ? 'custom badge' : tag;

  if (showLabel) {
    return (
      <span class="tag">
        {iconUrl && (
          <img
            class="tag-icon"
            src={iconUrl}
            alt={tag}
            onError={e => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        {displayName}
      </span>
    );
  }

  if (!iconUrl) return null;
  return (
    <img
      class="tag-icon"
      src={iconUrl}
      alt={displayName}
      title={displayName}
      onError={e => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}
