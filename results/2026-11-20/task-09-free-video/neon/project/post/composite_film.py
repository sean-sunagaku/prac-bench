"""
composite_film.py — Cinema Finishing, Dynamic IMAX Expansion, Supersampled Bilingual Typography,
Film Grain, Transitions & Final H.264/AAC Mastering for "KAIROS — 光を紡ぐ" (1920x1080 @ 24fps, 44.0s).
"""
import math
import os
import subprocess
import sys
import time
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1920, 1080
FPS = 24
TOTAL_FRAMES = 1056  # 44.0 seconds exact (22 bars @ 120 BPM)

FONT_MINCHO = "/System/Library/Fonts/ヒラギノ明朝 ProN.ttc"
FONT_SANS_JP = "/System/Library/Fonts/ヒラギノ角ゴシック W2.ttc"
FONT_SF_LIGHT = "/Library/Fonts/SF-Pro-Display-Light.otf"
FONT_SF_THIN = "/Library/Fonts/SF-Pro-Display-Thin.otf"
FONT_SF_REG = "/Library/Fonts/SF-Pro-Display-Regular.otf"


def clamp01(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


def smoothstep(x: float) -> float:
    x = clamp01(x)
    return x * x * (3.0 - 2.0 * x)


def smootherstep(x: float) -> float:
    x = clamp01(x)
    return x * x * x * (x * (x * 6.0 - 15.0) + 10.0)


def build_vignette_mask(w: int, h: int, strength: float = 0.16) -> np.ndarray:
    y = np.linspace(-1.0, 1.0, h, dtype=np.float32)[:, None]
    x = np.linspace(-1.0, 1.0, w, dtype=np.float32)[None, :]
    r2 = (x * x * 0.85 + y * y)
    mask = 1.0 - strength * np.clip((r2 - 0.35) / 1.45, 0.0, 1.0) ** 1.6
    return mask[:, :, None]


def draw_tracked_text(draw, text: str, x: float, y: float, font, fill, tracking: float = 0.0, anchor: str = "lt"):
    """Draws text with precise sub-pixel-like letter tracking (supports centered or left aligned)."""
    widths = []
    for ch in text:
        bbox = font.getbbox(ch)
        widths.append((bbox[2] - bbox[0]) if bbox else 0)
    total_w = sum(widths) + tracking * max(0, len(text) - 1)
    cur_x = x - total_w * 0.5 if anchor == "mt" else x
    for ch, cw in zip(text, widths):
        draw.text((cur_x, y), ch, font=font, fill=fill)
        cur_x += cw + tracking
    return total_w


def render_chapter_card_rgba(jp_line: str, en_tag: str, progress: float, y_bottom_anchor: int = 862) -> np.ndarray:
    """
    Renders razor-sharp 2x-supersampled minimalist poetic intertitle with soft dark cinema halo
    and subtle animated champagne-gold hairline rule. Returns float32 RGBA in [0, 1] at (H, W, 4).
    """
    # Fade envelope: smooth in over first 20%, hold, smooth out over last 22%
    if progress <= 0.0 or progress >= 1.0:
        return None
    alpha_in = smootherstep(progress / 0.20)
    alpha_out = smootherstep((1.0 - progress) / 0.22)
    alpha = alpha_in * alpha_out
    if alpha < 0.005:
        return None

    scale = 2
    cw, ch = W * scale, H * scale
    layer = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    shadow = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))

    f_jp = ImageFont.truetype(FONT_MINCHO, 36 * scale, index=0)
    f_en = ImageFont.truetype(FONT_SF_LIGHT, 15 * scale)

    # Subtle gentle horizontal drift & tracking breathe
    drift_x = (1.0 - alpha_in) * (-18.0 * scale) + (1.0 - alpha_out) * (10.0 * scale)
    base_x = 122 * scale + drift_x
    base_y = y_bottom_anchor * scale

    d_sh = ImageDraw.Draw(shadow)
    d_fg = ImageDraw.Draw(layer)

    a_jp = int(round(238 * alpha))
    a_en = int(round(178 * alpha))
    a_line = int(round(185 * alpha))
    a_sh = int(round(160 * alpha))

    track_jp = (6.0 + 3.5 * progress) * scale
    track_en = 6.5 * scale

    # Soft shadow layer for effortless readability over luminous reflections
    draw_tracked_text(d_sh, jp_line, base_x, base_y, f_jp, (4, 6, 14, a_sh), tracking=track_jp, anchor="lt")
    draw_tracked_text(d_sh, en_tag, base_x, base_y - 30 * scale, f_en, (4, 6, 14, a_sh), tracking=track_en, anchor="lt")
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=9 * scale))

    # Crisp foreground typography
    # Thin champagne-gold vertical tick + subtle expanding underline
    line_w = int(round(56 * scale * alpha_in))
    d_fg.rectangle([base_x, base_y - 10 * scale, base_x + line_w, base_y - 8 * scale], fill=(238, 194, 114, a_line))
    draw_tracked_text(d_fg, en_tag, base_x, base_y - 32 * scale, f_en, (236, 204, 146, a_en), tracking=track_en, anchor="lt")
    draw_tracked_text(d_fg, jp_line, base_x, base_y + 4 * scale, f_jp, (248, 244, 236, a_jp), tracking=track_jp, anchor="lt")

    comp = Image.alpha_composite(shadow, layer)
    comp = comp.resize((W, H), Image.Resampling.LANCZOS)
    return np.asarray(comp, dtype=np.float32) / 255.0


