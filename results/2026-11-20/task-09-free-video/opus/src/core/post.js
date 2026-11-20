// ─────────────────────────────────────────────────────────────
//  post.js — 光のにじみ（ブルーム）とフィルム仕上げ
//  HDR の線形な光の量 → ブルーム → AgX トーンマップ → 粒子感・周辺減光・文字合成
// ─────────────────────────────────────────────────────────────
import { program, fbo } from './gl.js';
import { HEADER, COMMON } from './glsl.js';

const DOWN = HEADER + `
in vec2 vUv; out vec4 o;
uniform sampler2D src; uniform vec2 texel; uniform float prefilter;
void main(){
  // Jimenez (2014) の 13 タップ・ダウンサンプル：ちらつきの少ないブルームの土台
  vec2 t = texel;
  vec3 a=texture(src,vUv+t*vec2(-2, 2)).rgb, b=texture(src,vUv+t*vec2(0, 2)).rgb, c=texture(src,vUv+t*vec2(2, 2)).rgb;
  vec3 d=texture(src,vUv+t*vec2(-2, 0)).rgb, e=texture(src,vUv).rgb,               f=texture(src,vUv+t*vec2(2, 0)).rgb;
  vec3 g=texture(src,vUv+t*vec2(-2,-2)).rgb, h=texture(src,vUv+t*vec2(0,-2)).rgb, i=texture(src,vUv+t*vec2(2,-2)).rgb;
  vec3 j=texture(src,vUv+t*vec2(-1, 1)).rgb, k=texture(src,vUv+t*vec2(1, 1)).rgb;
  vec3 l=texture(src,vUv+t*vec2(-1,-1)).rgb, m=texture(src,vUv+t*vec2(1,-1)).rgb;
  vec3 col = e*0.125 + (a+c+g+i)*0.03125 + (b+d+f+h)*0.0625 + (j+k+l+m)*0.125;
  if(prefilter>0.5){ // 極端な輝点を抑えて、きらめきのちらつきを防ぐ
    float lum = dot(col, vec3(.2126,.7152,.0722));
    col *= 1./(1.+lum*0.02);
  }
  o = vec4(max(col,0.),1);
}`;

const UP = HEADER + `
in vec2 vUv; out vec4 o;
uniform sampler2D src; uniform vec2 texel; uniform float radius;
void main(){
  vec2 t = texel*radius;
  vec3 c = texture(src,vUv).rgb*4.;
  c += (texture(src,vUv+vec2(-t.x,0)).rgb + texture(src,vUv+vec2(t.x,0)).rgb + texture(src,vUv+vec2(0,-t.y)).rgb + texture(src,vUv+vec2(0,t.y)).rgb)*2.;
  c += texture(src,vUv+vec2(-t.x,-t.y)).rgb + texture(src,vUv+vec2(t.x,-t.y)).rgb + texture(src,vUv+vec2(-t.x,t.y)).rgb + texture(src,vUv+vec2(t.x,t.y)).rgb;
  o = vec4(c/16.,1);
}`;

