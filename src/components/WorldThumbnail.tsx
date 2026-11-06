import { useRef, useState } from 'preact/hooks';
import { DEFAULT_AVATAR_URL } from '../lib/url.ts';
import {
  isPanorama,
  worldThumbnailSource,
  projectPanorama,
  THUMBNAIL_WIDTH,
  THUMBNAIL_HEIGHT,
} from '../lib/worldThumbnail.ts';

interface Props {
  src: string;
  alt: string;
}

export function WorldThumbnail(props: Props) {
  // Reset projection and retry state when a world receives a new thumbnail.
  return <ThumbnailImage key={props.src} {...props} />;
}

function ThumbnailImage({ src, alt }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [projected, setProjected] = useState(false);
  const [allowPixels, setAllowPixels] = useState(true);
  const [failed, setFailed] = useState(false);
  const imageUrl = failed
    ? DEFAULT_AVATAR_URL
    : allowPixels && src !== DEFAULT_AVATAR_URL
      ? worldThumbnailSource(src)
      : src;

  function handleLoad(image: HTMLImageElement) {
    if (
      !allowPixels ||
      failed ||
      src === DEFAULT_AVATAR_URL ||
      !isPanorama(image.naturalWidth, image.naturalHeight)
    ) {
      return;
    }

    try {
      const output = canvas.current?.getContext('2d');
      if (!output) return;
      // Bound readback memory for large panoramas. No animation loop or
      // persistent GPU context is needed for these non-interactive previews.
      const input = document.createElement('canvas');
      input.width = Math.min(image.naturalWidth, 2048);
      input.height = Math.round(input.width / 2);
      const context = input.getContext('2d', { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0, input.width, input.height);
      const pixels = context.getImageData(0, 0, input.width, input.height);
      const result = output.createImageData(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
      result.data.set(projectPanorama(pixels.data, input.width, input.height));
      output.putImageData(result, 0, 0);
      setProjected(true);
    } catch {
      // A cross-origin or unsupported canvas must not remove the thumbnail.
      setProjected(false);
    }
  }

  return (
    <>
      <img
        key={`${imageUrl}:${allowPixels}`}
        src={imageUrl}
        alt={alt}
        class="world-thumbnail"
        style={projected ? { display: 'none' } : undefined}
        crossOrigin={allowPixels && !failed ? 'anonymous' : undefined}
        loading="lazy"
        decoding="async"
        onLoad={event => handleLoad(event.currentTarget)}
        onError={() => {
          if (allowPixels && !failed) {
            // Retry the original image if the proxy or a CORS request fails.
            setAllowPixels(false);
          } else if (!failed) {
            setFailed(true);
          }
        }}
      />
      <canvas
        ref={canvas}
        width={THUMBNAIL_WIDTH}
        height={THUMBNAIL_HEIGHT}
        class="world-thumbnail"
        style={projected ? undefined : { display: 'none' }}
        role="img"
        aria-label={alt}
      />
    </>
  );
}
