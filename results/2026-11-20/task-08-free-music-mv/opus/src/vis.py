"""
映像エンジン（moderngl / オフスクリーン描画）。
  - 線（光るセグメント、オシロスコープ用）
  - 点（パーティクル・リング・四角）
  - 文字（SDF フォントアトラス）
  - 塗り（三角形）
  - 背景シェーダー
  - ポスト処理（ブルーム、トーンマップ、色収差、グレイン、フラッシュ）
"""
import glob
import os

import moderngl
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import distance_transform_edt

W, H = 1920, 1080
CACHE = "/tmp/qed/build/atlas"
os.makedirs(CACHE, exist_ok=True)


def _find(pattern):
    g = glob.glob(pattern)
    return g[0] if g else None


FONT_FILES = {
    "mincho": ("/System/Library/Fonts/ヒラギノ明朝 ProN.ttc", 2),
    "mincho_l": ("/System/Library/Fonts/ヒラギノ明朝 ProN.ttc", 0),
    "midashi": (_find("/System/Library/AssetsV2/*/*/AssetData/ToppanBunkyuMidashiMinchoStdN-ExtraBold.otf")
                or _find("/System/Library/AssetsV2/PreinstalledAssetsV2/InstallWithOs/*/*/AssetData/ToppanBunkyuMidashiMinchoStdN-ExtraBold.otf"), 0),
    "gothic": ("/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc", 0),
    "gothic_l": ("/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc", 0),
    "mono": ("/System/Library/Fonts/Menlo.ttc", 0),
    "stix": ("/System/Library/Fonts/Supplemental/STIXGeneralItalic.otf", 0),
    "didot": ("/System/Library/Fonts/Supplemental/Didot.ttc", 2),
}

# ---------------------------------------------------------------------------
# SDF フォントアトラス
# ---------------------------------------------------------------------------
GLYPH_PX = 84
SPREAD = 10
ATLAS_W, ATLAS_H = 4096, 8192


class Atlas:
    def __init__(self, charsets):
        """charsets: {font: set(chars)}"""
        self.glyphs = {}        # (font, ch) -> dict(uv, plane, adv)
        key = str(sorted((f, "".join(sorted(c))) for f, c in charsets.items()))
        import hashlib
        h = hashlib.sha1(key.encode()).hexdigest()[:12]
        p_img = f"{CACHE}/atlas_{h}.npy"
        p_meta = f"{CACHE}/atlas_{h}.json"
        if os.path.exists(p_img) and os.path.exists(p_meta):
            import json
            self.img = np.load(p_img)                     # 自前で生成したキャッシュ（pickle 不使用）
            meta = json.load(open(p_meta, encoding="utf-8"))
            self.glyphs = {tuple(k.split("\t", 1)): v for k, v in meta.items()}
            return
        img = np.zeros((ATLAS_H, ATLAS_W), np.uint8)
        x, y, row_h = 0, 0, 0
        for font, chars in charsets.items():
            path, idx = FONT_FILES[font]
            F = ImageFont.truetype(path, GLYPH_PX, index=idx)
            for ch in sorted(chars):
                if ch in (" ", "　"):
                    adv = F.getlength(ch) / GLYPH_PX
                    self.glyphs[(font, ch)] = dict(uv=None, plane=None, adv=adv)
                    continue
                bbox = F.getbbox(ch, anchor="ls")
                adv = F.getlength(ch) / GLYPH_PX
                if bbox is None or bbox[2] <= bbox[0]:
                    self.glyphs[(font, ch)] = dict(uv=None, plane=None, adv=adv)
                    continue
                gw = bbox[2] - bbox[0] + 2 * SPREAD
                gh = bbox[3] - bbox[1] + 2 * SPREAD
                canvas = Image.new("L", (gw * 2, gh * 2), 0)
                d = ImageDraw.Draw(canvas)
                # 2倍解像度で描いて SDF を作り、縮小
                F2 = ImageFont.truetype(path, GLYPH_PX * 2, index=idx)
                d.text((-bbox[0] * 2 + SPREAD * 2, -bbox[1] * 2 + SPREAD * 2), ch, font=F2, fill=255, anchor="ls")
                m = np.array(canvas) > 127
                inside = distance_transform_edt(m)
                outside = distance_transform_edt(~m)
                sdf = (inside - outside) / (SPREAD * 2)
                sdf = np.clip(sdf * 0.5 + 0.5, 0, 1)
                sdf = np.array(Image.fromarray((sdf * 255).astype(np.uint8)).resize((gw, gh), Image.BILINEAR))
                if x + gw > ATLAS_W:
                    x = 0
                    y += row_h + 2
                    row_h = 0
                if y + gh > ATLAS_H:
                    raise RuntimeError("atlas full")
                img[y:y + gh, x:x + gw] = sdf
                uv = (x / ATLAS_W, y / ATLAS_H, (x + gw) / ATLAS_W, (y + gh) / ATLAS_H)
                plane = ((bbox[0] - SPREAD) / GLYPH_PX, (bbox[1] - SPREAD) / GLYPH_PX,
                         (bbox[2] + SPREAD) / GLYPH_PX, (bbox[3] + SPREAD) / GLYPH_PX)
                self.glyphs[(font, ch)] = dict(uv=uv, plane=plane, adv=adv)
                x += gw + 2
                row_h = max(row_h, gh)
        self.img = img
        import json
        np.save(p_img, img)
        json.dump({f"{k[0]}\t{k[1]}": v for k, v in self.glyphs.items()}, open(p_meta, "w", encoding="utf-8"),
                  ensure_ascii=False)

    def measure(self, font, text, size, tracking=0.0):
        w = 0.0
        for ch in text:
            g = self.glyphs.get((font, ch))
            adv = g["adv"] if g else 1.0
            w += (adv + tracking) * size
        return w - tracking * size if text else 0.0

    def layout(self, font, text, x, y, size, align="left", tracking=0.0):
        """各文字の (ch, x, y, size) を返す。y はベースライン。"""
        total = self.measure(font, text, size, tracking)
        if align == "center":
            x -= total / 2
        elif align == "right":
            x -= total
        out = []
        cx = x
        for ch in text:
            g = self.glyphs.get((font, ch))
            adv = g["adv"] if g else 1.0
            out.append((ch, cx, y, size, adv * size))
            cx += (adv + tracking) * size
        return out