def render_finale_title_rgba(progress: float, title_center_y: int = 790) -> np.ndarray:
    """
    Renders museum-grade closing title card ("K A I R O S" + "光 を 紡 ぐ") with animated
    champagne-gold hairline emblem and subtle specular light sweep across the letters.
    """
    if progress <= 0.0 or progress >= 1.0:
        return None
    alpha_in = smootherstep(progress / 0.24)
    alpha_out = smootherstep((1.0 - progress) / 0.22)
    alpha = alpha_in * alpha_out
    if alpha < 0.004:
        return None

    scale = 2
    cw, ch = W * scale, H * scale
    layer = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    shadow = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))

    f_title = ImageFont.truetype(FONT_SF_LIGHT, 74 * scale)
    f_sub_jp = ImageFont.truetype(FONT_MINCHO, 30 * scale, index=0)
    f_credit = ImageFont.truetype(FONT_SF_THIN, 15 * scale)

    cx = cw * 0.5
    cy = title_center_y * scale

    # Subtle refined tracking expansion as the title breathes open
    track_main = (30.0 + 10.0 * smootherstep(progress)) * scale
    track_jp = (14.0 + 4.0 * progress) * scale
    track_cr = 6.5 * scale

    d_sh = ImageDraw.Draw(shadow)
    d_fg = ImageDraw.Draw(layer)

    a_main = int(round(248 * alpha))
    a_jp = int(round(225 * alpha * smootherstep((progress - 0.08) / 0.22)))
    a_cr = int(round(165 * alpha * smootherstep((progress - 0.16) / 0.22)))
    a_gold = int(round(215 * alpha * smootherstep((progress - 0.05) / 0.20)))

    # Soft dark halo behind title for pristine contrast over shimmering water
    draw_tracked_text(d_sh, "KAIROS", cx, cy - 58 * scale, f_title, (4, 6, 16, int(235 * alpha)), tracking=track_main, anchor="mt")
    draw_tracked_text(d_sh, "光を紡ぐ", cx, cy + 50 * scale, f_sub_jp, (4, 6, 16, int(225 * alpha)), tracking=track_jp, anchor="mt")
    draw_tracked_text(d_sh, "CRAFTED FROM CODE  ·  3D  ·  MOTION  ·  SOUND", cx, cy + 106 * scale, f_credit, (4, 6, 16, int(210 * alpha)), tracking=track_cr, anchor="mt")
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=14 * scale))

    # Main Title
    draw_tracked_text(d_fg, "KAIROS", cx, cy - 58 * scale, f_title, (254, 250, 244, a_main), tracking=track_main, anchor="mt")

    # Sculpted champagne-gold hairline divider with tiny geometric diamond at center!
    line_half = int(round(150 * scale * smootherstep((progress - 0.05) / 0.22)))
    div_y = cy + 32 * scale
    if line_half > 16 * scale:
        d_fg.line([(cx - line_half, div_y), (cx - 14 * scale, div_y)], fill=(242, 202, 124, a_gold), width=2)
        d_fg.line([(cx + 14 * scale, div_y), (cx + line_half, div_y)], fill=(242, 202, 124, a_gold), width=2)
        # Central tiny diamond glyph
        ds = 5.5 * scale
        d_fg.polygon([(cx, div_y - ds), (cx + ds, div_y), (cx, div_y + ds), (cx - ds, div_y)], outline=(248, 216, 148, a_gold), width=2)

    # Japanese Subtitle & Credit
    if a_jp > 2:
        draw_tracked_text(d_fg, "光を紡ぐ", cx, cy + 50 * scale, f_sub_jp, (252, 246, 234, a_jp), tracking=track_jp, anchor="mt")
    if a_cr > 2:
        draw_tracked_text(d_fg, "CRAFTED FROM CODE  ·  3D  ·  MOTION  ·  SOUND", cx, cy + 106 * scale, f_credit, (235, 226, 212, a_cr), tracking=track_cr, anchor="mt")

    comp = Image.alpha_composite(shadow, layer)
    comp = comp.resize((W, H), Image.Resampling.LANCZOS)
    arr = np.asarray(comp, dtype=np.float32) / 255.0

    # Animated subtle warm golden specular sweep passing across "KAIROS" letters!
    sweep_u = clamp01((progress - 0.18) / 0.55)
    if 0.0 < sweep_u < 1.0:
        sweep_x = int(lerp_f(W * 0.28, W * 0.72, smootherstep(sweep_u)))
        xs = np.arange(W, dtype=np.float32)[None, :]
        glint = np.exp(-((xs - sweep_x) / 58.0) ** 2) * 0.42 * math.sin(sweep_u * math.pi)
        # Apply only where text alpha > 0
        arr[:, :, 0] = np.clip(arr[:, :, 0] + glint * arr[:, :, 3] * 1.0, 0.0, 1.0)
        arr[:, :, 1] = np.clip(arr[:, :, 1] + glint * arr[:, :, 3] * 0.85, 0.0, 1.0)
        arr[:, :, 2] = np.clip(arr[:, :, 2] + glint * arr[:, :, 3] * 0.50, 0.0, 1.0)
    return arr


