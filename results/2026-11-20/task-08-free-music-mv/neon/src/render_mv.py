#!/usr/bin/env python3
"""
ORBITAL RAIN — 星降るネオンの夜
Apple M4 Max GPU ModernGL 60 FPS Cinema-Grade Music Video Rendering Engine.

Features:
- Multi-pass OpenGL 4.1 Core GLSL shaders (1920x1080 @ 60fps = 9,240 frames)
- True 2.5D Depth-Parallax camera motion per scene (bespoke choreography)
- Real-time GPU procedural falling rain, puddle ripple refraction, shooting star cascades,
  zero-gravity floating crystalline bokeh, volumetric god-rays, celestial aurora ribbons,
  kick-triggered shockwave distortion, and snare chromatic aberration flashes
- Two-pass HDR Anamorphic Bloom + ACES Filmic Tone Mapping + anti-banding 35mm film grain
- Stem-synchronized 48-band delicate holographic horizon spectrum & audio-reactive orbital aura
- Crisp Japanese (Toppan Bunkyu Mincho) & English (SF Pro Display) kinetic poetic typography
- Dynamic aspect ratio: 2.35:1 CinemaScope opening seamlessly to 16:9 IMAX during Climaxes!
"""

import json
import math
import os
import subprocess
import sys
import time
import numpy as np
import moderngl
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ==============================================================================
# PATHS & VIDEO CONFIG
# ==============================================================================
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCENES_DIR = os.path.join(ROOT_DIR, "assets", "scenes")
AUDIO_DIR = os.path.join(ROOT_DIR, "audio")
MASTER_WAV = os.path.join(AUDIO_DIR, "orbital_rain_master.wav")
ANALYSIS_JSON = os.path.join(AUDIO_DIR, "analysis.json")
OUT_MP4 = os.path.join(ROOT_DIR, "ORBITAL_RAIN_MV.mp4")

WIDTH = 1920
HEIGHT = 1080
FPS = 60

FONT_JP_MINCHO = "/System/Library/AssetsV2/com_apple_MobileAsset_Font8/a35803b18dea500ee1e426f403635efbe5a84bd4.asset/AssetData/ToppanBunkyuMinchoPr6N-Regular.otf"
FONT_JP_FALLBACK = "/System/Library/Fonts/Hiragino Sans GB.ttc"
FONT_EN_ULTRALIGHT = "/Library/Fonts/SF-Pro-Display-Ultralight.otf"
FONT_EN_LIGHT = "/Library/Fonts/SF-Pro-Display-Light.otf"
FONT_EN_REGULAR = "/Library/Fonts/SF-Pro-Display-Regular.otf"
FONT_EN_MEDIUM = "/Library/Fonts/SF-Pro-Display-Medium.otf"

def load_font(path: str, size: int, fallback: str = FONT_JP_FALLBACK):
    for p in (path, fallback, "/System/Library/Fonts/SFNS.ttf"):
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


# ==============================================================================
# SCENE STORYBOARD TIMELINE (EXACTLY LOCKED TO 80 BARS @ 128 BPM)
# 1 bar = 1.875 s | 80 bars = 150.0 s + 4.0 s tail = 154.0 s
# ==============================================================================
# Each entry: (start_sec, end_sec, scene_idx_0based, trans_dur, trans_type, mode_flags)
# trans_type: 0=crossfade, 1=flash_warp_drop, 2=golden_bloom
SCENES_TIMELINE = [
    # Act 1: Prologue — Midnight Rain Rooftop (Bars 0-7)
    (0.000,   15.000, 0, 1.4, 0),
    # Act 2A: Verse 1A — Neon Rain Skybridge (Bars 8-13)
    (15.000,  26.250, 1, 1.4, 0),
    # Act 2B: Verse 1B — Crystal Balcony Starfall Gaze (Bars 14-19)
    (26.250,  37.500, 2, 1.4, 0),
    # Act 3: Pre-Chorus — Cloud Canyon Ascension (Bars 20-27)
    (37.500,  52.500, 3, 1.3, 0),
    # Act 4A: Drop 1A — Neon Horizon Starfall (Bars 28-35) — IMPACT WARP!
    (52.500,  67.500, 4, 0.45, 1),
    # Act 4B: Drop 1B — Velocity of Light Skyway (Bars 36-43) — IMPACT WARP!
    (67.500,  82.500, 5, 0.55, 1),
    # Act 5: Breakdown / Bridge — Zero Gravity Orbit (Bars 44-55) — ETHEREAL FADE!
    (82.500, 105.000, 6, 1.5, 2),
    # Act 6: Final Climax — Orbital Supernova +2 Key Change! (Bars 56-71) — HUGE IMPACT!
    (105.000, 135.000, 7, 0.45, 1),
    # Act 7: Outro — First Light Dawn Rooftop (Bars 72-79 + tail) — GOLDEN BLOOM!
    (135.000, 155.000, 8, 2.2, 2),
]

# Dramatic flash / beat-drop timestamps (seconds)
IMPACT_TIMES = [15.0, 52.5, 67.5, 82.5, 105.0, 120.0, 135.0]

# Poetic Typography & Title Cards
# (t_start, t_end, kind, jp_text, en_text, y_anchor)
# kind: "title", "poem", "credits"
TYPOGRAPHY_CARDS = [
    (2.4,   10.2, "title",   "星 降 る ネ オ ン の 夜", "O R B I T A L   R A I N", 0.23),
    (11.0,  14.8, "poem",    "雨音の向こう側、まだ見ぬ星が脈打つ", "Beyond the rain, an unseen star begins to pulse", 0.81),
    (16.8,  24.6, "poem",    "濡れたガラスに映る、蒼い残響", "Cobalt echoes mirrored in rain-soaked glass", 0.81),
    (28.0,  36.2, "poem",    "雲の裂け目から、光の雨が降り始める", "Through parting clouds, a rain of light descends", 0.81),
    (39.4,  50.4, "poem",    "重力を振り切って、蒼穹の果てへ", "Breaking free of gravity, rising into the azure sky", 0.81),
    (54.2,  65.8, "poem",    "星屑の残光が、眠る街を照らし出す", "The afterglow of stardust awakens the sleeping city", 0.84),
    (69.5,  80.8, "poem",    "光の軌道に乗って、夜を駆け抜ける", "Riding ribbons of light across the electric night", 0.84),
    (84.8,  96.5, "poem",    "無重力の静寂 — 音と光が溶け合う場所", "Weightless stillness — where sound dissolves into light", 0.81),
    (98.0, 103.6, "poem",    "もう一度、世界が息を吹き返す", "Once more, the universe draws a breath", 0.81),
    (107.2, 118.8, "poem",   "蒼穹のシンギュラリティ — 夜空が輝く瞬間", "Singularity of light — the moment the cosmos ignites", 0.85),
    (121.8, 133.2, "poem",   "この残響は、決して消えない", "This resonance will never fade", 0.85),
    (137.4, 146.5, "poem",   "そして、新しい光が降り注ぐ", "And first light pours over the awakened dawn", 0.81),
    (147.6, 153.2, "credits","星 降 る ネ オ ン の 夜", "O R B I T A L   R A I N", 0.24),
]


# ==============================================================================
# PRE-RENDER CRISP TYPOGRAPHY OVERLAY TEXTURES (RGBA 1920x1080)
# ==============================================================================
def draw_tracked_text(draw, text, font, cx, y, fill, tracking=0.0):
    """Draw horizontally centered text with custom letter spacing (tracking)."""
    widths = [draw.textlength(ch, font=font) for ch in text]
    total_w = sum(widths) + tracking * max(0, len(text) - 1)
    x = cx - total_w * 0.5
    for ch, w in zip(text, widths):
        draw.text((x, y), ch, font=font, fill=fill)
        x += w + tracking
    return total_w