# ---------------------------------------------------------------------------
# シェーダー
# ---------------------------------------------------------------------------
VS_QUAD = """
#version 410
in vec2 in_pos;
out vec2 v_uv;
void main(){ v_uv = in_pos*0.5+0.5; gl_Position = vec4(in_pos,0,1); }
"""

LINE_VS = """
#version 410
in vec2 in_quad;
in vec4 in_seg;
in vec4 in_col;
in vec2 in_wg;
uniform vec2 u_res;
uniform mat3 u_cam;
out vec2 v_local; out float v_len; out vec4 v_col; out vec2 v_wg;
void main(){
  vec2 p0 = (u_cam * vec3(in_seg.xy,1.0)).xy;
  vec2 p1 = (u_cam * vec3(in_seg.zw,1.0)).xy;
  float sc = length(vec2(u_cam[0][0], u_cam[0][1]));
  vec2 d = p1 - p0; float L = length(d);
  vec2 dir = L > 1e-4 ? d / L : vec2(1.0,0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float w = in_wg.x * sc; float g = max(in_wg.y * sc, 0.01);
  float pad = w + g * 2.2 + 1.5;
  float lx = mix(-pad, L + pad, in_quad.x*0.5+0.5);
  float ly = in_quad.y * pad;
  vec2 pos = p0 + dir * lx + nrm * ly;
  v_local = vec2(lx, ly); v_len = L; v_col = in_col; v_wg = vec2(w, g);
  vec2 ndc = (pos / u_res) * 2.0 - 1.0; ndc.y = -ndc.y;
  gl_Position = vec4(ndc, 0.0, 1.0);
}
"""
LINE_FS = """
#version 410
in vec2 v_local; in float v_len; in vec4 v_col; in vec2 v_wg;
out vec4 f;
void main(){
  float x = clamp(v_local.x, 0.0, v_len);
  float d = length(vec2(v_local.x - x, v_local.y));
  float core = 1.0 - smoothstep(v_wg.x - 0.8, v_wg.x + 0.8, d);
  float glow = exp(-d*d/(v_wg.y*v_wg.y)) * 0.55;
  float a = (core + glow) * v_col.a;
  f = vec4(v_col.rgb * a, 0.0);
}
"""