def lerp_f(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def load_frame_rgb(path: str) -> np.ndarray:
    im = Image.open(path).convert("RGB")
    arr = np.asarray(im, dtype=np.float32) / 255.0
    if arr.shape[0] == 804 and arr.shape[1] == 1920:
        # Embed 2.39:1 CinemaScope frame cleanly into 1920x1080 container
        canvas = np.zeros((H, W, 3), dtype=np.float32)
        pad = (H - 804) // 2  # 138 px top & bottom
        canvas[pad : pad + 804, :, :] = arr
        return canvas
    if arr.shape[0] != H or arr.shape[1] != W:
        im = im.resize((W, H), Image.Resampling.LANCZOS)
        arr = np.asarray(im, dtype=np.float32) / 255.0
    return arr


def apply_optical_zoom(frame: np.ndarray, zoom: float) -> np.ndarray:
    if abs(zoom - 1.0) < 1e-4:
        return frame
    im = Image.fromarray(np.clip(frame * 255.0, 0, 255).astype(np.uint8))
    nw, nh = int(round(W * zoom)), int(round(H * zoom))
    im = im.resize((nw, nh), Image.Resampling.BILINEAR)
    x0 = (nw - W) // 2
    y0 = (nh - H) // 2
    im = im.crop((x0, y0, x0 + W, y0 + H))
    return np.asarray(im, dtype=np.float32) / 255.0


def apply_screen_flash(frame: np.ndarray, strength: float, tint=(1.0, 0.88, 0.66)) -> np.ndarray:
    if strength <= 1e-4:
        return frame
    t_arr = np.array(tint, dtype=np.float32)[None, None, :] * strength
    # Screen blend feels like authentic optical film halation (never harsh clipping!)
    return 1.0 - (1.0 - frame) * (1.0 - np.clip(t_arr, 0.0, 0.98))


def composite_film(output_mp4: str, audio_wav: str, title_center_y: int = 842):
    shots = [
        (0,   192, "project/renders/shot1"),
        (192, 192, "project/renders/shot2"),
        (384, 192, "project/renders/shot3"),
        (576, 240, "project/renders/shot4"),
        (816, 240, "project/renders/shot5"),
    ]

    # Verify all 1,056 frames exist before launching ffmpeg!
    for f0, count, folder in shots:
        for lf in range(count):
            p = os.path.join(folder, f"frame_{lf:04d}.png")
            if not os.path.exists(p):
                raise FileNotFoundError(f"Missing rendered frame: {p}")

    vig = build_vignette_mask(W, H, strength=0.15)
    rng = np.random.default_rng(2026)

    # Poetic Chapter Cards timeline: (start_f, end_f, jp, en, y_anchor)
    chapters = [
        (50,  166, "静寂から、ひとつの光。", "I  ·  AWAKENING",       822),
        (220, 348, "混沌は、構造を宿す。",   "II  ·  CRYSTALLIZATION", 822),
        (414, 534, "時と光が、共鳴する。",   "III  ·  RESONANCE",     822),
        (612, 756, "境界を、越えていく。",   "IV  ·  ASCENSION",      920),
    ]

    cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-pix_fmt", "rgb24",
        "-s", f"{W}x{H}",
        "-r", str(FPS),
        "-i", "-",
        "-i", audio_wav,
        "-c:v", "libx264",
        "-preset", "slow",
        "-crf", "15",
        "-pix_fmt", "yuv420p",
        "-profile:v", "high",
        "-level:v", "4.2",
        "-color_primaries", "bt709",
        "-color_trc", "bt709",
        "-colorspace", "bt709",
        "-c:a", "aac",
        "-b:a", "320k",
        "-ar", "48000",
        "-movflags", "+faststart",
        "-shortest",
        output_mp4,
    ]
    print(f"Encoding mastered cinema MP4 -> {output_mp4} ...", flush=True)
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    t_start = time.time()

    for gf in range(TOTAL_FRAMES):
        # 1. Locate shot & local frame
        for f0, count, folder in shots:
            if f0 <= gf < f0 + count:
                lf = gf - f0
                frame = load_frame_rgb(os.path.join(folder, f"frame_{lf:04d}.png"))
                break

        # 2. Transitions & Optical Effects
        # Shot 1 -> Shot 2: Golden Bloom Match-Cut right on Bar 5 (f=192)
        if 186 <= gf <= 200:
            dist = abs(gf - 192)
            flash = math.exp(-(dist / 3.8) ** 2) * 0.42
            frame = apply_screen_flash(frame, flash, tint=(1.0, 0.86, 0.56))

        # Shot 2 -> Shot 3: Crisp Bar 9 Drum Drop Impact Punch (f=384)
        if 384 <= gf <= 391:
            u = (gf - 384) / 7.0
            zoom = 1.0 + 0.022 * ((1.0 - u) ** 2)
            frame = apply_optical_zoom(frame, zoom)
            frame = apply_screen_flash(frame, 0.28 * ((1.0 - u) ** 2), tint=(1.0, 0.90, 0.72))

        # Shot 3 -> Shot 4: SUPERNOVA BLOOM + IMAX ASPECT-RATIO EXPANSION (f=576)!
        if 566 <= gf <= 592:
            dist = abs(gf - 576)
            flash = math.exp(-(dist / 5.5) ** 2) * 0.88
            frame = apply_screen_flash(frame, flash, tint=(1.0, 0.94, 0.80))

        # Shot 4 -> Shot 5: Ethereal Golden Dawn Light Mist Bridge (f=816)
        if 802 <= gf <= 832:
            dist = abs(gf - 816)
            mist = math.exp(-(dist / 7.2) ** 2) * 0.58
            frame = apply_screen_flash(frame, mist, tint=(1.0, 0.84, 0.58))

        # 3. Subtle Vignette & Fine Organic 35mm Film Grain (prevents banding!)
        frame = frame * vig
        grain = rng.normal(0.0, 0.0085, size=(H, W, 1)).astype(np.float32)
        frame = np.clip(frame + grain, 0.0, 1.0)

        # 4. Dynamic CinemaScope -> FULL 16:9 IMAX Letterbox Choreography!
        # Acts I & II (0..383): 138px bars (already baked into 1920x804)
        # Act III (384..555): 138px crisp velvet bars
        # IMAX EXPANSION (556..584): Smoothly opens 138px -> 0px right across the Bar 13 climax drop!!
        if 384 <= gf < 584:
            if gf < 556:
                bar_h = 138
            else:
                open_u = smootherstep((gf - 556) / 28.0)
                bar_h = int(round(138.0 * (1.0 - open_u)))
            if bar_h > 0:
                frame[:bar_h, :, :] = 0.0
                frame[H - bar_h :, :, :] = 0.0

        # 5. Poetic Chapter Intertitles
        for s_f, e_f, jp_txt, en_txt, y_anc in chapters:
            if s_f <= gf <= e_f:
                prog = (gf - s_f) / float(e_f - s_f)
                rgba = render_chapter_card_rgba(jp_txt, en_txt, prog, y_bottom_anchor=y_anc)
                if rgba is not None:
                    a = rgba[:, :, 3:4]
                    frame = frame * (1.0 - a) + rgba[:, :, :3] * a

        # 6. Grand Finale Title Reveal ("K A I R O S  /  光 を 紡 ぐ")
        if 914 <= gf <= 1042:
            prog = (gf - 914) / float(1042 - 914)
            rgba = render_finale_title_rgba(prog, title_center_y=title_center_y)
            if rgba is not None:
                a = rgba[:, :, 3:4]
                frame = frame * (1.0 - a) + rgba[:, :, :3] * a

        # 7. Opening Fade-In (0..26) & Closing Velvet Fade-Out (1014..1055)
        if gf < 26:
            frame *= smootherstep(gf / 26.0)
        elif gf >= 1014:
            frame *= smootherstep((TOTAL_FRAMES - 1 - gf) / 41.0)

        out_u8 = np.clip(np.round(frame * 255.0), 0, 255).astype(np.uint8)
        proc.stdin.write(out_u8.tobytes())

        if gf % 120 == 0 or gf == TOTAL_FRAMES - 1:
            print(f"[COMPOSITE] frame {gf+1:4d}/{TOTAL_FRAMES} ({time.time()-t_start:.1f}s)", flush=True)

    proc.stdin.close()
    ret = proc.wait()
    if ret != 0:
        raise RuntimeError(f"FFmpeg exited with code {ret}")
    print(f"[MASTER COMPLETE] {output_mp4} encoded in {time.time()-t_start:.1f}s!", flush=True)


if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else "KAIROS_Weaving_Light.mp4"
    composite_film(out_file, "project/audio/kairos_master.wav")
