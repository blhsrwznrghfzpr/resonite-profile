import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceRotation,
  ROTATION_PERIOD_MS,
  startPanoramaMotion,
} from '../src/lib/panoramaMotion.ts';

test('a complete rotation wraps smoothly and has a ninety-second period', () => {
  assert.equal(advanceRotation(0, ROTATION_PERIOD_MS), 0);
  assert.ok(
    Math.abs(advanceRotation(0, ROTATION_PERIOD_MS / 2) - Math.PI) < 1e-10
  );
  assert.equal(advanceRotation(1, -10), 1);
  assert.ok(advanceRotation(Math.PI * 2 - 0.01, 1000) < 0.1);
});

function harness({ reduced = false, supported = true } = {}) {
  const document = new globalThis.EventTarget();
  document.hidden = false;
  const media = new globalThis.EventTarget();
  media.matches = reduced;
  const frames = new Map();
  let id = 0;
  let observer;
  let uploads = 0;
  let draws = 0;
  let contexts = 0;
  let releases = 0;
  const angles = [];
  globalThis.document = document;
  globalThis.window = { matchMedia: () => media };
  globalThis.requestAnimationFrame = callback => {
    frames.set(++id, callback);
    return id;
  };
  globalThis.cancelAnimationFrame = frame => frames.delete(frame);
  globalThis.IntersectionObserver = class {
    constructor(callback) {
      observer = callback;
    }
    observe() {}
    disconnect() {
      observer = null;
    }
  };
  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ARRAY_BUFFER: 5,
    STATIC_DRAW: 6,
    FLOAT: 7,
    TEXTURE_2D: 8,
    TEXTURE_MIN_FILTER: 9,
    TEXTURE_MAG_FILTER: 10,
    LINEAR: 11,
    TEXTURE_WRAP_S: 12,
    TEXTURE_WRAP_T: 13,
    REPEAT: 14,
    CLAMP_TO_EDGE: 15,
    RGBA: 16,
    UNSIGNED_BYTE: 17,
    NO_ERROR: 0,
    TRIANGLE_STRIP: 18,
    createProgram: () => ({}),
    createBuffer: () => ({}),
    createTexture: () => ({}),
    createShader: () => ({}),
    getShaderParameter: () => true,
    getProgramParameter: () => true,
    getAttribLocation: () => 0,
    getUniformLocation: () => ({}),
    getError: () => 0,
    isContextLost: () => false,
    getExtension: () => ({
      loseContext() {
        releases++;
      },
    }),
    texImage2D() {
      uploads++;
    },
    drawArrays() {
      draws++;
    },
    uniform1f(_location, angle) {
      angles.push(angle);
    },
  };
  for (const method of [
    'deleteTexture',
    'deleteBuffer',
    'deleteProgram',
    'deleteShader',
    'shaderSource',
    'compileShader',
    'attachShader',
    'linkProgram',
    'useProgram',
    'bindBuffer',
    'bufferData',
    'enableVertexAttribArray',
    'vertexAttribPointer',
    'bindTexture',
    'texParameteri',
    'uniform1i',
    'viewport',
  ])
    gl[method] = () => {};
  const canvas = new globalThis.EventTarget();
  canvas.setAttribute = () => {};
  canvas.width = 640;
  canvas.height = 320;
  canvas.getContext = () => {
    contexts++;
    return supported ? gl : null;
  };
  const ready = [];
  const controller = startPanoramaMotion(canvas, {}, {}, value =>
    ready.push(value)
  );
  return {
    controller,
    frames,
    ready,
    canvas,
    document,
    media,
    angles,
    visible(value) {
      observer?.([{ isIntersecting: value }]);
    },
    step(time) {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach(callback => callback(time));
    },
    stats: () => ({ uploads, draws, contexts, releases }),
  };
}

test('uploads once, caps frame rate, pauses offscreen and resumes without jumping', () => {
  const h = harness();
  assert.equal(h.frames.size, 0);
  assert.equal(h.stats().contexts, 0);
  h.visible(true);
  assert.deepEqual(h.ready, [true]);
  assert.equal(h.stats().uploads, 1);
  h.step(0);
  h.step(10);
  assert.equal(h.stats().draws, 1);
  h.step(60);
  assert.equal(h.stats().draws, 2);
  h.visible(false);
  assert.equal(h.frames.size, 0);
  const angle = h.angles.at(-1);
  h.visible(true);
  h.step(60000);
  assert.equal(h.angles.at(-1), angle);
  h.step(60060);
  assert.ok(h.angles.at(-1) > angle);
  assert.equal(h.stats().uploads, 1);
  h.controller.setPaused(true);
  assert.equal(h.frames.size, 0);
  h.controller.setPaused(false);
  assert.equal(h.frames.size, 1);
  h.controller.dispose();
  assert.equal(h.frames.size, 0);
  assert.equal(h.stats().releases, 1);
});

test('reduced motion and hidden documents stop all scheduling, including preference changes', () => {
  const h = harness({ reduced: true });
  h.visible(true);
  assert.equal(h.stats().contexts, 0);
  assert.equal(h.frames.size, 0);
  h.media.matches = false;
  h.media.dispatchEvent(new globalThis.Event('change'));
  assert.equal(h.frames.size, 1);
  h.document.hidden = true;
  h.document.dispatchEvent(new globalThis.Event('visibilitychange'));
  assert.equal(h.frames.size, 0);
  h.document.hidden = false;
  h.document.dispatchEvent(new globalThis.Event('visibilitychange'));
  assert.equal(h.frames.size, 1);
  h.media.matches = true;
  h.media.dispatchEvent(new globalThis.Event('change'));
  assert.equal(h.frames.size, 0);
  h.controller.dispose();
  h.media.matches = false;
  h.media.dispatchEvent(new globalThis.Event('change'));
  assert.equal(h.frames.size, 0);
});

test('unsupported or lost GPU contexts keep the static fallback and stop work', () => {
  const unsupported = harness({ supported: false });
  unsupported.visible(true);
  assert.deepEqual(unsupported.ready, [false]);
  assert.equal(unsupported.frames.size, 0);
  unsupported.controller.dispose();
  const h = harness();
  h.visible(true);
  h.canvas.dispatchEvent(new globalThis.Event('webglcontextlost'));
  assert.deepEqual(h.ready, [true, false]);
  assert.equal(h.frames.size, 0);
  h.visible(false);
  h.visible(true);
  assert.equal(h.frames.size, 0);
  h.controller.dispose();
});