POINT_VS = """
#version 410
in vec2 in_quad;
in vec4 in_p;      // x, y, size, rot
in vec4 in_col;    // rgb, alpha
in vec2 in_shape;  // shape, param
uniform vec2 u_res;
uniform mat3 u_cam;
out vec2 v_q; out vec4 v_col; out vec2 v_shape; out float v_size;
void main(){
  vec2 c = (u_cam * vec3(in_p.xy,1.0)).xy;
  float sc = length(vec2(u_cam[0][0], u_cam[0][1]));
  float s = in_p.z * sc;
  float cr = cos(in_p.w), sr = sin(in_p.w);
  vec2 q = in_quad;
  vec2 rq = vec2(q.x*cr - q.y*sr, q.x*sr + q.y*cr);
  vec2 pos = c + rq * s;
  v_q = q; v_col = in_col; v_shape = in_shape; v_size = s;
  vec2 ndc = (pos / u_res) * 2.0 - 1.0; ndc.y = -ndc.y;
  gl_Position = vec4(ndc, 0.0, 1.0);
}
"""
POINT_FS = """
#version 410
in vec2 v_q; in vec4 v_col; in vec2 v_shape; in float v_size;
out vec4 f;
void main(){
  float r = length(v_q);
  float a;
  int sh = int(v_shape.x + 0.5);
  float px = 1.0 / max(v_size, 1.0);
  if (sh == 0) {            // ガウスの光点
    a = exp(-r*r*6.0);
  } else if (sh == 1) {     // リング（param = 太さ 0..1）
    float t = max(v_shape.y, px*1.5);
    float d = abs(r - (1.0 - t*1.2));
    a = (1.0 - smoothstep(t*0.5 - px, t*0.5 + px, d)) + exp(-d*d/(t*t*1.5))*0.35;
    a *= 1.0 - smoothstep(0.98, 1.0, r);
  } else if (sh == 2) {     // 角丸四角
    vec2 d = abs(v_q) - vec2(1.0 - v_shape.y);
    float sd = length(max(d, 0.0)) - v_shape.y;
    a = 1.0 - smoothstep(-px*1.5, px*1.5, sd);
  } else {                  // 柔らかい円
    a = 1.0 - smoothstep(1.0 - px*2.0 - v_shape.y, 1.0, r);
  }
  f = vec4(v_col.rgb * a * v_col.a, 0.0);
}
"""

TEXT_VS = """
#version 410
in vec2 in_quad;
in vec4 in_rect;   // x0 y0 x1 y1 (px)
in vec4 in_uv;
in vec4 in_col;    // rgb, alpha
in vec4 in_prm;    // glow, glow_r, glow_g, glow_b  ... glow color は in_gcol
in vec4 in_gcol;   // glow rgb, softness
uniform vec2 u_res;
uniform mat3 u_cam;
out vec2 v_uv; out vec4 v_col; out vec4 v_prm; out vec4 v_gcol; out float v_scale;
void main(){
  vec2 t = in_quad*0.5+0.5;
  vec2 p = mix(in_rect.xy, in_rect.zw, t);
  p = (u_cam * vec3(p,1.0)).xy;
  v_uv = mix(in_uv.xy, in_uv.zw, t);
  v_col = in_col; v_prm = in_prm; v_gcol = in_gcol;
  float sc = length(vec2(u_cam[0][0], u_cam[0][1]));
  v_scale = (in_rect.w - in_rect.y) * sc;
  vec2 ndc = (p / u_res) * 2.0 - 1.0; ndc.y = -ndc.y;
  gl_Position = vec4(ndc, 0.0, 1.0);
}
"""
TEXT_FS = """
#version 410
uniform sampler2D u_atlas;
in vec2 v_uv; in vec4 v_col; in vec4 v_prm; in vec4 v_gcol; in float v_scale;
out vec4 f;
void main(){
  float d = texture(u_atlas, v_uv).r;
  float w = clamp(fwidth(d) * 0.75, 0.002, 0.25) + v_gcol.a;
  float a = smoothstep(0.5 - w, 0.5 + w, d) * v_col.a;
  float g = smoothstep(0.05, 0.5, d) * v_prm.x * v_col.a;
  float halo = smoothstep(0.25, 0.5, d) * v_prm.y * v_col.a;   // 暗い縁取り（可読性）
  vec3 col = v_col.rgb * a + v_gcol.rgb * g * g;
  f = vec4(col, max(a, halo));
}
"""

FILL_VS = """
#version 410
in vec2 in_pos;
in vec4 in_col;
uniform vec2 u_res;
uniform mat3 u_cam;
out vec4 v_col;
void main(){
  vec2 p = (u_cam * vec3(in_pos,1.0)).xy;
  v_col = in_col;
  vec2 ndc = (p / u_res) * 2.0 - 1.0; ndc.y = -ndc.y;
  gl_Position = vec4(ndc, 0.0, 1.0);
}
"""
FILL_FS = """
#version 410
in vec4 v_col; out vec4 f;
void main(){ f = vec4(v_col.rgb * v_col.a, v_col.a); }
"""