const COMPOSITE = HEADER + COMMON + `
in vec2 vUv; out vec4 o;
uniform sampler2D hdr, bloom, textTex;
uniform vec2 res;
uniform float exposure, bloomStrength, contrast, saturation, vignette, grain, aberration, flash, fade, frame, textGlow;
uniform vec3 tint;

vec3 agxContrast(vec3 x){ vec3 x2=x*x, x4=x2*x2; return 15.5*x4*x2 - 40.14*x4*x + 31.96*x4 - 6.868*x2*x + 0.4298*x2 + 0.1191*x - 0.00232; }
vec3 agx(vec3 v){
  const mat3 M = mat3(0.842479062253094,0.0423282422610123,0.0423756549057051, 0.0784335999999992,0.878468636469772,0.0784336, 0.0792237451477643,0.0791661274605434,0.879142973793104);
  const mat3 Mi = mat3(1.19687900512017,-0.0528968517574562,-0.0529716355144438, -0.0980208811401368,1.15190312990417,-0.0980434501171241, -0.0990297440797205,-0.0989611768448433,1.15107367264116);
  const float lo=-12.47393, hi=4.026069;
  v = M*v; v = clamp(log2(max(v,1e-10)), lo, hi); v = (v-lo)/(hi-lo);
  v = agxContrast(v);
  float l = dot(v, vec3(.2126,.7152,.0722));
  v = pow(max(v,0.), vec3(contrast)); v = l + saturation*(v-l);
  return Mi*v;
}
void main(){
  vec2 uv = vUv;
  vec2 d = uv-.5;
  // 色収差：画面の端ほど RGB がわずかにずれる（レンズの再現）
  vec2 off = d*dot(d,d)*aberration*16.0/res;
  vec3 col;
  col.r = texture(hdr, uv-off).r;
  col.g = texture(hdr, uv).g;
  col.b = texture(hdr, uv+off).b;
  col += texture(bloom, uv).rgb*bloomStrength;
  col = col*exposure*tint + flash;
  col = agx(col);
  // 周辺減光
  float v = 1. - vignette*smoothstep(.25, 1.1, length(d*vec2(1.25,1.)));
  col *= v;
  // 文字（アルファ付き）を合成。少しだけ光らせる
  vec4 tx = texture(textTex, vec2(uv.x, 1.-uv.y));
  col = col*(1.-tx.a) + tx.rgb;
  col += textGlow*texture(textTex, vec2(uv.x,1.-uv.y), 3.5).a*vec3(1.,.85,.7)*.0;
  col *= fade;
  // フィルムグレイン＋ディザ（グラデーションの帯を防ぐ）
  vec2 p = gl_FragCoord.xy + frame*vec2(37.,17.);
  float n1 = hash21(p), n2 = hash21(p+vec2(91.7,13.3));
  float l = dot(col, vec3(.299,.587,.114));
  col += (n1+n2-1.)*(grain*(1.-l)*sqrt(max(l,0.0))*1.6 + 1./255.);
  o = vec4(clamp(col,0.,1.),1.);
}`;

export function createPost(gl, W, H) {
  const down = program(gl, DOWN, undefined, 'bloom-down');
  const up = program(gl, UP, undefined, 'bloom-up');
  const comp = program(gl, COMPOSITE, undefined, 'composite');
  const mips = [];
  let w = W >> 1, h = H >> 1;
  for (let i = 0; i < 7 && w > 8 && h > 8; i++) { mips.push(fbo(gl, w, h)); w >>= 1; h >>= 1; }

  function bloom(srcTex, sw, sh) {
    gl.disable(gl.BLEND);
    let src = srcTex, tw = sw, th = sh;
    mips.forEach((m, i) => {
      m.bind();
      down.use({ src, texel: [1 / tw, 1 / th], prefilter: i === 0 ? 1 : 0 });
      gl.fullscreen();
      src = m.tex; tw = m.w; th = m.h;
    });
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = mips.length - 1; i > 0; i--) {
      const s = mips[i], d = mips[i - 1];
      d.bind();
      up.use({ src: s.tex, texel: [1 / s.w, 1 / s.h], radius: 1.0 });
      gl.fullscreen();
    }
    gl.disable(gl.BLEND);
    return mips[0].tex;
  }

  function composite(hdrTex, textTex, g, frame, vw = W, vh = H) {
    const bl = bloom(hdrTex, W, H);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, vw, vh);
    comp.use({
      hdr: hdrTex, bloom: bl, textTex, res: [W, H],
      exposure: g.exposure ?? 1, bloomStrength: g.bloom ?? 0.06, contrast: g.contrast ?? 1.15,
      saturation: g.saturation ?? 1.1, vignette: g.vignette ?? 0.35, grain: g.grain ?? 0.035,
      aberration: g.aberration ?? 1.0, flash: g.flash ?? 0, fade: g.fade ?? 1, frame,
      textGlow: 0, tint: g.tint ?? [1, 1, 1],
    });
    gl.fullscreen();
  }
  return { composite, bloom };
}
