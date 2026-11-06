# World thumbnail projection and automatic rotation

Created-world cards render 2:1 equirectangular thumbnails as a perspective
view that slowly rotates through the full panorama. The camera looks at the centre of the panorama with a 90° horizontal field
of view; the 640 × 320 output corresponds to the central half of a square view.
A complete turn takes 90 seconds. There are no drag controls or new dependencies.
The pause/resume button above the cards stops all thumbnail rotation.
`prefers-reduced-motion: reduce` always disables rotation, even after Resume.
The existing card link still opens the world on go.resonite.com.

The approach is informed by
[go.resonite.com's static preview](https://github.com/Yellow-Dog-Man/go.resonite.com/blob/main/helpers/360-image-processing.js),
but uses an independently written ray-to-sphere mapping and bilinear sampling.
No source code from that project is incorporated. This is not a pixel-identical
port of its projection-matrix implementation.

## Behaviour and limitations

- World records do not expose projection metadata. Images whose width is twice
  their height (within one pixel) are treated as panoramas. Other ratios and the
  default avatar are displayed normally. An ordinary 2:1 photograph cannot be
  distinguished from a panorama by this heuristic.
- Images are lazy-loaded. Each loaded panorama is decoded once. A static
  perspective canvas remains available as a fallback; a WebGL shader rotates the
  view using the same decoded pixels, without fetching another image. Textures
  are uploaded once and retained while the card is mounted. Rendering is capped
  at 20 frames per second and stops entirely when the card is offscreen, the
  document is hidden, rotation is paused, or reduced motion is requested.
  Pausing preserves the viewing direction, and resuming does not jump ahead.
  GPU resources, observers and frame callbacks are released on unmount.
  No WebGL/IntersectionObserver support or context loss leaves the static
  projection visible. The browser handles source-image HTTP
  caching; there is no unbounded global image or canvas cache.
- Input readback is capped at 2048 × 1024 pixels. The generated preview is not
  uploaded or sent to another service.
- Resonite asset URLs are loaded through `/api/world-thumbnails/:hash` on the
  same origin, because assets.resonite.com does not grant arbitrary preview
  origins CORS access. The Worker accepts only a 64-character lowercase hex
  hash, fetches only the fixed Resonite asset host, rejects redirects and
  non-raster image types, and caps image responses at 8 MiB. It forwards no
  client cookies or authorization. It preserves upstream Cache-Control, Age and
  validators instead of imposing a new TTL (the inspected Resonite images use
  max-age=14400). The same-origin cache is keyed by asset hash, with no query
  string fragmentation. Restricted or missing cache policies are not stored.
  Existing API response caches, their TTLs and cache keys are unchanged.
- Other hosts still require anonymous CORS for projection. If the same-origin
  image request or a third-party CORS request fails, the component retries the
  original image without CORS. Failed pixel readback leaves that original image
  visible. This emergency fallback may still show an unprojected image.
- If normal loading fails, the default avatar is displayed. A failed default
  image is not retried endlessly. A changed thumbnail URL resets all state.

## Verification

Run `npm run test:thumbnail` for rotation timing, visibility/paused/reduced-motion behaviour, GPU fallback,
texture reuse, cleanup and the projection's orientation, FOV, aspect-ratio
handling, bilinear sampling and alpha tests, plus the same-origin image route's
CORS-independent byte delivery, URL restrictions, type/size limits, failures,
HEAD handling, timeout and caching tests. Run `npm run build` and `npm run lint`
for the normal frontend checks.

For browser QA, check a known panorama, an ordinary non-2:1 image, an image on a
host without CORS, a broken URL and a missing thumbnail. Confirm the panorama's
centre and orientation, the world link and accessible image label, and repeat on
mobile, after reload, and after changing the thumbnail URL. Canvas failure must
leave the original image visible, and a broken fallback must not retry forever.

For rotation QA, verify visible movement over several seconds, pause/resume,
scrolling offscreen and back, background-tab suspension, reduced-motion settings,
and the wraparound seam. Rotation must not add image or API requests.