def render_typography_texture(kind: str, jp_text: str, en_text: str, y_anchor: float) -> np.ndarray:
    """Create a razor-sharp anti-aliased RGBA typography layer with cinema drop shadow & seamless glow."""
    bg_feather = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    tight_sh = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    soft_sh = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    fg = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))

    d_bg = ImageDraw.Draw(bg_feather)
    d_ts = ImageDraw.Draw(tight_sh)
    d_sh = ImageDraw.Draw(soft_sh)
    d_gl = ImageDraw.Draw(glow)
    d_fg = ImageDraw.Draw(fg)

    cx = WIDTH * 0.5
    cy = HEIGHT * y_anchor

    if kind == "title":
        f_en = load_font(FONT_EN_ULTRALIGHT, 94)
        f_jp = load_font(FONT_JP_MINCHO, 36)
        f_tag = load_font(FONT_EN_LIGHT, 18)

        draw_tracked_text(d_ts, en_text, f_en, cx, cy - 58 + 2, (0, 6, 18, 210), tracking=6)
        draw_tracked_text(d_sh, en_text, f_en, cx, cy - 58 + 3, (0, 6, 18, 220), tracking=6)
        draw_tracked_text(d_gl, en_text, f_en, cx, cy - 58, (95, 225, 255, 195), tracking=6)
        tw = draw_tracked_text(d_fg, en_text, f_en, cx, cy - 58, (248, 252, 255, 255), tracking=6)

        rule_w = min(tw * 0.56, 520)
        y_rule = cy + 62
        d_gl.line([(cx - rule_w * 0.5, y_rule), (cx + rule_w * 0.5, y_rule)], fill=(110, 235, 255, 210), width=3)
        d_fg.line([(cx - rule_w * 0.5, y_rule), (cx + rule_w * 0.5, y_rule)], fill=(235, 248, 255, 215), width=1)
        d = 4
        d_fg.polygon([(cx, y_rule - d), (cx + d, y_rule), (cx, y_rule + d), (cx - d, y_rule)], fill=(200, 248, 255, 240))

        draw_tracked_text(d_ts, jp_text, f_jp, cx, cy + 84 + 2, (0, 6, 18, 210), tracking=12)
        draw_tracked_text(d_sh, jp_text, f_jp, cx, cy + 84 + 3, (0, 6, 18, 220), tracking=12)
        draw_tracked_text(d_gl, jp_text, f_jp, cx, cy + 84, (130, 210, 255, 165), tracking=12)
        draw_tracked_text(d_fg, jp_text, f_jp, cx, cy + 84, (242, 248, 255, 248), tracking=12)

        prelude = "A N   O R I G I N A L   A U D I O V I S U A L   W O R K"
        draw_tracked_text(d_ts, prelude, f_tag, cx, cy - 96 + 1, (0, 6, 18, 190), tracking=3)
        draw_tracked_text(d_fg, prelude, f_tag, cx, cy - 96, (195, 232, 255, 210), tracking=3)

    elif kind == "poem":
        f_jp = load_font(FONT_JP_MINCHO, 36)
        f_en = load_font(FONT_EN_REGULAR, 19)

        # Seamless full-width ultra-soft atmospheric feather (zero box edges!)
        d_bg.ellipse([cx - 720, cy - 55, cx + 720, cy + 95], fill=(2, 6, 18, 82))

        # Tight crisp glyph outline shadow + soft cinema shadow (Blu-ray subtitle clarity!)
        for ox, oy in ((-1.5, 1.5), (1.5, 1.5), (0, 2.5), (-1.5, -0.5), (1.5, -0.5)):
            draw_tracked_text(d_ts, jp_text, f_jp, cx + ox, cy - 24 + oy, (0, 3, 14, 240), tracking=6)
        draw_tracked_text(d_sh, jp_text, f_jp, cx, cy - 24 + 4, (0, 3, 14, 245), tracking=6)
        draw_tracked_text(d_gl, jp_text, f_jp, cx, cy - 24, (95, 215, 255, 120), tracking=6)
        draw_tracked_text(d_fg, jp_text, f_jp, cx, cy - 24, (253, 254, 255, 255), tracking=6)

        for ox, oy in ((-1, 1.5), (1, 1.5), (0, 2)):
            draw_tracked_text(d_ts, en_text, f_en, cx + ox, cy + 30 + oy, (0, 3, 14, 235), tracking=2.4)
        draw_tracked_text(d_sh, en_text, f_en, cx, cy + 30 + 3, (0, 3, 14, 235), tracking=2.4)
        draw_tracked_text(d_fg, en_text, f_en, cx, cy + 30, (230, 242, 255, 242), tracking=2.4)

    elif kind == "credits":
        f_en = load_font(FONT_EN_LIGHT, 74)
        f_jp = load_font(FONT_JP_MINCHO, 32)
        f_sub = load_font(FONT_EN_REGULAR, 18)

        # Invisible-edge ultra-soft atmospheric halo (zero rectangle box!)
        d_bg.ellipse([cx - 660, cy - 95, cx + 660, cy + 195], fill=(14, 18, 32, 68))

        for ox, oy in ((-2, 2), (2, 2), (0, 3)):
            draw_tracked_text(d_ts, en_text, f_en, cx + ox, cy - 50 + oy, (12, 14, 28, 225), tracking=6)
        draw_tracked_text(d_sh, en_text, f_en, cx, cy - 50 + 5, (10, 14, 26, 235), tracking=6)
        draw_tracked_text(d_gl, en_text, f_en, cx, cy - 50, (255, 220, 165, 145), tracking=6)
        tw = draw_tracked_text(d_fg, en_text, f_en, cx, cy - 50, (255, 253, 248, 255), tracking=6)

        y_rule = cy + 44
        rw = min(tw * 0.5, 420)
        d_ts.line([(cx - rw * 0.5, y_rule + 1), (cx + rw * 0.5, y_rule + 1)], fill=(12, 16, 30, 195), width=3)
        d_fg.line([(cx - rw * 0.5, y_rule), (cx + rw * 0.5, y_rule)], fill=(255, 246, 225, 230), width=1)

        for ox, oy in ((-1.5, 2), (1.5, 2), (0, 2.5)):
            draw_tracked_text(d_ts, jp_text, f_jp, cx + ox, cy + 64 + oy, (12, 14, 28, 230), tracking=10)
        draw_tracked_text(d_sh, jp_text, f_jp, cx, cy + 64 + 4, (10, 14, 26, 230), tracking=10)
        draw_tracked_text(d_fg, jp_text, f_jp, cx, cy + 64, (255, 250, 242, 255), tracking=10)

        meta = "1 2 8   B P M   •   E b   M A J O R   →   F   M A J O R   •   4 8 k H z   S T E R E O   M A S T E R"
        for ox, oy in ((-1, 1.5), (1, 1.5), (0, 2)):
            draw_tracked_text(d_ts, meta, f_sub, cx + ox, cy + 124 + oy, (10, 14, 28, 225), tracking=2.2)
        draw_tracked_text(d_sh, meta, f_sub, cx, cy + 124 + 3, (10, 14, 28, 220), tracking=2.2)
        draw_tracked_text(d_fg, meta, f_sub, cx, cy + 124, (245, 248, 255, 242), tracking=2.2)

    # Heavy feather blur on ambient halo, tight crisp blur on glyph shadow!
    bg_feather = bg_feather.filter(ImageFilter.GaussianBlur(radius=62))
    tight_sh = tight_sh.filter(ImageFilter.GaussianBlur(radius=3))
    soft_sh = soft_sh.filter(ImageFilter.GaussianBlur(radius=14))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=14))
    comp = Image.alpha_composite(bg_feather, soft_sh)
    comp = Image.alpha_composite(comp, tight_sh)
    comp = Image.alpha_composite(comp, glow)
    comp = Image.alpha_composite(comp, fg)
    comp = comp.transpose(Image.FLIP_TOP_BOTTOM)
    return np.array(comp, dtype=np.uint8)


