// client/src/engine/tier/capability.js
// Detects the device's graphics ceiling so we can autopick a quality tier.
// Combines WebGPU support, GPU vendor/renderer string, memory, cores, and a
// 500ms micro-benchmark of fill-rate. Result feeds tierConfig.

const cache = { result: null };

const tryWebGPU = async () => {
  if (!navigator.gpu) return null;
  try { const a = await navigator.gpu.requestAdapter(); return a ? a.info || {} : null; }
  catch { return null; }
};

// Fragment-shader fill-rate benchmark. Renders a heavy quad ~30 frames and measures fps.
async function benchmarkFps() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  if (!gl) return 0;
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}');
  gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, `precision highp float;void main(){vec3 c=vec3(0.);for(int i=0;i<64;i++){c+=sin(gl_FragCoord.xyx*float(i)*0.01)*0.01;}gl_FragColor=vec4(c,1.);}`);
  gl.compileShader(fs);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  let frames = 0;
  const start = performance.now();
  while (performance.now() - start < 500) {
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.finish();
    frames++;
  }
  const elapsed = performance.now() - start;
  return Math.round((frames / elapsed) * 1000);
}

const isMobileUA = () => /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || '');

export async function detectCapability() {
  if (cache.result) return cache.result;

  const gpu = await tryWebGPU();
  const supportsWebGPU = !!gpu;
  const mem    = navigator.deviceMemory || 4;          // GB, defaults to 4 if unknown
  const cores  = navigator.hardwareConcurrency || 4;
  const mobile = isMobileUA();
  const dpr    = window.devicePixelRatio || 1;

  let fps = 0;
  try { fps = await benchmarkFps(); } catch { fps = 30; }

  // Tier scoring (0-100). Used to pick adaptive tier defaults.
  let score = 0;
  score += supportsWebGPU ? 30 : 0;
  score += Math.min(mem * 4, 24);          // up to 24 for >=6GB
  score += Math.min(cores * 2, 16);        // up to 16 for >=8 cores
  score += mobile ? -15 : 10;
  score += Math.min(fps / 4, 20);          // up to 20 for fast fill rate

  const tier =
    score >= 70 ? 'cinematic_high' :
    score >= 50 ? 'cinematic_mid'  :
    score >= 30 ? 'performance_high' :
                  'performance_low';

  cache.result = {
    supportsWebGPU, mobile, mem, cores, dpr, benchFps: fps, score,
    tier,                                  // adaptive default tier
    gpu: gpu?.description || gpu?.vendor || null
  };
  return cache.result;
}

export function getCachedCapability() { return cache.result; }
