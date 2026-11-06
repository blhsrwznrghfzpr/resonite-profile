import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isPanorama,
  worldThumbnailSource,
  panoramaCoordinates,
  projectPanorama,
} from '../src/lib/worldThumbnail.ts';

const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-10);

test('only positive 2:1 images are treated as panoramas', () => {
  assert.equal(isPanorama(2048, 1024), true);
  assert.equal(isPanorama(2047, 1024), true);
  for (const [width, height] of [
    [640, 480],
    [640, 640],
    [0, 0],
    [-2, -1],
  ]) {
    assert.equal(isPanorama(width, height), false);
  }
});

test('centre looks at the panorama centre without rotation or mirroring', () => {
  const [u, v] = panoramaCoordinates(2, 1, 5, 3);
  near(u, 0.5);
  near(v, 0.5);
  assert.ok(panoramaCoordinates(0, 1, 5, 3)[0] < u);
  assert.ok(panoramaCoordinates(4, 1, 5, 3)[0] > u);
  assert.ok(panoramaCoordinates(2, 0, 5, 3)[1] < v);
  assert.ok(panoramaCoordinates(2, 2, 5, 3)[1] > v);
});

test('90 degree horizontal field and 2:1 crop preserve perspective', () => {
  near(panoramaCoordinates(-0.5, 159.5, 640, 320)[0], 0.375);
  near(panoramaCoordinates(639.5, 159.5, 640, 320)[0], 0.625);
  near(
    panoramaCoordinates(319.5, -0.5, 640, 320)[1],
    0.5 - Math.atan(0.5) / Math.PI
  );
  // A horizontal ray on a rectilinear plane has less latitude at the sides.
  assert.ok(
    panoramaCoordinates(0, 0, 640, 320)[1] >
      panoramaCoordinates(319.5, 0, 640, 320)[1]
  );
});

test('bilinear projection retains constant colour and alpha at every pixel', () => {
  const input = new Uint8ClampedArray(8 * 4 * 4);
  for (let i = 0; i < input.length; i += 4) input.set([50, 120, 200, 255], i);
  const output = projectPanorama(input, 8, 4, 16, 8);
  assert.equal(output.length, 16 * 8 * 4);
  for (let i = 0; i < output.length; i += 4) {
    assert.deepEqual([...output.slice(i, i + 4)], [50, 120, 200, 255]);
  }
});

test('bilinear centre blends four pixels, including their alpha', () => {
  const input = new Uint8ClampedArray([
    0, 0, 0, 0, 100, 0, 0, 100, 0, 100, 0, 100, 100, 100, 0, 200,
  ]);
  assert.deepEqual([...projectPanorama(input, 2, 2, 1, 1)], [50, 50, 0, 100]);
});

test('Resonite thumbnails use the same-origin route, never an arbitrary proxy target', () => {
  const hash =
    'd5affd43f43f55c35e0117406874778c27d391e4c4792060a3b65ffbc2f22b8e';
  assert.equal(
    worldThumbnailSource(`https://assets.resonite.com/${hash}`),
    `/api/world-thumbnails/${hash}`
  );
  for (const url of [
    'https://other.example/image',
    `https://assets.resonite.com.evil/${hash}`,
    `https://assets.resonite.com/${hash}?target=other`,
    'https://assets.resonite.com/invalid',
  ]) {
    assert.equal(worldThumbnailSource(url), url);
  }
});