# ==============================================================================
# SCENE IMAGE & HEURISTIC DEPTH MAP LOADER
# ==============================================================================
def load_scene_and_depth(path: str):
    """Load scene resized cleanly to 1920x1080 and generate a smooth 2.5D depth heuristic map."""
    im = Image.open(path).convert("RGB").resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    # Flip vertically for OpenGL UV (0,0 = bottom-left)
    im_gl = im.transpose(Image.FLIP_TOP_BOTTOM)
    rgb = np.array(im_gl, dtype=np.uint8)

    # Smooth heuristic depth map (0=far sky/background, 1=near foreground):
    # Lower Y (ground/railing/walkway) & darker foreground silhouettes sit closer to camera
    arr_f = rgb.astype(np.float32) / 255.0
    luma = 0.299 * arr_f[:, :, 0] + 0.587 * arr_f[:, :, 1] + 0.114 * arr_f[:, :, 2]
    y_grad = np.linspace(1.0, 0.0, HEIGHT, dtype=np.float32)[:, None]  # bottom=1 (near), top=0 (far)
    depth = np.clip(0.62 * y_grad + 0.38 * (1.0 - luma), 0.0, 1.0)
    # Blur depth heavily so 2.5D parallax displacement is silky-smooth with zero tearing
    depth_im = Image.fromarray((depth * 255).astype(np.uint8), mode="L").filter(ImageFilter.GaussianBlur(radius=28))
    depth_u8 = np.array(depth_im, dtype=np.uint8)
    return rgb, depth_u8


# ==============================================================================
# GLSL SHADERS (OPENGL 4.1 CORE — APPLE M4 MAX GPU)
# ==============================================================================
VERT_QUAD = """
#version 410 core
in vec2 in_pos;
out vec2 v_uv;
void main() {
    v_uv = in_pos * 0.5 + 0.5;
    gl_Position = vec4(in_pos, 0.0, 1.0);
}
"""

