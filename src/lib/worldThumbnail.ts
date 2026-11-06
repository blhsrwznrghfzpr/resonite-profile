/**
 * Static rectilinear view of a Resonite equirectangular world thumbnail.
 * Uses a 90° horizontal field of view, looking at the panorama's centre.
 * The 2:1 output matches the square-view/central-half crop used by
 * https://github.com/Yellow-Dog-Man/go.resonite.com
 * This is an independent ray-to-sphere implementation, not copied code.
 */
export const THUMBNAIL_WIDTH = 640;
export const THUMBNAIL_HEIGHT = 320;

// World records have no projection metadata. Only treat full 2:1 panoramas
// as spherical; preserve other aspect ratios as ordinary images.
export function isPanorama(width: number, height: number): boolean {
  return width > 0 && height > 0 && Math.abs(width - height * 2) <= 1;
}

export function panoramaCoordinates(
  x: number,
  y: number,
  width: number,
  height: number
): [number, number] {
  // Pixel-centred camera rays. At 90° horizontal FOV the focal length is w/2.
  const rayX = (2 * (x + 0.5) - width) / width;
  const rayY = (height - 2 * (y + 0.5)) / width;
  const longitude = Math.atan2(rayX, 1);
  const latitude = Math.atan2(rayY, Math.hypot(rayX, 1));
  return [0.5 + longitude / (2 * Math.PI), 0.5 - latitude / Math.PI];
}

export function projectPanorama(
  source: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  width = THUMBNAIL_WIDTH,
  height = THUMBNAIL_HEIGHT
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [u, v] = panoramaCoordinates(x, y, width, height);
      const sx = u * sourceWidth - 0.5;
      const sy = v * sourceHeight - 0.5;
      const left = Math.floor(sx);
      const top = Math.floor(sy);
      const fx = sx - left;
      const fy = sy - top;
      // Bilinear sampling keeps small previews smooth. Wrap longitude and
      // clamp latitude so seams/poles can never read outside the source.
      for (let channel = 0; channel < 4; channel++) {
        let value = 0;
        for (let dy = 0; dy < 2; dy++) {
          const row = Math.max(0, Math.min(sourceHeight - 1, top + dy));
          for (let dx = 0; dx < 2; dx++) {
            const col =
              (((left + dx) % sourceWidth) + sourceWidth) % sourceWidth;
            value +=
              source[(row * sourceWidth + col) * 4 + channel] *
              (dx ? fx : 1 - fx) *
              (dy ? fy : 1 - fy);
          }
        }
        result[(y * width + x) * 4 + channel] = value;
      }
    }
  }
  return result;
}

/** Resonite assets do not grant every preview origin CORS canvas access. */
export function worldThumbnailSource(src: string): string {
  const match = /^https:\/\/assets\.resonite\.com\/([a-f0-9]{64})$/.exec(src);
  return match ? `/api/world-thumbnails/${match[1]}` : src;
}
