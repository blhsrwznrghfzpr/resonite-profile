# World thumbnail projection

Created-world cards render 2:1 equirectangular thumbnails as a static perspective
view. The camera looks at the centre of the panorama with a 90° horizontal field
of view; the 640 × 320 output corresponds to the central half of a square view.
There are no drag controls, animation loops, WebGL contexts, or new dependencies.
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
- Images are lazy-loaded. Each loaded panorama is projected once, and its canvas
  is retained while the card is mounted. The browser handles source-image HTTP
  caching; there is no unbounded global image or canvas cache.
- Input readback is capped at 2048 × 1024 pixels. The generated preview is not
  uploaded or sent to another service.
- Projection requires the image host to allow anonymous CORS. If that request
  fails, the component retries normal image display without CORS. Failed pixel
  readback also leaves the original image visible. This fallback is intentionally
  unprojected, so images on hosts without CORS can still appear distorted.
- If normal loading fails, the default avatar is displayed. A failed default
  image is not retried endlessly. A changed thumbnail URL resets all state.

## Verification

Run `npm run test:thumbnail` for the projection's orientation, FOV, aspect-ratio
handling, bilinear sampling and alpha tests. Run `npm run build` and `npm run lint`
for the normal frontend checks.

For browser QA, check a known panorama, an ordinary non-2:1 image, an image on a
host without CORS, a broken URL and a missing thumbnail. Confirm the panorama's
centre and orientation, the world link and accessible image label, and repeat on
mobile, after reload, and after changing the thumbnail URL. Canvas failure must
leave the original image visible, and a broken fallback must not retry forever.