# PASS 1: Main World Renderer — 2.5D Depth Parallax, Cinematography, Transitions,
# Real-time Volumetric Rain, Puddle Ripples, Shooting Stars, Zero-G Droplets,
# Aurora Ribbons, God-Rays, Shockwave Distortion & Chromatic Aberration!
FRAG_MAIN = """
#version 410 core
in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_texA;
uniform sampler2D u_depthA;
uniform sampler2D u_texB;
uniform sampler2D u_depthB;
uniform sampler2D u_specTex;

uniform float u_time;
uniform float u_blend;
uniform int u_sceneA;
uniform int u_sceneB;
uniform int u_transType;

// Audio-reactive stem envelopes
uniform float u_kick;
uniform float u_snare;
uniform float u_bass;
uniform float u_chords;
uniform float u_lead;
uniform float u_arp;
uniform float u_piano;
uniform float u_choir;
uniform float u_energy;
uniform float u_impactFlash;
uniform float u_shockAge;    // seconds since last major kick/impact shockwave
uniform float u_buildup;     // 0..1 tension ramp during Pre-Chorus & Bridge Build
uniform float u_letterbox;   // synced lower CinemaScope edge so spectrum anchors cleanly!

// Hash & 2D Noise utilities
float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash12(i + vec2(0.0, 0.0)), hash12(i + vec2(1.0, 0.0)), u.x),
        mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p = rot * p * 2.05 + vec2(1.7, 9.2);
        a *= 0.5;
    }
    return v;
}

// Per-scene bespoke camera choreography & 2.5D parallax UV transform
vec2 sceneUV(vec2 uv, sampler2D depthTex, int sc, float t) {
    vec2 c = uv - 0.5;
    float zoom = 1.04;
    vec2 pan = vec2(0.0);
    float rot = 0.0;
    vec2 parVec = vec2(0.0);

    // Subtle organic breathing camera handheld feel
    vec2 sway = vec2(sin(t * 0.52) * 0.0045, cos(t * 0.41) * 0.0035);

    if (sc == 0) {
        // Scene 01: Midnight Rain Rooftop — intimate slow push-in toward protagonist & city
        float p = clamp(t / 15.0, 0.0, 1.0);
        zoom = 1.02 + 0.085 * p;
        pan = vec2(sin(p * 3.14159) * 0.012, -0.012 * p) + sway * 0.7;
        parVec = vec2(sin(t * 0.35) * 0.012, 0.007 * p);
    } else if (sc == 1) {
        // Scene 02: Rain-Slick Neon Skybridge — steady forward glide along the walkway
        float p = clamp((t - 15.0) / 11.25, 0.0, 1.0);
        zoom = 1.03 + 0.13 * p + u_kick * 0.012;
        pan = vec2(0.018 * (p - 0.5), 0.018 * p) + sway;
        parVec = vec2(0.018 * (p - 0.5), 0.014 * p);
    } else if (sc == 2) {
        // Scene 03: Crystal Balcony — crane upward tilt toward falling stars
        float p = clamp((t - 26.25) / 11.25, 0.0, 1.0);
        zoom = 1.06 + 0.07 * p + u_kick * 0.014;
        pan = vec2(-0.016 * p, 0.032 * (p - 0.35)) + sway;
        parVec = vec2(-0.015 * p, 0.018 * p);
    } else if (sc == 3) {
        // Scene 04: Cloud Canyon Ascension — dramatic accelerating vertical soar!
        float p = clamp((t - 37.5) / 15.0, 0.0, 1.0);
        // Dramatic pullback micro-breath right before drop (51.5s..52.5s)
        float preDrop = smoothstep(13.8, 14.9, t - 37.5);
        zoom = 1.03 + 0.20 * (p * p) - 0.045 * preDrop + u_kick * 0.018;
        pan = vec2(sin(t * 0.9) * 0.008, 0.042 * p - 0.02) + sway * 1.2;
        rot = sin(t * 0.45) * 0.018;
        parVec = vec2(sin(t * 0.7) * 0.014, 0.028 * p);
    } else if (sc == 4) {
        // Scene 05: Drop 1A Neon Horizon — epic wide pulse & kick punch!
        float p = clamp((t - 52.5) / 15.0, 0.0, 1.0);
        zoom = 1.03 + 0.11 * p + u_kick * 0.032 + u_chords * 0.012;
        pan = vec2(sin(p * 3.14159) * 0.016, 0.012 * sin(p * 6.2831)) + sway;
        rot = sin(t * 0.65) * 0.014;
        parVec = vec2(sin(t * 0.55) * 0.018, 0.012 * cos(t * 0.4));
    } else if (sc == 5) {
        // Scene 06: Drop 1B Velocity of Light Highway — exhilarating sweeping zoom!
        float p = clamp((t - 67.5) / 15.0, 0.0, 1.0);
        zoom = 1.04 + 0.18 * p + u_kick * 0.036;
        pan = vec2(0.022 * sin(p * 3.14159), -0.015 * p) + sway * 1.2;
        rot = -0.022 * sin(p * 3.14159);
        parVec = vec2(0.022 * (p - 0.5), 0.018 * p);
    } else if (sc == 6) {
        // Scene 07: Breakdown Zero Gravity — serene weightless orbital float!
        float p = clamp((t - 82.5) / 22.5, 0.0, 1.0);
        float preDrop2 = smoothstep(21.2, 22.4, t - 82.5);
        zoom = 1.04 + 0.09 * sin(p * 3.14159) + 0.08 * smoothstep(0.65, 1.0, p) - 0.04 * preDrop2;
        pan = vec2(sin(t * 0.28) * 0.024, cos(t * 0.22) * 0.018);
        rot = sin(t * 0.25) * 0.036;  // graceful zero-G roll!
        parVec = vec2(sin(t * 0.32) * 0.022, cos(t * 0.27) * 0.016);
    } else if (sc == 7) {
        // Scene 08: Final Climax Orbital Supernova — massive IMAX cosmic punch!
        float p = clamp((t - 105.0) / 30.0, 0.0, 1.0);
        zoom = 1.02 + 0.14 * sin(p * 3.14159 * 0.85) + u_kick * 0.038 + u_chords * 0.015;
        pan = vec2(sin(t * 0.42) * 0.018, 0.018 * sin(p * 3.14159)) + sway * 1.1;
        rot = sin(t * 0.35) * 0.018;
        parVec = vec2(sin(t * 0.48) * 0.022, cos(t * 0.38) * 0.016);
    } else {
        // Scene 09: Outro First Light Dawn — peaceful slow pull-back & emotional exhale!
        float p = clamp((t - 135.0) / 19.0, 0.0, 1.0);
        zoom = 1.12 - 0.09 * smoothstep(0.0, 1.0, p);
        pan = vec2(sin(p * 2.0) * 0.008, 0.008 * (1.0 - p)) + sway * 0.5;
        parVec = vec2(sin(t * 0.25) * 0.009, -0.008 * p);
    }

    // Apply rotation & zoom
    float cs = cos(rot), sn = sin(rot);
    vec2 r = mat2(cs, -sn, sn, cs) * c;
    vec2 baseUV = r / zoom + 0.5 + pan;

    // 2.5D Depth Parallax displacement (foreground shifts more than distant sky!)
    float depth = texture(depthTex, clamp(baseUV, 0.002, 0.998)).r;
    vec2 finalUV = baseUV + parVec * (depth - 0.45) * 0.85;

    // Subtle puddle water ripple refraction in lower rooftop reflections (Scenes 0, 1, 8)
    if ((sc == 0 || sc == 1 || sc == 8) && uv.y < 0.24) {
        float wetMask = smoothstep(0.24, 0.04, uv.y);
        float rip = sin(uv.y * 125.0 - t * 4.2 + noise(uv * 16.0) * 4.0) * 0.0014;
        finalUV.x += rip * wetMask;
        finalUV.y += rip * 0.45 * wetMask;
    }

    return clamp(finalUV, 0.001, 0.999);
}

// Multi-layer falling parallax rain streaks (Makoto Shinkai style!)
vec3 rainEffect(vec2 uv, float t, float intensity) {
    if (intensity <= 0.005) return vec3(0.0);
    vec2 aspect = vec2(1.7778, 1.0);
    vec3 col = vec3(0.0);
    for (int layer = 0; layer < 3; layer++) {
        float fl = float(layer);
        float scale = 32.0 + fl * 26.0;
        float speed = 3.2 + fl * 1.45;
        vec2 p = uv * aspect;
        // Slight wind tilt
        p.x += p.y * 0.11;
        vec2 grid = vec2(p.x * scale, p.y * (scale * 0.14) + t * speed);
        vec2 id = floor(grid);
        vec2 f = fract(grid);
        float rnd = hash12(id + fl * 47.3);
        if (rnd > 0.62) {
            float xOff = (hash12(id * 2.1 + fl) - 0.5) * 0.65 + 0.5;
            float dx = abs(f.x - xOff);
            float streak = smoothstep(0.055, 0.0, dx) * smoothstep(0.0, 0.35, f.y) * smoothstep(1.0, 0.2, f.y);
            float bright = (0.35 + 0.65 * hash12(id * 3.7)) * (1.0 - fl * 0.25);
            vec3 tint = mix(vec3(0.55, 0.85, 1.0), vec3(0.85, 0.72, 1.0), hash12(id * 5.3));
            col += tint * streak * bright * 0.22;
        }
    }
    return col * intensity;
}

// Animated diagonal shooting stars & meteor rain (Scenes 2, 4, 5, 7)
vec3 meteorShower(vec2 uv, float t, float intensity, vec3 tintA, vec3 tintB) {
    if (intensity <= 0.005) return vec3(0.0);
    vec2 p = vec2(uv.x * 1.7778, uv.y);
    // Rotate coordinate space diagonally (42 deg meteor direction)
    float ang = 0.68;
    mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
    vec2 rp = R * p;

    vec3 col = vec3(0.0);
    for (int l = 0; l < 2; l++) {
        float fl = float(l);
        float cellsX = 11.0 + fl * 9.0;
        float speed = 1.65 + fl * 0.95 + u_energy * 0.45;
        vec2 g = vec2(rp.x * cellsX, rp.y * 1.85 + t * speed);
        vec2 id = floor(g);
        vec2 f = fract(g);
        float h = hash12(id + fl * 91.7);
        if (h > 0.76) {
            float xCenter = 0.2 + 0.6 * hash12(id * 3.1 + fl);
            float distX = abs(f.x - xCenter);
            // Glowing meteor head + tapered tail
            float tail = smoothstep(0.95, 0.08, f.y) * smoothstep(0.0, 0.08, f.y);
            float core = smoothstep(0.065 * (1.0 - f.y * 0.7), 0.0, distX) * tail;
            float head = exp(-length(vec2((f.x - xCenter) * 10.0, (f.y - 0.12) * 14.0)) * 2.2);
            vec3 c = mix(tintA, tintB, hash12(id * 7.3));
            float skyMask = smoothstep(0.22, 0.58, uv.y);
            col += c * (core * 0.75 + head * 1.15) * skyMask;
        }
    }
    return col * intensity;
}

// Floating glowing stardust / zero-gravity crystalline bokeh motes
vec3 stardustBokeh(vec2 uv, float t, float intensity, vec3 colA, vec3 colB, float driftSpeed) {
    if (intensity <= 0.005) return vec3(0.0);
    vec2 p = vec2(uv.x * 1.7778, uv.y);
    vec3 acc = vec3(0.0);
    for (int l = 0; l < 3; l++) {
        float fl = float(l);
        float sc = 6.5 + fl * 5.0;
        vec2 gp = p * sc + vec2(sin(t * 0.25 + fl) * 0.6, -t * driftSpeed * (0.35 + fl * 0.22));
        vec2 id = floor(gp);
        vec2 f = fract(gp) - 0.5;
        vec2 rnd = hash22(id + fl * 31.1);
        vec2 pos = (rnd - 0.5) * 0.68 + vec2(sin(t * (0.7 + rnd.x) + rnd.y * 6.28), cos(t * (0.6 + rnd.y) + rnd.x * 6.28)) * 0.12;
        float d = length(f - pos);
        float sz = (0.045 + 0.055 * rnd.x) * (1.0 + u_arp * 0.35);
        float bokeh = smoothstep(sz, sz * 0.22, d);
        float sparkle = 0.55 + 0.45 * sin(t * (2.5 + 3.5 * rnd.y) + rnd.x * 12.0);
        vec3 c = mix(colA, colB, rnd.y);
        acc += c * bokeh * sparkle * (0.42 - fl * 0.08);
    }
    return acc * intensity;
}

// Procedural shimmering celestial aurora borealis waves (Drop 1B & Supernova Climax!)
vec3 auroraRibbons(vec2 uv, float t, float intensity, float warmShift) {
    if (intensity <= 0.005) return vec3(0.0);
    float skyMask = smoothstep(0.28, 0.65, uv.y) * smoothstep(1.02, 0.82, uv.y);
    vec3 col = vec3(0.0);
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float wave = sin(uv.x * (3.2 + fi * 1.3) + t * (0.45 + fi * 0.15) + fi * 2.1) * 0.085
                   + sin(uv.x * 7.5 - t * 0.7 + fi) * 0.032;
        float yCenter = 0.66 + fi * 0.065 + wave;
        float band = exp(-abs(uv.y - yCenter) * (11.0 - u_chords * 3.2));
        float curtains = 0.55 + 0.45 * fbm(vec2(uv.x * 9.0 + t * 0.25 + fi * 4.0, uv.y * 3.0 - t * 0.15));
        vec3 c1 = mix(vec3(0.12, 0.92, 1.0), vec3(1.0, 0.78, 0.32), warmShift * 0.55);
        vec3 c2 = vec3(1.0, 0.25, 0.72);
        vec3 c3 = vec3(0.45, 0.55, 1.0);
        vec3 tint = (i == 0) ? c1 : ((i == 1) ? c2 : c3);
        col += tint * band * curtains * (0.34 + 0.32 * u_lead + 0.22 * u_chords);
    }
    return col * skyMask * intensity;
}

// Volumetric sunlit / neon god-rays radiating from upper sky center
vec3 godRays(vec2 uv, float t, float intensity, vec3 tint) {
    if (intensity <= 0.005) return vec3(0.0);
    vec2 src = vec2(0.50, 0.88);
    vec2 d = uv - src;
    float ang = atan(d.y, d.x);
    float dist = length(d);
    float rays = 0.5 + 0.5 * sin(ang * 14.0 + t * 0.35) * cos(ang * 9.0 - t * 0.22);
    rays = pow(clamp(rays, 0.0, 1.0), 2.2);
    float falloff = exp(-dist * 1.45) * smoothstep(0.05, 0.35, dist);
    return tint * rays * falloff * intensity * (0.55 + 0.45 * u_chords);
}

void main() {
    vec2 uv = v_uv;

    // Radial shockwave refraction ripple on major drop impacts & heavy kicks
    vec2 c = uv - 0.5;
    vec2 cAsp = vec2(c.x * 1.7778, c.y);
    float rDist = length(cAsp);
    if (u_shockAge >= 0.0 && u_shockAge < 1.15) {
        float waveR = u_shockAge * 1.45;
        float ring = exp(-pow((rDist - waveR) * 16.0, 2.0)) * (1.0 - u_shockAge / 1.15);
        uv += normalize(cAsp + vec2(1e-5)) * ring * 0.022;
    }

    // Subtle radial buildup energy pull during Pre-Chorus & Bridge Build
    if (u_buildup > 0.01) {
        float pull = u_buildup * u_buildup * 0.018 * sin(rDist * 14.0 - u_time * 9.0);
        uv += c * pull;
    }

    // Compute per-scene 2.5D parallax UVs
    vec2 uvA = sceneUV(uv, u_depthA, u_sceneA, u_time);
    vec2 uvB = sceneUV(uv, u_depthB, u_sceneB, u_time);

    // Snare & Impact Chromatic Aberration (subtle optical RGB lens split on heavy snare cracks!)
    float ca = (u_snare * 0.0038 * step(0.32, u_energy) + u_impactFlash * 0.009) * length(c);
    vec2 caDir = normalize(c + vec2(1e-5)) * ca;

    vec3 colA = vec3(
        texture(u_texA, clamp(uvA + caDir, 0.001, 0.999)).r,
        texture(u_texA, uvA).g,
        texture(u_texA, clamp(uvA - caDir, 0.001, 0.999)).b
    );
    vec3 colB = vec3(
        texture(u_texB, clamp(uvB + caDir, 0.001, 0.999)).r,
        texture(u_texB, uvB).g,
        texture(u_texB, clamp(uvB - caDir, 0.001, 0.999)).b
    );

    // Seamless transition blending between Scene A and Scene B
    float b = smoothstep(0.0, 1.0, u_blend);
    vec3 col = mix(colA, colB, b);

    // Transition light-leak / luminous bloom pulse
    float transPeak = sin(b * 3.14159265);
    if (u_transType == 1) {
        // High-energy Drop Flash Warp!
        col += vec3(0.70, 0.92, 1.0) * transPeak * 0.65;
    } else if (u_transType == 2) {
        // Dreamlike Golden / Cyan Light-Leak Crossfade
        col += vec3(1.0, 0.84, 0.56) * transPeak * 0.35;
    } else {
        col += vec3(0.35, 0.72, 1.0) * transPeak * 0.14;
    }

    // Audio-reactive subtle luminance breathing (calibrated to preserve rich jewel-tone detail!)
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    float hiMask = smoothstep(0.30, 0.85, luma) * smoothstep(1.05, 0.72, luma);
    col *= (1.0 + hiMask * (u_chords * 0.13 + u_kick * 0.10 + u_lead * 0.06 + u_piano * 0.08 + u_choir * 0.09));
    // Deep sub-bass low-horizon warm glow
    col += mix(vec3(0.10, 0.45, 0.95), vec3(0.95, 0.32, 0.65), 0.5 + 0.5 * sin(u_time * 0.4))
           * smoothstep(0.42, 0.0, uv.y) * u_bass * 0.055;

    // Scene-specific atmospheric GPU VFX blending smoothly across scenes
    float wRain   = (u_sceneA == 0 ? 1.0 : (u_sceneA == 1 ? 0.85 : (u_sceneA == 2 ? 0.45 : (u_sceneA == 8 ? 0.14 : 0.0)))) * (1.0 - b)
                  + (u_sceneB == 0 ? 1.0 : (u_sceneB == 1 ? 0.85 : (u_sceneB == 2 ? 0.45 : (u_sceneB == 8 ? 0.14 : 0.0)))) * b;
    float wMeteor = (u_sceneA == 2 ? 0.45 : (u_sceneA == 4 ? 0.65 : (u_sceneA == 5 ? 0.65 : (u_sceneA == 7 ? 0.55 : 0.0)))) * (1.0 - b)
                  + (u_sceneB == 2 ? 0.45 : (u_sceneB == 4 ? 0.65 : (u_sceneB == 5 ? 0.65 : (u_sceneB == 7 ? 0.55 : 0.0)))) * b;
    float wAurora = (u_sceneA == 4 ? 0.18 : (u_sceneA == 5 ? 0.38 : (u_sceneA == 7 ? 0.30 : 0.0))) * (1.0 - b)
                  + (u_sceneB == 4 ? 0.18 : (u_sceneB == 5 ? 0.38 : (u_sceneB == 7 ? 0.30 : 0.0))) * b;
    float wGodRay = (u_sceneA == 3 ? 0.65 : (u_sceneA == 7 ? 0.18 : (u_sceneA == 8 ? 0.38 : 0.0))) * (1.0 - b)
                  + (u_sceneB == 3 ? 0.65 : (u_sceneB == 7 ? 0.18 : (u_sceneB == 8 ? 0.38 : 0.0))) * b;
    float wBokeh  = (u_sceneA == 6 ? 1.05 : (u_sceneA == 8 ? 0.52 : (u_sceneA == 4 || u_sceneA == 7 ? 0.48 : 0.30))) * (1.0 - b)
                  + (u_sceneB == 6 ? 1.05 : (u_sceneB == 8 ? 0.52 : (u_sceneB == 4 || u_sceneB == 7 ? 0.48 : 0.30))) * b;
    float wWarm   = (u_sceneA == 7 ? 0.55 : (u_sceneA == 8 ? 1.0 : 0.0)) * (1.0 - b)
                  + (u_sceneB == 7 ? 0.55 : (u_sceneB == 8 ? 1.0 : 0.0)) * b;

    // Gentle highlight headroom protection so bright VFX never white-out vivid painted skies!
    vec3 vfx = vec3(0.0);
    vfx += rainEffect(uv, u_time, wRain);
    vfx += meteorShower(uv, u_time, wMeteor,
                        mix(vec3(0.32, 0.92, 1.0), vec3(1.0, 0.86, 0.42), wWarm),
                        vec3(1.0, 0.40, 0.82));
    vfx += auroraRibbons(uv, u_time, wAurora, wWarm);
    vfx += godRays(uv, u_time, wGodRay, mix(vec3(0.42, 0.92, 1.0), vec3(1.0, 0.82, 0.50), wWarm));
    vfx += stardustBokeh(uv, u_time, wBokeh,
                         mix(vec3(0.45, 0.90, 1.0), vec3(1.0, 0.88, 0.58), wWarm),
                         mix(vec3(0.92, 0.52, 1.0), vec3(0.65, 0.95, 1.0), wWarm),
                         (u_sceneA == 6 || u_sceneB == 6) ? 0.14 : 0.48);
    // Screen-blend style roll-off preserves painted orbital ring & aurora colors in bright zones!
    col += vfx * (1.0 - 0.58 * smoothstep(0.45, 1.0, luma));

    // Subtle glowing shockwave ring light halo on Drop impacts
    if (u_shockAge >= 0.0 && u_shockAge < 1.15) {
        float waveR = u_shockAge * 1.45;
        float ringGlow = exp(-pow((rDist - waveR) * 18.0, 2.0)) * (1.0 - u_shockAge / 1.15);
        vec3 rCol = mix(vec3(0.45, 0.95, 1.0), vec3(1.0, 0.82, 0.42), wWarm);
        col += rCol * ringGlow * 0.42;
    }

    // Subtle radiant audio-reactive celestial aura during high-energy drops & key change
    if (u_chords > 0.15 && (u_sceneA == 4 || u_sceneA == 5 || u_sceneA == 7)) {
        float edgeGlow = smoothstep(0.58, 1.18, rDist) * u_chords * 0.10;
        col += mix(vec3(0.15, 0.72, 1.0), vec3(1.0, 0.35, 0.75), 0.5 + 0.5 * sin(u_time * 0.6)) * edgeGlow;
    }

    // Impact white-cyan flash decay
    col += mix(vec3(0.75, 0.95, 1.0), vec3(1.0, 0.94, 0.76), wWarm) * u_impactFlash * 0.34;

    // -------------------------------------------------------------------------
    // DELICATE CINEMATIC AUDIO-REACTIVE HORIZON SPECTRUM RIBBON (Bottom Edge)
    // Dynamically rests right above the CinemaScope / IMAX lower edge!
    // -------------------------------------------------------------------------
    float specVis = smoothstep(1.8, 5.0, u_time) * smoothstep(153.2, 148.5, u_time);
    float baseH = u_letterbox + 0.008;
    if (specVis > 0.001 && uv.y >= baseH - 0.004 && uv.y < baseH + 0.085) {
        float sx = abs(uv.x - 0.5) / 0.30;
        if (sx < 1.0) {
            float envFade = smoothstep(1.0, 0.70, sx);
            float bandVal = texture(u_specTex, vec2(sx, 0.5)).r;
            float nBars = 44.0;
            float cell = fract(sx * nBars);
            float barMask = smoothstep(0.14, 0.26, cell) * smoothstep(0.86, 0.74, cell);

            float barH = 0.003 + bandVal * (0.036 + 0.015 * u_energy) * envFade;
            float dy = uv.y - baseH;

            float barBody = step(0.0, dy) * smoothstep(barH + 0.002, barH - 0.001, dy) * barMask;
            float baseline = exp(-abs(dy) * 580.0) * envFade * 0.45;
            float halo = step(-0.002, dy) * exp(-max(0.0, dy - barH * 0.65) * 95.0) * bandVal * envFade * 0.22;

            vec3 spCol = mix(
                mix(vec3(0.32, 0.92, 1.0), vec3(0.95, 0.44, 0.90), sx),
                vec3(1.0, 0.86, 0.52),
                wWarm * 0.68
            );
            float alpha = specVis * (0.45 + 0.40 * u_energy);
            col += spCol * (barBody * 0.64 + baseline + halo) * alpha;
        }
    }

    fragColor = vec4(max(col, vec3(0.0)), 1.0);
}
"""