BG_FS = """
#version 410
in vec2 v_uv; out vec4 f;
uniform vec2 u_res;
uniform float u_time, u_beat, u_kick, u_energy;
uniform vec3 u_col1, u_col2, u_base;
uniform float u_grid, u_rays, u_tunnel, u_nebula, u_interf, u_stars, u_vbar;
uniform vec4 u_ifreq;       // 干渉縞の波数（和音）
uniform vec2 u_center;      // px
uniform float u_zoom, u_rot, u_tunnel_speed, u_bright;
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
void main(){
  vec2 px = vec2(v_uv.x, 1.0 - v_uv.y) * u_res;
  vec2 p = (px - u_center) / u_res.y;           // 中心基準、高さ1
  float cr = cos(u_rot), sr = sin(u_rot);
  p = mat2(cr, -sr, sr, cr) * p / u_zoom;
  vec3 col = u_base;
  float r = length(p);
  float ang = atan(p.y, p.x);
  // 方眼紙
  if (u_grid > 0.001) {
    vec2 g = px / 40.0;
    vec2 gf = abs(fract(g - 0.5) - 0.5) / fwidth(g);
    float fine = 1.0 - min(min(gf.x, gf.y), 1.0);
    vec2 g2 = px / 200.0;
    vec2 gf2 = abs(fract(g2 - 0.5) - 0.5) / fwidth(g2);
    float major = 1.0 - min(min(gf2.x, gf2.y), 1.0);
    col += vec3(0.25, 0.42, 0.55) * (fine * 0.05 + major * 0.09) * u_grid;
  }
  // 星雲（やわらかい色の雲）
  if (u_nebula > 0.001) {
    float n = fbm(p * 1.6 + vec2(u_time * 0.03, -u_time * 0.02));
    float n2 = fbm(p * 2.7 - vec2(u_time * 0.025, u_time * 0.04) + 7.0);
    vec3 c = mix(u_col1, u_col2, smoothstep(0.3, 0.8, n2));
    col += c * pow(n, 2.2) * 0.55 * u_nebula * (0.85 + 0.3 * u_kick);
  }
  // 放射状の光
  if (u_rays > 0.001) {
    float k = 24.0;
    float rays = pow(0.5 + 0.5 * cos(ang * k + u_time * 0.4), 6.0) * 0.6
               + pow(0.5 + 0.5 * cos(ang * 9.0 - u_time * 0.25), 10.0) * 0.6;
    float fall = exp(-r * 1.4) * smoothstep(0.0, 0.25, r);
    col += mix(u_col1, u_col2, 0.5 + 0.5 * sin(ang * 3.0)) * rays * fall * u_rays * (0.6 + 0.8 * u_kick);
  }
  // リングのトンネル（拍で前進）
  if (u_tunnel > 0.001) {
    float z = 0.35 / max(r, 0.02);
    float s = z + u_tunnel_speed;
    float ring = pow(0.5 + 0.5 * cos(s * 6.2831), 24.0);
    float seg = 0.6 + 0.4 * step(0.5, fract(ang / 6.2831 * 24.0 + floor(s) * 0.5));
    float fade = smoothstep(0.02, 0.2, r) * exp(-z * 0.08);
    col += mix(u_col2, u_col1, fract(floor(s) * 0.37)) * ring * seg * fade * u_tunnel * 0.9;
  }
  // 干渉縞（和音の重なり）
  if (u_interf > 0.001) {
    vec2 c1 = vec2(-0.28, 0.0), c2 = vec2(0.28, 0.0), c3 = vec2(0.0, 0.3), c4 = vec2(0.0, -0.3);
    float w = cos(length(p - c1) * u_ifreq.x - u_time * 3.0) + cos(length(p - c2) * u_ifreq.y - u_time * 3.0)
            + cos(length(p - c3) * u_ifreq.z - u_time * 3.0) + cos(length(p - c4) * u_ifreq.w - u_time * 3.0);
    w = w / 4.0;
    float lines = pow(abs(w), 3.0);
    col += mix(u_col1, u_col2, 0.5 + 0.5 * w) * lines * u_interf * 0.8 * exp(-r * 0.8);
  }
  // 星（0 と 1 の粒）
  if (u_stars > 0.001) {
    vec2 sp = px / 6.0;
    vec2 id = floor(sp);
    float h = hash(id);
    float tw = 0.5 + 0.5 * sin(u_time * (1.0 + h * 3.0) + h * 40.0);
    float star = step(0.996, h) * tw;
    col += vec3(0.7, 0.85, 1.0) * star * u_stars;
  }
  // 中央の淡い光
  col += u_col1 * exp(-r * r * 6.0) * 0.12 * u_bright * (1.0 + u_kick);
  // 縦のスキャンライン（ほのかに）
  if (u_vbar > 0.001) {
    col *= 1.0 - u_vbar * 0.08 * (0.5 + 0.5 * sin(px.y * 3.14159));
  }
  f = vec4(col, 1.0);
}
"""

