export const ROTATION_PERIOD_MS = 60000;
export const FRAME_INTERVAL_MS = 1000 / 20;

export function advanceRotation(yaw: number, elapsedMs: number): number {
  return (
    (yaw + (Math.max(0, elapsedMs) / ROTATION_PERIOD_MS) * Math.PI * 2) %
    (Math.PI * 2)
  );
}

/** Upload the already-loaded panorama once; only a yaw uniform changes per frame. */
export function createPanoramaRenderer(
  canvas: HTMLCanvasElement,
  source: HTMLCanvasElement
) {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    preserveDrawingBuffer: true,
  });
  if (!gl) {
    console.warn('Panorama rotation: WebGL is unavailable');
    return null;
  }
  const shaders: WebGLShader[] = [];
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  const dispose = () => {
    gl.deleteTexture(texture);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    for (const shader of shaders) gl.deleteShader(shader);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
  try {
    if (!program || !buffer || !texture)
      throw new Error('WebGL allocation failed');
    for (const [type, code] of [
      [
        gl.VERTEX_SHADER,
        'attribute vec2 position; varying vec2 ray; void main(){ ray=vec2(position.x,position.y*0.5); gl_Position=vec4(position,0.0,1.0); }',
      ],
      [
        gl.FRAGMENT_SHADER,
        'precision highp float; varying vec2 ray; uniform sampler2D panorama; uniform float yaw; void main(){ float longitude=atan(ray.x,1.0)+yaw; float latitude=atan(ray.y,length(vec2(ray.x,1.0))); vec2 uv=vec2(fract(0.5+longitude/6.28318530718),0.5-latitude/3.14159265359); gl_FragColor=texture2D(panorama,uv); }',
      ],
    ] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Shader unavailable');
      shaders.push(shader);
      gl.shaderSource(shader, code);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error(
          `Shader compilation failed: ${gl.getShaderInfoLog(shader)}`
        );
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(`Shader link failed: ${gl.getProgramInfoLog(program)}`);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // Source is power-of-two, allowing filtering across the 360° seam in WebGL 1.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    if (gl.getError() !== gl.NO_ERROR) throw new Error('Texture upload failed');
    gl.uniform1i(gl.getUniformLocation(program, 'panorama'), 0);
    const yaw = gl.getUniformLocation(program, 'yaw');
    return {
      draw(angle: number) {
        if (gl.isContextLost()) throw new Error('WebGL context lost');
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform1f(yaw, angle);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
      dispose,
    };
  } catch (error) {
    console.warn('Panorama rotation: using static fallback', error);
    dispose();
    return null;
  }
}

/** No scheduled frames while offscreen, hidden, paused, or reduced-motion. */
export function startPanoramaMotion(
  canvas: HTMLCanvasElement,
  source: HTMLCanvasElement,
  target: Element,
  onReady: (ready: boolean) => void,
  initiallyHovered = false
) {
  canvas.setAttribute('data-motion-state', 'waiting');
  let paused = !initiallyHovered;
  let renderer: ReturnType<typeof createPanoramaRenderer> = null;
  let visible = false;
  let stopped = false;
  let disposed = false;
  let frame: number | null = null;
  let previous: number | null = null;
  let yaw = 0;
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cancel = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    previous = null;
  };
  function fail() {
    canvas.setAttribute('data-motion-state', 'fallback');
    stopped = true;
    cancel();
    onReady(false);
  }
  function tick(now: number) {
    frame = null;
    if (previous === null) previous = now;
    const elapsed = now - previous;
    if (elapsed >= FRAME_INTERVAL_MS) {
      // Do not jump across the panorama after a stalled frame or hidden tab.
      yaw = advanceRotation(yaw, Math.min(elapsed, 250));
      previous = now;
      try {
        renderer?.draw(yaw);
      } catch {
        fail();
        return;
      }
    }
    frame = requestAnimationFrame(tick);
  }
  function reconcile() {
    cancel();
    canvas.setAttribute('data-motion-state', 'paused');
    if (
      disposed ||
      stopped ||
      paused ||
      !visible ||
      document.hidden ||
      media.matches
    )
      return;
    if (!renderer) {
      try {
        renderer = createPanoramaRenderer(canvas, source);
        if (!renderer) {
          fail();
          return;
        }
        renderer.draw(yaw);
      } catch {
        fail();
        return;
      }
      onReady(true);
    }
    canvas.setAttribute('data-motion-state', 'running');
    frame = requestAnimationFrame(tick);
  }
  const observer =
    typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(entries => {
          visible = entries.some(entry => entry.isIntersecting);
          reconcile();
        });
  function enter(event: Event) {
    // Touch-generated compatibility mouse events must never start rotation.
    paused = (event as PointerEvent).pointerType !== 'mouse';
    reconcile();
  }
  function leave() {
    paused = true;
    reconcile();
  }
  target.addEventListener('pointerenter', enter);
  target.addEventListener('pointerleave', leave);
  target.addEventListener('pointercancel', leave);
  observer?.observe(target);
  document.addEventListener('visibilitychange', reconcile);
  media.addEventListener('change', reconcile);
  canvas.addEventListener('webglcontextlost', fail);
  return {
    dispose() {
      disposed = true;
      cancel();
      observer?.disconnect();
      target.removeEventListener('pointerenter', enter);
      target.removeEventListener('pointerleave', leave);
      target.removeEventListener('pointercancel', leave);
      document.removeEventListener('visibilitychange', reconcile);
      media.removeEventListener('change', reconcile);
      canvas.removeEventListener('webglcontextlost', fail);
      renderer?.dispose();
    },
  };
}