# PASS 2: HDR Bright-Pass Extraction (Half-Resolution)
FRAG_BRIGHT = """
#version 410 core
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_scene;
uniform float u_bloomBoost;

void main() {
    vec3 c = texture(u_scene, v_uv).rgb;
    float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float knee = smoothstep(0.78, 1.35, luma);
    fragColor = vec4(c * knee * u_bloomBoost, 1.0);
}
"""

# PASS 3: Separable Gaussian / Anamorphic Blur (Horizontal then Vertical)
FRAG_BLUR = """
#version 410 core
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_tex;
uniform vec2 u_dir; // (dx, 0) or (0, dy)

void main() {
    const float w[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
    vec3 acc = texture(u_tex, v_uv).rgb * w[0];
    for (int i = 1; i < 5; i++) {
        vec2 off = u_dir * float(i) * 1.85;
        acc += texture(u_tex, clamp(v_uv + off, 0.001, 0.999)).rgb * w[i];
        acc += texture(u_tex, clamp(v_uv - off, 0.001, 0.999)).rgb * w[i];
    }
    fragColor = vec4(acc, 1.0);
}
"""

# PASS 4: Final Cinema Composite — HDR Bloom + ACES Filmic Tone Map +
# Subtle Color Grade + Kinetic Typography Overlay + Dynamic Letterbox + 35mm Grain + Fade!
FRAG_FINAL = """
#version 410 core
in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_scene;
uniform sampler2D u_bloom;
uniform sampler2D u_typoTex;

uniform float u_time;
uniform float u_typoAlpha;
uniform float u_typoShiftY;
uniform float u_letterbox;   // 0.0 (full 16:9 IMAX) .. 0.092 (2.35:1 CinemaScope)
uniform float u_fade;        // global fade-in / fade-out multiplier 0..1
uniform float u_warmGrade;   // 0=midnight cyan-indigo, 1=radiant dawn gold
uniform float u_energy;

vec3 acesToneMap(vec3 x) {
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

float grainHash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

void main() {
    vec2 uv = v_uv;
    vec3 base = texture(u_scene, uv).rgb;
    vec3 bloom = texture(u_bloom, uv).rgb;

    // Combine HDR scene + calibrated luminous anamorphic bloom (preserves rich vibrant aurora & dawn!)
    vec3 col = base + bloom * (0.24 + 0.14 * u_energy);

    // Subtle cinema color grade (rich indigo shadows, crystalline cyan/golden highlights)
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    vec3 shadowTint = mix(vec3(0.95, 0.98, 1.06), vec3(1.02, 0.98, 0.96), u_warmGrade);
    vec3 hiTint     = mix(vec3(0.98, 1.01, 1.04), vec3(1.04, 1.00, 0.94), u_warmGrade);
    col *= mix(shadowTint, hiTint, smoothstep(0.15, 0.85, l));

    // ACES Filmic Tone Mapping for rich theatrical contrast without harsh whiteout
    col = acesToneMap(col * 0.98);
    // Gentle S-curve micro-contrast polish
    col = mix(col, col * col * (3.0 - 2.0 * col), 0.12);

    // Soft optical cinema vignette
    vec2 vig = (uv - 0.5) * vec2(1.18, 1.0);
    float vMask = 1.0 - smoothstep(0.45, 1.05, dot(vig, vig)) * 0.34;
    col *= vMask;

    // Dynamic CinemaScope Letterbox Bars (smoothly opens to full 16:9 during Drops!)
    if (u_letterbox > 0.001) {
        float barMask = smoothstep(u_letterbox - 0.0025, u_letterbox + 0.0015, uv.y)
                      * smoothstep(u_letterbox - 0.0025, u_letterbox + 0.0015, 1.0 - uv.y);
        col *= barMask;
    }

    // Crisp Kinetic Typography Overlay (composited cleanly over letterbox/frame!)
    if (u_typoAlpha > 0.001) {
        vec2 tUV = vec2(uv.x, uv.y - u_typoShiftY);
        if (tUV.y >= 0.0 && tUV.y <= 1.0) {
            vec4 tp = texture(u_typoTex, tUV);
            float a = tp.a * u_typoAlpha;
            col = mix(col, tp.rgb, a);
        }
    }

    // Delicate 35mm organic film grain (also eliminates dark-sky H.264 banding!)
    float g = (grainHash(uv * vec2(1920.0, 1080.0) + fract(u_time * 13.7)) - 0.5) * 0.018;
    col = clamp(col + g, 0.0, 1.0);

    // Global intro fade-in & outro fade-to-black
    col *= u_fade;

    fragColor = vec4(col, 1.0);
}
"""