DOWN_FS = """
#version 410
in vec2 v_uv; out vec4 f;
uniform sampler2D u_src; uniform vec2 u_texel; uniform float u_thresh;
vec3 tap(vec2 o){ return texture(u_src, v_uv + o * u_texel).rgb; }
void main(){
  vec3 a = tap(vec2(-2,-2)), b = tap(vec2(0,-2)), c = tap(vec2(2,-2));
  vec3 d = tap(vec2(-1,-1)), e = tap(vec2(1,-1));
  vec3 g = tap(vec2(-2,0)), h = tap(vec2(0,0)), i = tap(vec2(2,0));
  vec3 j = tap(vec2(-1,1)), k = tap(vec2(1,1));
  vec3 l = tap(vec2(-2,2)), m = tap(vec2(0,2)), n = tap(vec2(2,2));
  vec3 col = (d+e+j+k)*0.125 + (a+c+l+n)*0.03125 + (b+g+i+m)*0.0625 + h*0.125;
  if (u_thresh > 0.0) {
    float br = max(col.r, max(col.g, col.b));
    float soft = clamp(br - u_thresh + 0.5, 0.0, 1.0);
    soft = soft * soft * 0.5;
    float contrib = max(soft, br - u_thresh) / max(br, 1e-4);
    col *= contrib;
  }
  f = vec4(col, 1.0);
}
"""
UP_FS = """
#version 410
in vec2 v_uv; out vec4 f;
uniform sampler2D u_src; uniform vec2 u_texel; uniform float u_radius;
void main(){
  vec2 o = u_texel * u_radius;
  vec3 col = texture(u_src, v_uv + vec2(-o.x, -o.y)).rgb + texture(u_src, v_uv + vec2(0, -o.y)).rgb * 2.0
           + texture(u_src, v_uv + vec2(o.x, -o.y)).rgb + texture(u_src, v_uv + vec2(-o.x, 0)).rgb * 2.0
           + texture(u_src, v_uv).rgb * 4.0 + texture(u_src, v_uv + vec2(o.x, 0)).rgb * 2.0
           + texture(u_src, v_uv + vec2(-o.x, o.y)).rgb + texture(u_src, v_uv + vec2(0, o.y)).rgb * 2.0
           + texture(u_src, v_uv + vec2(o.x, o.y)).rgb;
  f = vec4(col / 16.0, 1.0);
}
"""
FINAL_FS = """
#version 410
in vec2 v_uv; out vec4 f;
uniform sampler2D u_scene, u_bloom;
uniform vec2 u_res;
uniform float u_bloom_amt, u_exposure, u_flash, u_ca, u_grain, u_time, u_vignette, u_fade, u_sat;
uniform vec3 u_flash_col;
float hash(vec2 p){ p = fract(p*vec2(443.897, 441.423)); p += dot(p, p.yx+19.19); return fract((p.x+p.y)*p.x); }
vec3 aces(vec3 x){ const float a=2.51, b=0.03, c=2.43, d=0.59, e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0); }
void main(){
  vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
  vec2 c = uv - 0.5;
  vec2 off = c * u_ca * 0.02;
  vec3 col;
  col.r = texture(u_scene, uv + off).r;
  col.g = texture(u_scene, uv).g;
  col.b = texture(u_scene, uv - off).b;
  col += texture(u_bloom, uv).rgb * u_bloom_amt;
  col *= u_exposure;
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, u_sat);
  col = aces(col);
  col = mix(col, u_flash_col, clamp(u_flash, 0.0, 1.0));
  float vig = 1.0 - u_vignette * dot(c, c) * 1.8;
  col *= clamp(vig, 0.0, 1.0);
  col = pow(col, vec3(1.0/2.2));
  col += (hash(uv * u_res + fract(u_time) * 97.0) - 0.5) * u_grain;
  col *= u_fade;
  f = vec4(clamp(col, 0.0, 1.0), 1.0);
}
"""


