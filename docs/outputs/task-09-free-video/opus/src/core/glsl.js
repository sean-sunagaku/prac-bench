// ─────────────────────────────────────────────────────────────
//  glsl.js — シェーダ共通部品（ハッシュ、ノイズ、色、トーンマップ）
// ─────────────────────────────────────────────────────────────

export const HEADER = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
`;

export const COMMON = `
#define PI 3.14159265359
#define TAU 6.28318530718
float saturate(float x){ return clamp(x,0.,1.); }
vec3  saturate(vec3 x){ return clamp(x,0.,1.); }
mat2  rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }

// 整数ハッシュ（GPU 間で安定）
uint  hashu(uint x){ x ^= x>>16; x *= 0x7feb352dU; x ^= x>>15; x *= 0x846ca68bU; x ^= x>>16; return x; }
float hash11(float p){ return float(hashu(floatBitsToUint(p)))/4294967295.; }
float hash21(vec2 p){ uvec2 q = uvec2(ivec2(floor(p))) ; return float(hashu(q.x*1597334677U ^ hashu(q.y)))/4294967295.; }
vec2  hash22(vec2 p){ uvec2 q = uvec2(ivec2(floor(p))); uint h = hashu(q.x*1597334677U ^ hashu(q.y)); return vec2(float(h), float(hashu(h)))/4294967295.; }
float hash31(vec3 p){ uvec3 q = uvec3(ivec3(floor(p))); return float(hashu(q.x*1597334677U ^ hashu(q.y*3812015801U ^ hashu(q.z))))/4294967295.; }

// 値ノイズ（解析的な微分つき）— 地形などで使う
vec3 noised(vec2 x){
  vec2 p = floor(x), w = fract(x);
  vec2 u = w*w*w*(w*(w*6.-15.)+10.);
  vec2 du = 30.*w*w*(w*(w-2.)+1.);
  float a = hash21(p), b = hash21(p+vec2(1,0)), c = hash21(p+vec2(0,1)), d = hash21(p+vec2(1,1));
  float k0=a, k1=b-a, k2=c-a, k4=a-b-c+d;
  return vec3(-1.+2.*(k0+k1*u.x+k2*u.y+k4*u.x*u.y), 2.*du*vec2(k1+k4*u.y, k2+k4*u.x));
}
float noise(vec2 x){ return noised(x).x; }
float noise3(vec3 x){
  vec3 p = floor(x), w = fract(x);
  vec3 u = w*w*(3.-2.*w);
  float n000=hash31(p), n100=hash31(p+vec3(1,0,0)), n010=hash31(p+vec3(0,1,0)), n110=hash31(p+vec3(1,1,0));
  float n001=hash31(p+vec3(0,0,1)), n101=hash31(p+vec3(1,0,1)), n011=hash31(p+vec3(0,1,1)), n111=hash31(p+vec3(1,1,1));
  return -1.+2.*mix(mix(mix(n000,n100,u.x),mix(n010,n110,u.x),u.y), mix(mix(n001,n101,u.x),mix(n011,n111,u.x),u.y), u.z);
}
float fbm3(vec3 p){ float f=0., a=.5; for(int i=0;i<5;i++){ f+=a*noise3(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=.5; } return f; }

// 黒体放射の近似色（恒星や白熱の表現に）
vec3 blackbody(float t){ // t: 1000〜12000 K
  t = clamp(t,1000.,40000.)/100.;
  vec3 c;
  c.r = t<=66. ? 1. : clamp(1.292936*pow(t-60.,-0.1332047592),0.,1.);
  c.g = t<=66. ? clamp(0.3900815788*log(t)-0.6318414438,0.,1.) : clamp(1.129890861*pow(t-60.,-0.0755148492),0.,1.);
  c.b = t>=66. ? 1. : (t<=19. ? 0. : clamp(0.5432067891*log(t-10.)-1.19625408914,0.,1.));
  return pow(c, vec3(2.2));
}
// Inigo Quilez の余弦パレット
vec3 pal(float t, vec3 a, vec3 b, vec3 c, vec3 d){ return a + b*cos(TAU*(c*t+d)); }
`;