# ==============================================================================
# HELPER: SMOOTH TIMELINE STATE COMPUTATION
# ==============================================================================
def smoothstep(e0: float, e1: float, x: float) -> float:
    t = max(0.0, min(1.0, (x - e0) / max(1e-6, e1 - e0)))
    return t * t * (3.0 - 2.0 * t)

def get_scene_state(t: float):
    """Returns (sceneA, sceneB, blend, transType) at timestamp t."""
    idx = len(SCENES_TIMELINE) - 1
    for i, (ts, te, sc, td, tt) in enumerate(SCENES_TIMELINE):
        if t < te:
            idx = i
            break
    ts, te, scA, _, _ = SCENES_TIMELINE[idx]
    if idx + 1 < len(SCENES_TIMELINE):
        next_ts, _, scB, trans_d, trans_t = SCENES_TIMELINE[idx + 1]
        # Start transition centered or slightly leading into next act downbeat
        t_lead = next_ts - trans_d * (0.35 if trans_t == 1 else 0.72)
        t_end = next_ts + trans_d * (0.65 if trans_t == 1 else 0.28)
        if t >= t_lead:
            bl = max(0.0, min(1.0, (t - t_lead) / max(1e-4, t_end - t_lead)))
            return scA, scB, bl, trans_t
    if idx > 0:
        cur_ts, _, scCur, trans_d, trans_t = SCENES_TIMELINE[idx]
        prev_sc = SCENES_TIMELINE[idx - 1][2]
        t_lead = cur_ts - trans_d * (0.35 if trans_t == 1 else 0.72)
        t_end = cur_ts + trans_d * (0.65 if trans_t == 1 else 0.28)
        if t <= t_end:
            bl = max(0.0, min(1.0, (t - t_lead) / max(1e-4, t_end - t_lead)))
            return prev_sc, scCur, bl, trans_t
    return scA, scA, 0.0, 0