class Engine:
    MAX_LINES = 400000
    MAX_POINTS = 200000
    MAX_TEXT = 20000
    MAX_FILL = 600000

    def __init__(self, atlas):
        self.ctx = moderngl.create_standalone_context(require=410)
        ctx = self.ctx
        self.res = np.array([W, H], np.float32)
        quad = np.array([-1, -1, 1, -1, -1, 1, 1, 1], np.float32)
        self.quad_vbo = ctx.buffer(quad.tobytes())
        fs_tri = np.array([-1, -1, 3, -1, -1, 3], np.float32)
        self.tri_vbo = ctx.buffer(fs_tri.tobytes())

        self.p_line = ctx.program(vertex_shader=LINE_VS, fragment_shader=LINE_FS)
        self.p_point = ctx.program(vertex_shader=POINT_VS, fragment_shader=POINT_FS)
        self.p_text = ctx.program(vertex_shader=TEXT_VS, fragment_shader=TEXT_FS)
        self.p_fill = ctx.program(vertex_shader=FILL_VS, fragment_shader=FILL_FS)
        self.p_bg = ctx.program(vertex_shader=VS_QUAD, fragment_shader=BG_FS)
        self.p_down = ctx.program(vertex_shader=VS_QUAD, fragment_shader=DOWN_FS)
        self.p_up = ctx.program(vertex_shader=VS_QUAD, fragment_shader=UP_FS)
        self.p_final = ctx.program(vertex_shader=VS_QUAD, fragment_shader=FINAL_FS)

        self.line_buf = ctx.buffer(reserve=self.MAX_LINES * 40)
        self.point_buf = ctx.buffer(reserve=self.MAX_POINTS * 40)
        self.text_buf = ctx.buffer(reserve=self.MAX_TEXT * 80)
        self.fill_buf = ctx.buffer(reserve=self.MAX_FILL * 24)
        self.vao_line = ctx.vertex_array(self.p_line, [(self.quad_vbo, "2f", "in_quad"),
                                                       (self.line_buf, "4f 4f 2f/i", "in_seg", "in_col", "in_wg")])
        self.vao_point = ctx.vertex_array(self.p_point, [(self.quad_vbo, "2f", "in_quad"),
                                                         (self.point_buf, "4f 4f 2f/i", "in_p", "in_col", "in_shape")])
        self.vao_text = ctx.vertex_array(self.p_text, [(self.quad_vbo, "2f", "in_quad"),
                                                       (self.text_buf, "4f 4f 4f 4f 4f/i", "in_rect", "in_uv", "in_col", "in_prm", "in_gcol")])
        self.vao_fill = ctx.vertex_array(self.p_fill, [(self.fill_buf, "2f 4f", "in_pos", "in_col")])
        self.vao_bg = ctx.vertex_array(self.p_bg, [(self.tri_vbo, "2f", "in_pos")])
        self.vao_down = ctx.vertex_array(self.p_down, [(self.tri_vbo, "2f", "in_pos")])
        self.vao_up = ctx.vertex_array(self.p_up, [(self.tri_vbo, "2f", "in_pos")])
        self.vao_final = ctx.vertex_array(self.p_final, [(self.tri_vbo, "2f", "in_pos")])

        self.atlas = atlas
        self.atlas_tex = ctx.texture((ATLAS_W, ATLAS_H), 1, atlas.img.tobytes())
        self.atlas_tex.filter = (moderngl.LINEAR_MIPMAP_LINEAR, moderngl.LINEAR)
        self.atlas_tex.build_mipmaps()

        self.scene_tex = ctx.texture((W, H), 4, dtype="f2")
        self.scene_tex.filter = (moderngl.LINEAR, moderngl.LINEAR)
        self.scene_tex.repeat_x = self.scene_tex.repeat_y = False
        self.scene_fbo = ctx.framebuffer(color_attachments=[self.scene_tex])
        self.mips = []
        w, h = W // 2, H // 2
        for i in range(6):
            t = ctx.texture((w, h), 4, dtype="f2")
            t.filter = (moderngl.LINEAR, moderngl.LINEAR)
            t.repeat_x = t.repeat_y = False
            self.mips.append((t, ctx.framebuffer(color_attachments=[t]), (w, h)))
            w, h = max(1, w // 2), max(1, h // 2)
        self.out_tex = ctx.texture((W, H), 3)
        self.out_fbo = ctx.framebuffer(color_attachments=[self.out_tex])
        for p in (self.p_line, self.p_point, self.p_text, self.p_fill, self.p_bg):
            if "u_res" in p:
                p["u_res"].value = (W, H)

    def set_cam(self, zoom=1.0, rot=0.0, tx=0.0, ty=0.0, cx=W / 2, cy=H / 2):
        c, s = np.cos(rot), np.sin(rot)
        # p' = R*S*(p - c) + c + t
        m = np.array([[zoom * c, -zoom * s, cx + tx - zoom * (c * cx - s * cy)],
                      [zoom * s, zoom * c, cy + ty - zoom * (s * cx + c * cy)],
                      [0, 0, 1]], np.float32)
        mt = tuple(m.T.flatten())    # GLSL は列優先
        for p in (self.p_line, self.p_point, self.p_text, self.p_fill):
            p["u_cam"].value = mt

    def render(self, frame):
        ctx = self.ctx
        self.scene_fbo.use()
        ctx.viewport = (0, 0, W, H)
        ctx.disable(moderngl.BLEND)
        # 背景
        for k, v in frame.bg.items():
            if k in self.p_bg:
                self.p_bg[k].value = v
        self.vao_bg.render(moderngl.TRIANGLES, vertices=3)
        cam = frame.cam
        ctx.enable(moderngl.BLEND)
        for layer in frame.order:
            kind, data, camflag = layer
            if camflag:
                self.set_cam(*cam)
            else:
                self.set_cam(1.0, 0.0, 0.0, 0.0)
            if kind == "fill" and len(data):
                ctx.blend_func = moderngl.ONE, moderngl.ONE_MINUS_SRC_ALPHA
                d = data[: self.MAX_FILL]
                self.fill_buf.write(d.astype(np.float32).tobytes())
                self.vao_fill.render(moderngl.TRIANGLES, vertices=len(d))
            elif kind == "line" and len(data):
                ctx.blend_func = moderngl.ONE, moderngl.ONE
                d = data[: self.MAX_LINES]
                self.line_buf.write(d.astype(np.float32).tobytes())
                self.vao_line.render(moderngl.TRIANGLE_STRIP, vertices=4, instances=len(d))
            elif kind == "point" and len(data):
                ctx.blend_func = moderngl.ONE, moderngl.ONE
                d = data[: self.MAX_POINTS]
                self.point_buf.write(d.astype(np.float32).tobytes())
                self.vao_point.render(moderngl.TRIANGLE_STRIP, vertices=4, instances=len(d))
            elif kind == "text" and len(data):
                ctx.blend_func = moderngl.ONE, moderngl.ONE_MINUS_SRC_ALPHA
                d = data[: self.MAX_TEXT]
                self.text_buf.write(d.astype(np.float32).tobytes())
                self.atlas_tex.use(0)
                self.p_text["u_atlas"].value = 0
                self.vao_text.render(moderngl.TRIANGLE_STRIP, vertices=4, instances=len(d))
        ctx.disable(moderngl.BLEND)
        # ブルーム
        src = self.scene_tex
        for i, (t, fbo, (w, h)) in enumerate(self.mips):
            fbo.use()
            ctx.viewport = (0, 0, w, h)
            src.use(0)
            self.p_down["u_src"].value = 0
            sw, sh = src.size
            self.p_down["u_texel"].value = (1.0 / sw, 1.0 / sh)
            self.p_down["u_thresh"].value = frame.post.get("thresh", 0.9) if i == 0 else 0.0
            self.vao_down.render(moderngl.TRIANGLES, vertices=3)
            src = t
        ctx.enable(moderngl.BLEND)
        ctx.blend_func = moderngl.ONE, moderngl.ONE
        for i in range(len(self.mips) - 1, 0, -1):
            t_small = self.mips[i][0]
            t_big, fbo_big, (w, h) = self.mips[i - 1]
            fbo_big.use()
            ctx.viewport = (0, 0, w, h)
            t_small.use(0)
            self.p_up["u_src"].value = 0
            sw, sh = t_small.size
            self.p_up["u_texel"].value = (1.0 / sw, 1.0 / sh)
            self.p_up["u_radius"].value = 1.0
            self.vao_up.render(moderngl.TRIANGLES, vertices=3)
        ctx.disable(moderngl.BLEND)
        # 仕上げ
        self.out_fbo.use()
        ctx.viewport = (0, 0, W, H)
        self.scene_tex.use(0)
        self.mips[0][0].use(1)
        pf = self.p_final
        pf["u_scene"].value = 0
        pf["u_bloom"].value = 1
        pf["u_res"].value = (W, H)
        post = dict(u_bloom_amt=0.9, u_exposure=1.0, u_flash=0.0, u_ca=0.0, u_grain=0.035, u_time=0.0,
                    u_vignette=0.6, u_fade=1.0, u_sat=1.0, u_flash_col=(1.0, 1.0, 1.0))
        post.update({k: v for k, v in frame.post.items() if k.startswith("u_")})
        for k, v in post.items():
            pf[k].value = v
        self.vao_final.render(moderngl.TRIANGLES, vertices=3)
        return self.out_fbo.read(components=3, alignment=1)


class Frame:
    def __init__(self):
        self.bg = {}
        self.post = {}
        self.cam = (1.0, 0.0, 0.0, 0.0)
        self.order = []        # [(kind, array, use_cam)]
        self._lines = []
        self._points = []
        self._texts = []
        self._fills = []

    # レイヤーは追加順に描かれる。flush でまとめる。
    def flush(self, cam=True):
        if self._fills:
            self.order.append(("fill", np.concatenate(self._fills), cam))
            self._fills = []
        if self._lines:
            self.order.append(("line", np.concatenate(self._lines), cam))
            self._lines = []
        if self._points:
            self.order.append(("point", np.concatenate(self._points), cam))
            self._points = []
        if self._texts:
            self.order.append(("text", np.concatenate(self._texts), cam))
            self._texts = []


# ---------------------------------------------------------------------------
# 描画ヘルパー
# ---------------------------------------------------------------------------
def segs_from_poly(xy, col, inten, width, glow, closed=False):
    """xy: (n,2)。col: (3,) or (n,3)。inten: scalar or (n,)"""
    xy = np.asarray(xy, np.float32)
    if closed:
        xy = np.vstack([xy, xy[:1]])
    n = len(xy) - 1
    if n <= 0:
        return np.zeros((0, 10), np.float32)
    out = np.empty((n, 10), np.float32)
    out[:, 0:2] = xy[:-1]
    out[:, 2:4] = xy[1:]
    col = np.asarray(col, np.float32)
    if col.ndim == 1:
        out[:, 4:7] = col[None, :]
    else:
        if closed:
            col = np.vstack([col, col[:1]])
        out[:, 4:7] = col[:-1]
    inten = np.asarray(inten, np.float32)
    if inten.ndim == 0:
        out[:, 7] = inten
    else:
        if closed:
            inten = np.concatenate([inten, inten[:1]])
        out[:, 7] = inten[:-1]
    out[:, 8] = width
    out[:, 9] = glow
    return out


def seg(x0, y0, x1, y1, col, inten, width, glow):
    return np.array([[x0, y0, x1, y1, col[0], col[1], col[2], inten, width, glow]], np.float32)


def circle_xy(cx, cy, r, n=128, a0=0.0, a1=2 * np.pi):
    a = np.linspace(a0, a1, n)
    return np.stack([cx + r * np.cos(a), cy + r * np.sin(a)], axis=1)


def points_arr(xy, size, col, alpha, shape=0, param=0.0, rot=0.0):
    xy = np.asarray(xy, np.float32).reshape(-1, 2)
    n = len(xy)
    out = np.zeros((n, 10), np.float32)
    out[:, 0:2] = xy
    out[:, 2] = size
    out[:, 3] = rot
    col = np.asarray(col, np.float32)
    out[:, 4:7] = col if col.ndim == 2 else col[None, :]
    out[:, 7] = alpha
    out[:, 8] = shape
    out[:, 9] = param
    return out


def text_arr(atlas, font, text, x, y, size, col=(1, 1, 1), alpha=1.0, glow=0.0, gcol=(1, 1, 1), halo=0.0,
             align="left", tracking=0.0, soft=0.0, per_char=None):
    """per_char: 関数 (i, ch, gx, gy) -> (dx, dy, scale, alpha_mul, col, glow) で文字ごとに変形"""
    lay = atlas.layout(font, text, x, y, size, align, tracking)
    rows = []
    for i, (ch, gx, gy, sz, adv) in enumerate(lay):
        g = atlas.glyphs.get((font, ch))
        if g is None or g["uv"] is None:
            continue
        dx = dy = 0.0
        sc = 1.0
        am = 1.0
        c = col
        gl = glow
        if per_char is not None:
            r = per_char(i, ch, gx, gy)
            if r is None:
                continue
            dx, dy, sc, am, c, gl = r
        if am <= 0.001:
            continue
        x0, y0, x1, y1 = g["plane"]
        cxm = gx + adv * 0.5
        cym = gy - sz * 0.35
        rx0 = cxm + ((gx + x0 * sz) - cxm) * sc + dx
        rx1 = cxm + ((gx + x1 * sz) - cxm) * sc + dx
        ry0 = cym + ((gy + y0 * sz) - cym) * sc + dy
        ry1 = cym + ((gy + y1 * sz) - cym) * sc + dy
        u0, v0, u1, v1 = g["uv"]
        rows.append([rx0, ry0, rx1, ry1, u0, v0, u1, v1, c[0], c[1], c[2], alpha * am, gl, halo, 0, 0,
                     gcol[0], gcol[1], gcol[2], soft])
    if not rows:
        return np.zeros((0, 20), np.float32)
    return np.array(rows, np.float32)


def fill_poly_strip(xs, ytop, ybot, col, alpha):
    """x 方向に並んだ縦の帯（上辺 ytop, 下辺 ybot）を三角形に"""
    n = len(xs) - 1
    tri = np.zeros((n * 6, 6), np.float32)
    x0, x1 = xs[:-1], xs[1:]
    t0, t1 = ytop[:-1], ytop[1:]
    b0, b1 = ybot[:-1], ybot[1:]
    P = np.stack([np.stack([x0, t0], 1), np.stack([x1, t1], 1), np.stack([x0, b0], 1),
                  np.stack([x1, t1], 1), np.stack([x1, b1], 1), np.stack([x0, b0], 1)], 1).reshape(-1, 2)
    tri[:, 0:2] = P
    tri[:, 2:5] = col
    tri[:, 5] = alpha
    return tri


def rect_fill(x0, y0, x1, y1, col, alpha):
    P = np.array([[x0, y0], [x1, y0], [x0, y1], [x1, y0], [x1, y1], [x0, y1]], np.float32)
    out = np.zeros((6, 6), np.float32)
    out[:, 0:2] = P
    out[:, 2:5] = col
    out[:, 5] = alpha
    return out


def hsv(h, s, v):
    h = h % 1.0
    i = int(h * 6)
    f = h * 6 - i
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    return np.array([(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)][i % 6], np.float32)
