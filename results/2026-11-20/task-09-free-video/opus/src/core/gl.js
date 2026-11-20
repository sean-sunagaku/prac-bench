// ─────────────────────────────────────────────────────────────
//  gl.js — 最小限の WebGL2 ヘルパー
//  シェーダのコンパイル、フレームバッファ、全画面三角形、uniform 自動設定
// ─────────────────────────────────────────────────────────────

export const VS_FULL = `#version 300 es
layout(location=0) in vec2 aPos;
out vec2 vUv;
void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.,1.); }`;

export function createGL(canvas) {
  const gl = canvas.getContext('webgl2', {
    antialias: false, alpha: false, depth: false, stencil: false,
    preserveDrawingBuffer: false, powerPreference: 'high-performance',
  });
  if (!gl) throw new Error('WebGL2 is not available');
  for (const e of ['EXT_color_buffer_float', 'EXT_float_blend', 'OES_texture_float_linear'])
    if (!gl.getExtension(e)) console.warn('missing extension', e);
  // 全画面を覆う 1 枚の三角形
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  gl.fullscreen = () => { gl.bindVertexArray(vao); gl.drawArrays(gl.TRIANGLES, 0, 3); };
  return gl;
}

function compileShader(gl, type, src, label) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    const lines = src.split('\n').map((l, i) => `${String(i + 1).padStart(4)}| ${l}`).join('\n');
    throw new Error(`[${label}] shader compile error:\n${log}\n${lines}`);
  }
  return s;
}

// uniform の型を調べておき、値を渡すだけで正しい gl.uniform* を呼べるようにする
export function program(gl, fs, vs = VS_FULL, label = 'program') {
  const p = gl.createProgram();
  gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER, vs, label + ':vs'));
  gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, fs, label + ':fs'));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`[${label}] link: ${gl.getProgramInfoLog(p)}`);
  const uniforms = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  let unit = 0;
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    const name = info.name.replace(/\[0\]$/, '');
    const loc = gl.getUniformLocation(p, info.name);
    const u = { loc, type: info.type, size: info.size };
    if (info.type === gl.SAMPLER_2D || info.type === gl.SAMPLER_3D) u.unit = unit++;
    uniforms[name] = u;
  }
  const T = gl;
  return {
    p, uniforms,
    use(vals = {}) {
      gl.useProgram(p);
      for (const k in vals) {
        const u = uniforms[k];
        if (!u) continue;
        const v = vals[k];
        switch (u.type) {
          case T.FLOAT: u.size > 1 ? gl.uniform1fv(u.loc, v) : gl.uniform1f(u.loc, v); break;
          case T.FLOAT_VEC2: gl.uniform2fv(u.loc, v); break;
          case T.FLOAT_VEC3: gl.uniform3fv(u.loc, v); break;
          case T.FLOAT_VEC4: gl.uniform4fv(u.loc, v); break;
          case T.INT: case T.BOOL: gl.uniform1i(u.loc, v); break;
          case T.FLOAT_MAT3: gl.uniformMatrix3fv(u.loc, false, v); break;
          case T.FLOAT_MAT4: gl.uniformMatrix4fv(u.loc, false, v); break;
          case T.SAMPLER_2D: case T.SAMPLER_3D: {
            gl.activeTexture(gl.TEXTURE0 + u.unit);
            gl.bindTexture(u.type === T.SAMPLER_3D ? gl.TEXTURE_3D : gl.TEXTURE_2D, v && v.tex ? v.tex : v);
            gl.uniform1i(u.loc, u.unit);
            break;
          }
        }
      }
      return this;
    },
  };
}

// 浮動小数点テクスチャ付きフレームバッファ
export function fbo(gl, w, h, opt = {}) {
  const internal = opt.internal || gl.RGBA16F;
  const format = opt.format || gl.RGBA;
  const type = opt.type || (internal === gl.RGBA32F || internal === gl.RG32F || internal === gl.R32F ? gl.FLOAT : internal === gl.RGBA8 ? gl.UNSIGNED_BYTE : gl.HALF_FLOAT);
  const filter = opt.filter || gl.LINEAR;
  const wrap = opt.wrap || gl.CLAMP_TO_EDGE;
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error('FBO incomplete ' + st);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return {
    tex, fb, w, h,
    bind() { gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, w, h); return this; },
    clear(r = 0, g = 0, b = 0, a = 1) { this.bind(); gl.clearColor(r, g, b, a); gl.clear(gl.COLOR_BUFFER_BIT); return this; },
  };
}

// ピンポン（シミュレーション用の 2 枚組）
export function pingpong(gl, w, h, opt) {
  const a = fbo(gl, w, h, opt), b = fbo(gl, w, h, opt);
  return {
    read: a, write: b, w, h,
    swap() { const t = this.read; this.read = this.write; this.write = t; },
  };
}

export function dataTexture(gl, w, h, data, opt = {}) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, opt.internal || gl.RGBA32F, w, h, 0, opt.format || gl.RGBA, opt.type || gl.FLOAT, data);
  const f = opt.filter || gl.NEAREST;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}