def get_letterbox(t: float) -> float:
    """
    Dynamic cinema framing:
    - Prologue & Verse: sleek 2.35:1 CinemaScope (0.088)
    - Pre-Chorus Ascension: slowly widens
    - Drop 1 (52.5-82.5s): opens wide (0.025 -> 0.015)
    - Zero Gravity Bridge (82.5-105s): returns softly to 0.068
    - Final Climax Supernova (105-135s): FULL 16:9 IMAX (0.0)!!
    - Outro Dawn (135-154s): gently closes back to poetic 0.082!
    """
    lb = 0.086
    lb -= 0.068 * smoothstep(51.8, 53.0, t)          # Open wide at Drop 1
    lb += 0.052 * smoothstep(82.0, 84.5, t)          # Soft letterbox during Zero-G Bridge
    lb -= 0.070 * smoothstep(104.4, 105.6, t)        # FULL 16:9 IMAX at Key-Change Supernova!
    lb += 0.082 * smoothstep(134.8, 138.2, t)        # Return to CinemaScope for Dawn Outro
    return max(0.0, min(0.095, lb))


# ==============================================================================
# MAIN GPU RENDER LOOP -> DIRECT FFMPEG H.264 + AAC PIPELINE
# ==============================================================================
def render_mv():
    t0 = time.time()
    print("=== Rendering Cinema-Grade 1080p 60 FPS Music Video on Apple M4 Max GPU ===")

    if not os.path.exists(ANALYSIS_JSON) or not os.path.exists(MASTER_WAV):
        raise FileNotFoundError("Audio master or analysis.json missing! Run compose_music.py first.")

    with open(ANALYSIS_JSON, "r") as f:
        ana = json.load(f)

    n_frames = int(ana["n_frames"])
    n_bands = int(ana["n_bands"])
    total_sec = float(ana["total_sec"])
    print(f"Audio length: {total_sec:.2f}s | Frames: {n_frames} @ {FPS}fps | Bands: {n_bands}")

    # Create Apple M4 Max headless OpenGL 4.1 Core Context
    ctx = moderngl.create_standalone_context(require=410)
    print(f"GPU Context: {ctx.info['GL_RENDERER']} ({ctx.info['GL_VERSION']})")

    # Compile shader programs
    prog_main = ctx.program(vertex_shader=VERT_QUAD, fragment_shader=FRAG_MAIN)
    prog_bright = ctx.program(vertex_shader=VERT_QUAD, fragment_shader=FRAG_BRIGHT)
    prog_blur = ctx.program(vertex_shader=VERT_QUAD, fragment_shader=FRAG_BLUR)
    prog_final = ctx.program(vertex_shader=VERT_QUAD, fragment_shader=FRAG_FINAL)

    # Fullscreen quad VBO/VAOs
    quad = np.array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0], dtype="f4")
    vbo = ctx.buffer(quad.tobytes())
    vao_main = ctx.simple_vertex_array(prog_main, vbo, "in_pos")
    vao_bright = ctx.simple_vertex_array(prog_bright, vbo, "in_pos")
    vao_blur = ctx.simple_vertex_array(prog_blur, vbo, "in_pos")
    vao_final = ctx.simple_vertex_array(prog_final, vbo, "in_pos")

    # Allocate HDR Float FBOs (Main 1080p + Half-Res Bloom Ping-Pong + Final 8-bit Output)
    tex_main = ctx.texture((WIDTH, HEIGHT), 4, dtype="f2")
    tex_main.filter = (moderngl.LINEAR, moderngl.LINEAR)
    fbo_main = ctx.framebuffer(color_attachments=[tex_main])

    bw, bh = WIDTH // 2, HEIGHT // 2
    tex_b1 = ctx.texture((bw, bh), 4, dtype="f2")
    tex_b2 = ctx.texture((bw, bh), 4, dtype="f2")
    for tx in (tex_b1, tex_b2):
        tx.filter = (moderngl.LINEAR, moderngl.LINEAR)
        tx.repeat_x = False
        tx.repeat_y = False
    fbo_b1 = ctx.framebuffer(color_attachments=[tex_b1])
    fbo_b2 = ctx.framebuffer(color_attachments=[tex_b2])

    tex_out = ctx.texture((WIDTH, HEIGHT), 3, dtype="f1")
    fbo_out = ctx.framebuffer(color_attachments=[tex_out])

    # Load all 9 scenes + 2.5D depth maps onto GPU
    print("Uploading 9 cinema scenes + 2.5D depth maps to GPU...")
    scene_texs = []
    depth_texs = []
    for i in range(1, 10):
        p = os.path.join(SCENES_DIR, f"scene_{i:02d}.jpg")
        rgb, dep = load_scene_and_depth(p)
        tx = ctx.texture((WIDTH, HEIGHT), 3, rgb.tobytes())
        tx.build_mipmaps()
        tx.filter = (moderngl.LINEAR_MIPMAP_LINEAR, moderngl.LINEAR)
        tx.anisotropy = 8.0
        tx.repeat_x = False
        tx.repeat_y = False
        scene_texs.append(tx)

        dt = ctx.texture((WIDTH, HEIGHT), 1, dep.tobytes())
        dt.filter = (moderngl.LINEAR, moderngl.LINEAR)
        dt.repeat_x = False
        dt.repeat_y = False
        depth_texs.append(dt)

    # Pre-render all kinetic typography RGBA cards onto GPU
    print("Pre-rendering crisp Japanese (Toppan Bunkyu Mincho) & English (SF Pro) typography...")
    typo_texs = []
    for (ts, te, kind, jp, en, ya) in TYPOGRAPHY_CARDS:
        rgba = render_typography_texture(kind, jp, en, ya)
        tt = ctx.texture((WIDTH, HEIGHT), 4, rgba.tobytes())
        tt.filter = (moderngl.LINEAR, moderngl.LINEAR)
        tt.repeat_x = False
        tt.repeat_y = False
        typo_texs.append(tt)

    # 1D-as-2D (n_bands x 1) float spectrum texture updated every frame
    spec_tex = ctx.texture((n_bands, 1), 1, dtype="f4")
    spec_tex.filter = (moderngl.LINEAR, moderngl.LINEAR)
    spec_tex.repeat_x = False
    spec_tex.repeat_y = False

    # Bind static texture unit indices
    prog_main["u_texA"].value = 0
    prog_main["u_depthA"].value = 1
    prog_main["u_texB"].value = 2
    prog_main["u_depthB"].value = 3
    prog_main["u_specTex"].value = 4

    prog_bright["u_scene"].value = 5
    prog_blur["u_tex"].value = 6

    prog_final["u_scene"].value = 5
    prog_final["u_bloom"].value = 7
    prog_final["u_typoTex"].value = 8

    # Launch FFmpeg process piping raw RGB24 (bottom-up -> vflip!) + master 48kHz audio!
    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-pix_fmt", "rgb24",
        "-s", f"{WIDTH}x{HEIGHT}",
        "-r", str(FPS),
        "-i", "-",
        "-i", MASTER_WAV,
        "-vf", "vflip",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "16",
        "-pix_fmt", "yuv420p",
        "-colorspace", "bt709",
        "-color_primaries", "bt709",
        "-color_trc", "bt709",
        "-c:a", "aac",
        "-b:a", "320k",
        "-ar", "48000",
        "-movflags", "+faststart",
        "-shortest",
        OUT_MP4,
    ]
    print(f"Streaming 1920x1080 @ {FPS}fps directly into FFmpeg -> {OUT_MP4}")
    proc = subprocess.Popen(ffmpeg_cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)

    # Pre-convert analysis arrays to NumPy for blazing inner loop
    kicks = np.asarray(ana["kick"], dtype=np.float32)
    snares = np.asarray(ana["snare"], dtype=np.float32)
    basses = np.asarray(ana["bass"], dtype=np.float32)
    chords_e = np.asarray(ana["chords"], dtype=np.float32)
    leads = np.asarray(ana["lead"], dtype=np.float32)
    arps = np.asarray(ana["arp"], dtype=np.float32)
    pianos = np.asarray(ana["piano"], dtype=np.float32)
    choirs = np.asarray(ana["choir"], dtype=np.float32)
    energies = np.asarray(ana["energy"], dtype=np.float32)
    specs = np.asarray(ana["spectrum"], dtype=np.float32)

    last_shock_t = -10.0
    prev_kick = 0.0

    # Render all frames!
    pbo_read_bytes = bytearray(WIDTH * HEIGHT * 3)
    for fi in range(n_frames):
        t = fi / float(FPS)

        kick = float(kicks[fi])
        snare = float(snares[fi])
        bass = float(basses[fi])
        chord = float(chords_e[fi])
        lead = float(leads[fi])
        arp = float(arps[fi])
        piano = float(pianos[fi])
        choir = float(choirs[fi])
        energy = float(energies[fi])

        # Trigger shockwave on major structural drops or strong Drop kicks
        for imp_t in IMPACT_TIMES:
            if abs(t - imp_t) < (0.6 / FPS):
                last_shock_t = t
        if (52.5 <= t < 82.5 or 105.0 <= t < 135.0) and kick > 0.78 and prev_kick <= 0.78 and (t - last_shock_t) > 0.88:
            last_shock_t = t
        prev_kick = kick

        shock_age = t - last_shock_t if (t - last_shock_t) < 1.2 else -1.0

        # Impact white-cyan flash decay at major act drops
        impact_flash = 0.0
        for imp_t in (52.5, 67.5, 105.0, 120.0):
            dt = t - imp_t
            if 0.0 <= dt < 0.75:
                impact_flash = max(impact_flash, math.exp(-dt * 6.5))

        # Tension buildup ramp (Pre-Chorus Bars 20-27 & Bridge Build Bars 52-55)
        buildup = 0.0
        if 37.5 <= t < 51.6:
            buildup = ((t - 37.5) / 14.1) ** 1.6
        elif 97.5 <= t < 104.2:
            buildup = ((t - 97.5) / 6.7) ** 1.5

        # Update 48-band FFT spectrum GPU texture
        spec_tex.write(specs[fi].tobytes())

        scA, scB, bl, trans_t = get_scene_state(t)

        # ---- PASS 1: Main World & VFX ----
        fbo_main.use()
        ctx.viewport = (0, 0, WIDTH, HEIGHT)
        scene_texs[scA].use(location=0)
        depth_texs[scA].use(location=1)
        scene_texs[scB].use(location=2)
        depth_texs[scB].use(location=3)
        spec_tex.use(location=4)

        def set_u(prog, name, val):
            if name in prog:
                prog[name].value = val

        set_u(prog_main, "u_time", t)
        set_u(prog_main, "u_blend", bl)
        set_u(prog_main, "u_sceneA", scA)
        set_u(prog_main, "u_sceneB", scB)
        set_u(prog_main, "u_transType", trans_t)
        set_u(prog_main, "u_kick", kick)
        set_u(prog_main, "u_snare", snare)
        set_u(prog_main, "u_bass", bass)
        set_u(prog_main, "u_chords", chord)
        set_u(prog_main, "u_lead", lead)
        set_u(prog_main, "u_arp", arp)
        set_u(prog_main, "u_piano", piano)
        set_u(prog_main, "u_choir", choir)
        set_u(prog_main, "u_energy", energy)
        lb_cur = get_letterbox(t)
        set_u(prog_main, "u_impactFlash", impact_flash)
        set_u(prog_main, "u_shockAge", shock_age)
        set_u(prog_main, "u_buildup", buildup)
        set_u(prog_main, "u_letterbox", lb_cur)
        vao_main.render(moderngl.TRIANGLE_STRIP)

        # ---- PASS 2: HDR Bright Extract (Half-Res) ----
        fbo_b1.use()
        ctx.viewport = (0, 0, bw, bh)
        tex_main.use(location=5)
        prog_bright["u_bloomBoost"].value = 0.58 + 0.26 * chord + 0.22 * impact_flash
        vao_bright.render(moderngl.TRIANGLE_STRIP)

        # ---- PASS 3: 2-Iteration Separable Anamorphic Bloom Blur ----
        # Slightly wider horizontal spread for signature sci-fi / Makoto Shinkai anamorphic flare!
        for rad in (1.0, 2.2):
            fbo_b2.use()
            tex_b1.use(location=6)
            prog_blur["u_dir"].value = (rad * 2.1 / bw, 0.0)
            vao_blur.render(moderngl.TRIANGLE_STRIP)

            fbo_b1.use()
            tex_b2.use(location=6)
            prog_blur["u_dir"].value = (0.0, rad * 1.15 / bh)
            vao_blur.render(moderngl.TRIANGLE_STRIP)

        # ---- PASS 4: Final Composite + Typography + ACES Filmic Grading ----
        # Find active typography card
        active_typo_idx = 0
        typo_alpha = 0.0
        typo_shift = 0.0
        for idx_c, (cts, cte, ckind, _, _, _) in enumerate(TYPOGRAPHY_CARDS):
            if cts <= t <= cte:
                active_typo_idx = idx_c
                fi_dur = 1.15 if ckind != "poem" else 0.75
                fo_dur = 1.15 if ckind != "poem" else 0.85
                a_in = smoothstep(cts, cts + fi_dur, t)
                a_out = 1.0 - smoothstep(cte - fo_dur, cte, t)
                typo_alpha = a_in * a_out
                # Subtle graceful upward drift as typography appears
                typo_shift = (1.0 - a_in) * -0.014 + (1.0 - a_out) * 0.008
                break

        # Global warm grade shift during Supernova & Sunrise Dawn
        warm_grade = smoothstep(104.5, 112.0, t) * 0.45 + smoothstep(134.0, 139.0, t) * 0.55
        # Smooth cinema fade-in (0..1.8s) and graceful fade-to-black (151.2..154.0s)
        g_fade = smoothstep(0.0, 1.8, t) * (1.0 - smoothstep(total_sec - 2.6, total_sec - 0.15, t))

        fbo_out.use()
        ctx.viewport = (0, 0, WIDTH, HEIGHT)
        tex_main.use(location=5)
        tex_b1.use(location=7)
        typo_texs[active_typo_idx].use(location=8)

        prog_final["u_time"].value = t
        prog_final["u_typoAlpha"].value = typo_alpha
        prog_final["u_typoShiftY"].value = typo_shift
        prog_final["u_letterbox"].value = get_letterbox(t)
        prog_final["u_fade"].value = g_fade
        prog_final["u_warmGrade"].value = warm_grade
        prog_final["u_energy"].value = energy
        vao_final.render(moderngl.TRIANGLE_STRIP)

        # Read 1920x1080 RGB24 directly into bytearray and stream to FFmpeg stdin
        fbo_out.read_into(pbo_read_bytes, components=3)
        proc.stdin.write(pbo_read_bytes)

        if (fi + 1) % 600 == 0 or fi + 1 == n_frames:
            elapsed = time.time() - t0
            fps_cur = (fi + 1) / max(elapsed, 1e-4)
            pct = 100.0 * (fi + 1) / n_frames
            print(f"  Frame {fi + 1:5d}/{n_frames} ({pct:5.1f}%) | {fps_cur:5.1f} fps | elapsed {elapsed:5.1f}s", flush=True)

    proc.stdin.close()
    stderr_out = proc.stderr.read().decode("utf-8", errors="ignore")
    ret = proc.wait()
    if ret != 0:
        print("FFmpeg ERROR:\n", stderr_out[-2000:], file=sys.stderr)
        raise RuntimeError(f"FFmpeg exited with code {ret}")

    size_mb = os.path.getsize(OUT_MP4) / (1024.0 * 1024.0)
    print(f"=== SUCCESS! Rendered {OUT_MP4} ({size_mb:.1f} MB) in {time.time() - t0:.1f}s! ===")


if __name__ == "__main__":
    render_mv()
