#!/usr/bin/env python3
"""Build native editable PowerPoint presentation (antigravity_presentation.pptx)."""

from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageOps
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml import parse_xml
from pptx.oxml.ns import qn
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "presentation_assets"
BUILD = ROOT / "presentation_build"
OUT_PPTX = ROOT / "antigravity_presentation.pptx"

FONT_JA = "Hiragino Sans"
FONT_MONO = "Menlo"

# Palette
C_BG_LIGHT = RGBColor(0xF8, 0xFA, 0xFC)
C_BG_PROOF = RGBColor(0xF1, 0xF5, 0xFD)
C_BG_DARK = RGBColor(0x09, 0x0E, 0x1A)
C_WHITE = RGBColor(0xFF, 0xFF, 0xFF)
C_SURFACE_OLD = RGBColor(0xF1, 0xF5, 0xF9)
C_SURFACE_DARK = RGBColor(0x11, 0x1A, 0x2E)
C_SURFACE_DARK2 = RGBColor(0x16, 0x22, 0x3A)
C_BORDER = RGBColor(0xE2, 0xE8, 0xF0)
C_BORDER_BLUE = RGBColor(0xBF, 0xDB, 0xFE)
C_BORDER_TEAL = RGBColor(0x99, 0xF6, 0xE4)
C_BORDER_DARK = RGBColor(0x28, 0x38, 0x56)
C_INK = RGBColor(0x0F, 0x17, 0x2A)
C_INK2 = RGBColor(0x33, 0x41, 0x55)
C_MUTED = RGBColor(0x64, 0x74, 0x8B)
C_INK_DARK = RGBColor(0xF8, 0xFA, 0xFC)
C_INK_DARK2 = RGBColor(0xCB, 0xD5, 0xE1)
C_MUTED_DARK = RGBColor(0x94, 0xA3, 0xB8)
C_COBALT = RGBColor(0x25, 0x63, 0xEB)
C_COBALT_SOFT = RGBColor(0xEF, 0xF6, 0xFF)
C_INDIGO = RGBColor(0x4F, 0x46, 0xE5)
C_INDIGO_SOFT = RGBColor(0xEE, 0xF2, 0xFF)
C_CYAN = RGBColor(0x38, 0xBD, 0xF8)
C_SKY = RGBColor(0x02, 0x84, 0xC7)
C_TEAL = RGBColor(0x0D, 0x94, 0x88)
C_TEAL_SOFT = RGBColor(0xF0, 0xFD, 0xFA)
C_SLATE = RGBColor(0x33, 0x41, 0x55)
C_AMBER = RGBColor(0xFB, 0xBF, 0x24)


def prepare_images() -> dict[str, Path]:
    """Create aspect-matched, scrim-composited PNGs for crisp PPTX rendering."""
    out = {}

    # 1. Cover hero with left-to-right smooth dark scrim (1920x1080)
    hero_src = Image.open(ASSETS / "hero_bg.png").convert("RGBA")
    hero_fit = ImageOps.fit(hero_src, (1920, 1080), Image.Resampling.LANCZOS)
    scrim = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    px = scrim.load()
    for x in range(1920):
        t = x / 1919.0
        if t < 0.45:
            a = int(245 - (t / 0.45) * 20)
        elif t < 0.75:
            a = int(225 - ((t - 0.45) / 0.30) * 145)
        else:
            a = int(80 - ((t - 0.75) / 0.25) * 45)
        for y in range(1080):
            px[x, y] = (9, 14, 26, max(0, min(255, a)))
    cover_img = Image.alpha_composite(hero_fit, scrim).convert("RGB")
    p_cover = BUILD / "pptx_cover_bg.png"
    cover_img.save(p_cover, optimize=True)
    out["cover"] = p_cover

    # 2. Closing hero (horizontally flipped + smooth dark scrim)
    closing_fit = ImageOps.mirror(hero_fit)
    scrim2 = Image.new("RGBA", (1920, 1080), (9, 14, 26, 212))
    closing_img = Image.alpha_composite(closing_fit, scrim2).convert("RGB")
    p_closing = BUILD / "pptx_closing_bg.png"
    closing_img.save(p_closing, optimize=True)
    out["closing"] = p_closing

    # 3. Orchestration backdrop (1920x1080 + calm dark veil)
    orch_src = Image.open(ASSETS / "orchestration_bg.png").convert("RGBA")
    orch_fit = ImageOps.fit(orch_src, (1920, 1080), Image.Resampling.LANCZOS)
    veil = Image.new("RGBA", (1920, 1080), (9, 14, 26, 155))
    orch_img = Image.alpha_composite(orch_fit, veil).convert("RGB")
    p_orch = BUILD / "pptx_orch_bg.png"
    orch_img.save(p_orch, optimize=True)
    out["orch"] = p_orch

    # 4. Multimodal showcase (fitted cleanly to target box 4.65 x 4.45 in => 930x890)
    multi_src = Image.open(ASSETS / "multimodal_visual.png").convert("RGB")
    multi_fit = ImageOps.fit(multi_src, (960, 920), Image.Resampling.LANCZOS)
    p_multi = BUILD / "pptx_multi.png"
    multi_fit.save(p_multi, optimize=True)
    out["multi"] = p_multi

    return out


def set_bg(slide, color: RGBColor) -> None:
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color


def strip_shadow(shape) -> None:
    """Ensure shape renders cleanly flat without default theme drop shadows."""
    shape.shadow.inherit = False
    spPr = shape._element.spPr
    for eff in list(spPr.findall(qn("a:effectLst"))):
        spPr.remove(eff)
    spPr.append(parse_xml('<a:effectLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/>'))


def set_run_font(run, font_name: str, ea_font: str = FONT_JA) -> None:
    """Bind Latin, East Asian, and Complex Script font faces on a run."""
    run.font.name = font_name
    rPr = run._r.get_or_add_rPr()
    for tag, face in (("a:latin", font_name), ("a:ea", ea_font), ("a:cs", font_name)):
        for existing in list(rPr.findall(qn(tag))):
            rPr.remove(existing)
        rPr.append(
            parse_xml(f'<{tag} xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" typeface="{face}"/>')
        )


def add_rect(
    slide,
    x: float,
    y: float,
    w: float,
    h: float,
    fill_color: RGBColor | None = None,
    line_color: RGBColor | None = None,
    line_pt: float = 1.0,
    rounded: bool = False,
    radius: float = 0.06,
):
    shape_type = MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE
    sh = slide.shapes.add_shape(shape_type, Inches(x), Inches(y), Inches(w), Inches(h))
    if rounded and len(sh.adjustments) > 0:
        sh.adjustments[0] = radius
    if fill_color is not None:
        sh.fill.solid()
        sh.fill.fore_color.rgb = fill_color
    else:
        sh.fill.background()
    if line_color is not None:
        sh.line.color.rgb = line_color
        sh.line.width = Pt(line_pt)
    else:
        sh.line.fill.background()
    strip_shadow(sh)
    return sh


def add_text(
    slide,
    x: float,
    y: float,
    w: float,
    h: float,
    text: str,
    size: float = 13,
    bold: bool = False,
    color: RGBColor = C_INK,
    font_name: str = FONT_JA,
    align: PP_ALIGN = PP_ALIGN.LEFT,
    valign: MSO_ANCHOR = MSO_ANCHOR.TOP,
    line_spacing: float = 1.25,
):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = valign
    tf.margin_left = Inches(0.03)
    tf.margin_right = Inches(0.03)
    tf.margin_top = Inches(0.02)
    tf.margin_bottom = Inches(0.02)
    for idx, line in enumerate(text.split("\n")):
        p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = line_spacing
        run = p.add_run()
        run.text = line
        set_run_font(run, font_name, FONT_JA)
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.color.rgb = color
    return tb


def add_pill(
    slide,
    x: float,
    y: float,
    w: float,
    h: float,
    text: str,
    fill_color: RGBColor,
    text_color: RGBColor,
    border_color: RGBColor | None = None,
    size: float = 9.5,
    font_name: str = FONT_MONO,
):
    sh = add_rect(slide, x, y, w, h, fill_color=fill_color, line_color=border_color, line_pt=0.9, rounded=True, radius=0.45)
    tf = sh.text_frame
    tf.word_wrap = False
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_left = Inches(0.06)
    tf.margin_right = Inches(0.06)
    tf.margin_top = Inches(0)
    tf.margin_bottom = Inches(0)
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    run = p.add_run()
    run.text = text
    set_run_font(run, font_name, FONT_JA)
    run.font.size = Pt(size)
    run.font.bold = True
    run.font.color.rgb = text_color
    return sh


def add_oval(slide, x: float, y: float, w: float, h: float, fill_color: RGBColor):
    ov = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x), Inches(y), Inches(w), Inches(h))
    ov.fill.solid()
    ov.fill.fore_color.rgb = fill_color
    ov.line.fill.background()
    strip_shadow(ov)
    return ov


def add_header(slide, eyebrow: str, title: str, subtitle: str, dark: bool = False) -> None:
    accent = C_CYAN if dark else C_COBALT
    add_rect(slide, 0.62, 0.56, 0.22, 0.03, fill_color=accent)
    add_text(slide, 0.92, 0.44, 6.0, 0.26, eyebrow, size=9.5, bold=True, color=accent, font_name=FONT_MONO)
    add_text(
        slide,
        0.62,
        0.72,
        12.1,
        0.48,
        title,
        size=24,
        bold=True,
        color=C_INK_DARK if dark else C_INK,
        line_spacing=1.15,
    )
    add_text(
        slide,
        0.62,
        1.22,
        11.8,
        0.34,
        subtitle,
        size=11.5,
        bold=False,
        color=C_MUTED_DARK if dark else C_MUTED,
        line_spacing=1.25,
    )


def add_footer(slide, page: int, total: int = 10, dark: bool = False) -> None:
    line_c = C_BORDER_DARK if dark else C_BORDER
    txt_c = C_MUTED_DARK if dark else C_MUTED
    add_rect(slide, 0.62, 6.96, 12.09, 0.012, fill_color=line_c)
    add_oval(slide, 0.62, 7.095, 0.08, 0.08, C_CYAN if dark else C_COBALT)
    add_text(slide, 0.76, 7.03, 5.0, 0.24, "Antigravity — Capability Overview", size=9.5, bold=True, color=txt_c)
    add_text(
        slide,
        11.2,
        7.03,
        1.5,
        0.24,
        f"{page:02d} / {total:02d}",
        size=9.5,
        bold=True,
        color=txt_c,
        font_name=FONT_MONO,
        align=PP_ALIGN.RIGHT,
    )


def build_pptx() -> None:
    imgs = prepare_images()
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]

    # ==================== SLIDE 1: COVER ====================
    s1 = prs.slides.add_slide(blank)
    set_bg(s1, C_BG_DARK)
    s1.shapes.add_picture(str(imgs["cover"]), Inches(0), Inches(0), width=Inches(13.333), height=Inches(7.5))

    add_pill(
        s1, 0.72, 0.68, 4.15, 0.34,
        "GOOGLE DEEPMIND  •  AGENTIC AI ASSISTANT",
        fill_color=RGBColor(0x0F, 0x17, 0x2A),
        text_color=C_CYAN,
        border_color=RGBColor(0x28, 0x64, 0x94),
        size=9.5,
    )

    add_text(s1, 0.72, 1.85, 7.5, 1.05, "Antigravity", size=54, bold=True, color=C_WHITE, line_spacing=1.05)
    add_text(
        s1, 0.72, 3.02, 7.2, 1.05,
        "思考から実装・検証までを自律完遂する、\n次世代エージェント型AIパートナー",
        size=20, bold=True, color=RGBColor(0xE2, 0xE8, 0xF0), line_spacing=1.38,
    )
    add_text(
        s1, 0.72, 4.22, 6.45, 0.95,
        "質問に答えるだけのチャットを超え、実環境でのコード編集・コマンド実行・\nマルチエージェント並列処理・視覚検証までを一気通貫で担います。",
        size=12, bold=False, color=C_MUTED_DARK, line_spacing=1.55,
    )

    add_rect(s1, 0.72, 6.18, 11.88, 0.014, fill_color=C_BORDER_DARK)
    specs = [
        ("EXECUTION", "自律設計・実装・自己修復"),
        ("SCALE", "並列マルチエージェント統括"),
        ("DELIVERY", "検証済み成果物の一貫納品"),
    ]
    for i, (k, v) in enumerate(specs):
        sx = 0.72 + i * 3.1
        add_text(s1, sx, 6.32, 2.8, 0.22, k, size=8.5, bold=True, color=C_CYAN, font_name=FONT_MONO)
        add_text(s1, sx, 6.56, 2.9, 0.3, v, size=11, bold=True, color=RGBColor(0xE2, 0xE8, 0xF0))
    add_text(s1, 9.75, 6.46, 2.85, 0.28, "CAPABILITY OVERVIEW • 2026", size=9.5, bold=True, color=RGBColor(0xE2, 0xE8, 0xF0), font_name=FONT_MONO, align=PP_ALIGN.RIGHT)

    # ==================== SLIDE 2: PARADIGM SHIFT ====================
    s2 = prs.slides.add_slide(blank)
    set_bg(s2, C_BG_LIGHT)
    add_header(
        s2, "01  PARADIGM SHIFT",
        "「答えるAI」から「やり遂げるAI」へ",
        "助言を返すだけで終わらず、実際の環境で手を動かし、検証済みの成果物として仕上げます。",
    )

    # Old card
    add_rect(s2, 0.62, 1.72, 5.55, 4.32, fill_color=C_SURFACE_OLD, line_color=C_BORDER, line_pt=1.0, rounded=True, radius=0.04)
    add_text(s2, 0.88, 1.94, 3.2, 0.36, "従来の対話型AI", size=14.5, bold=True, color=C_INK2)
    add_pill(s2, 4.65, 1.97, 1.28, 0.28, "ADVICE ONLY", fill_color=C_BORDER, text_color=C_INK2, size=8.5)
    add_rect(s2, 0.88, 2.40, 5.03, 0.012, fill_color=C_BORDER)

    old_items = [
        ("テキスト提案止まり", "コード断片や手順を返すだけで、反映や実行は人間任せ。"),
        ("エラーの往復コスト", "実行結果やエラーを直接見えず、何度もコピペと再質問が必要。"),
        ("単一スレッドの限界", "調査・実装・レビューを同時並行できず、大規模課題で失速。"),
        ("品質の裏付けがない", "ビルド通過や画面の崩れを確認しないまま出力を終えてしまう。"),
    ]
    for i, (t, d) in enumerate(old_items):
        iy = 2.58 + i * 0.84
        add_pill(s2, 0.88, iy + 0.05, 0.28, 0.28, "×", fill_color=C_BORDER, text_color=C_MUTED, size=10, font_name=FONT_JA)
        add_text(s2, 1.28, iy, 4.65, 0.26, t, size=12, bold=True, color=C_INK2)
        add_text(s2, 1.28, iy + 0.27, 4.65, 0.44, d, size=10, color=C_MUTED, line_spacing=1.28)

    # Center arrow
    add_oval(s2, 6.42, 3.66, 0.46, 0.46, C_COBALT)
    add_text(s2, 6.42, 3.68, 0.46, 0.42, "→", size=14, bold=True, color=C_WHITE, align=PP_ALIGN.CENTER, valign=MSO_ANCHOR.MIDDLE)

    # New card
    add_rect(s2, 7.12, 1.72, 5.59, 4.32, fill_color=C_WHITE, line_color=C_BORDER_BLUE, line_pt=1.5, rounded=True, radius=0.04)
    add_rect(s2, 7.22, 1.72, 5.39, 0.06, fill_color=C_COBALT)
    add_text(s2, 7.38, 1.94, 3.6, 0.36, "Antigravity（エージェント型AI）", size=14.5, bold=True, color=C_INK)
    add_pill(s2, 10.95, 1.97, 1.52, 0.28, "END-TO-END", fill_color=C_COBALT_SOFT, text_color=C_COBALT, border_color=C_BORDER_BLUE, size=8.5)
    add_rect(s2, 7.38, 2.40, 5.07, 0.012, fill_color=C_BORDER)

    new_items = [
        ("実環境への直接アクション", "リポジトリ探索・複数ファイル編集・シェル実行・ビルドまで直接操作。"),
        ("自律的なエラー自己修復ループ", "テストログと出力結果を解析し、原因特定から修正・再検証まで完遂。"),
        ("並列マルチエージェント協調", "調査・実装・ビジュアル生成を専門エージェント群で同時並列実行。"),
        ("テスト＆視覚検証まで責任完了", "自動テスト合格に加え、出力資料やUIを画像で実視確認してから納品。"),
    ]
    for i, (t, d) in enumerate(new_items):
        iy = 2.58 + i * 0.84
        add_pill(s2, 7.38, iy + 0.05, 0.28, 0.28, "✓", fill_color=RGBColor(0xDB, 0xEA, 0xFE), text_color=C_COBALT, size=10, font_name=FONT_JA)
        add_text(s2, 7.78, iy, 4.68, 0.26, t, size=12, bold=True, color=C_INK)
        add_text(s2, 7.78, iy + 0.27, 4.68, 0.44, d, size=10, color=C_INK2, line_spacing=1.28)

    # Bottom workflow banner
    add_rect(s2, 0.62, 6.22, 12.09, 0.56, fill_color=C_INK, rounded=True, radius=0.18)
    add_text(s2, 0.86, 6.37, 2.4, 0.28, "END-TO-END WORKFLOW", size=9.5, bold=True, color=C_CYAN, font_name=FONT_MONO)
    flow_steps = ["要件構造化", "環境・Web調査", "実装・生成", "実行・視覚検証", "確かな成果物"]
    for i, st in enumerate(flow_steps):
        fx = 3.55 + i * 1.80
        is_last = i == len(flow_steps) - 1
        add_pill(
            s2, fx, 6.32, 1.48, 0.36, st,
            fill_color=C_COBALT if is_last else C_SURFACE_DARK2,
            text_color=C_WHITE,
            border_color=C_COBALT if is_last else C_BORDER_DARK,
            size=9.8, font_name=FONT_JA,
        )
        if not is_last:
            add_text(s2, fx + 1.48, 6.35, 0.32, 0.3, "→", size=11, bold=True, color=C_MUTED_DARK, align=PP_ALIGN.CENTER)

    add_footer(s2, 2)

    # ==================== SLIDE 3: 6 CORE CAPABILITIES ====================
    s3 = prs.slides.add_slide(blank)
    set_bg(s3, C_BG_LIGHT)
    add_header(
        s3, "02  CAPABILITY MAP",
        "複雑な課題を突破する、6つのコア能力",
        "開発・調査・制作・運用の各領域を横断し、実務に直結するエージェント能力を統合しています。",
    )

    caps = [
        ("01", "深い推論と設計力", "曖昧な要件を構造化し、アーキテクチャ選定・トレードオフ比較・安全な実行計画を事前に設計します。", "Architecture • Root-Cause Analysis", C_COBALT, C_COBALT_SOFT),
        ("02", "自律コーディング＆実行", "複数ファイルへの精密な編集から、依存解決・CLIコマンド実行・ビルド処理までをシームレスに遂行します。", "Code Edit • Shell • Build Pipeline", C_INDIGO, C_INDIGO_SOFT),
        ("03", "並列マルチエージェント", "サブエージェント、Swarm、Python Workflowを駆使し、大規模タスクを同時並列で分解・統括します。", "Subagents • Swarm • Workflows", C_COBALT, C_COBALT_SOFT),
        ("04", "マルチモーダル＆視覚生成", "コード・画像・PDF・音声・動画・最新Web情報を横断理解し、キービジュアルや資料も自ら生み出します。", "Vision • Docs • Image Generation", C_INDIGO, C_INDIGO_SOFT),
        ("05", "自律検証＆品質保証", "自動テスト・静的解析に加え、成果物をレンダリングして画像で実視チェックし、破綻を自ら修復します。", "Testing • Visual QA • Self-Healing", C_TEAL, C_TEAL_SOFT),
        ("06", "拡張性と継続自動化", "Skills・Rules・MCP連携・Cronスケジュール実行により、一度の解決をチームの継続資産へ定着させます。", "Skills • MCP • Cron Automation", C_TEAL, C_TEAL_SOFT),
    ]
    cw, ch = 3.87, 2.40
    gx, gy = 0.24, 0.22
    for idx, (num, title, desc, tag, acc, soft) in enumerate(caps):
        col = idx % 3
        row = idx // 3
        cx = 0.62 + col * (cw + gx)
        cy = 1.72 + row * (ch + gy)
        add_rect(s3, cx, cy, cw, ch, fill_color=C_WHITE, line_color=C_BORDER, line_pt=1.0, rounded=True, radius=0.05)
        add_pill(s3, cx + 0.22, cy + 0.20, 0.50, 0.34, num, fill_color=soft, text_color=acc, size=10.5)
        add_rect(s3, cx + 0.22, cy + 0.66, 0.42, 0.035, fill_color=acc)
        add_text(s3, cx + 0.22, cy + 0.78, cw - 0.44, 0.34, title, size=13.5, bold=True, color=C_INK)
        add_text(s3, cx + 0.22, cy + 1.15, cw - 0.44, 0.78, desc, size=10.3, color=C_INK2, line_spacing=1.35)
        add_rect(s3, cx + 0.22, cy + 1.98, cw - 0.44, 0.01, fill_color=C_BORDER)
        add_text(s3, cx + 0.22, cy + 2.06, cw - 0.44, 0.24, tag, size=8.5, bold=True, color=C_MUTED, font_name=FONT_MONO)

    add_footer(s3, 3)

    # ==================== SLIDE 4: EXECUTION LOOP ====================
    s4 = prs.slides.add_slide(blank)
    set_bg(s4, C_BG_LIGHT)
    add_header(
        s4, "03  AUTONOMOUS EXECUTION",
        "書いて終わりにしない。検証駆動の自律開発ループ",
        "探索・設計・実装・検証・修復を閉ループで回し、確証のある状態まで自ら磨き上げます。",
    )

    # Left panel
    add_rect(s4, 0.62, 1.72, 6.95, 5.04, fill_color=C_WHITE, line_color=C_BORDER, line_pt=1.0, rounded=True, radius=0.04)
    stages = [
        ("STEP 01", "並列探索・全体把握", "関連ファイル・設定・既存テストをバッチ並列で読み込み、文脈と制約を正確に把握。", C_BG_LIGHT, C_BORDER, C_COBALT),
        ("STEP 02", "影響分析・設計計画", "変更範囲とエッジケースを整理し、最小コストで安全な実装・検証戦略を立案。", C_BG_LIGHT, C_BORDER, C_COBALT),
        ("STEP 03", "精密な並列実装・生成", "既存アーキテクチャとコーディング規約に沿ったクリーンな差分を一括適用。", C_COBALT_SOFT, C_BORDER_BLUE, C_COBALT),
        ("STEP 04", "実行テスト・実視検証", "ビルド・ユニットテスト・レンダリング画像の目視確認を実行し、品質を客観判定。", C_TEAL_SOFT, C_BORDER_TEAL, C_TEAL),
    ]
    for i, (code, title, desc, bg, bd, acc) in enumerate(stages):
        sy = 1.94 + i * 1.02
        add_rect(s4, 0.86, sy, 6.47, 0.88, fill_color=bg, line_color=bd, line_pt=1.0, rounded=True, radius=0.08)
        add_pill(s4, 1.02, sy + 0.26, 0.92, 0.36, code, fill_color=C_WHITE, text_color=acc, border_color=bd, size=9)
        add_text(s4, 2.10, sy + 0.12, 5.08, 0.28, title, size=12, bold=True, color=C_INK)
        add_text(s4, 2.10, sy + 0.42, 5.08, 0.40, desc, size=10, color=C_INK2, line_spacing=1.25)

    # Feedback bar
    add_rect(s4, 0.86, 6.08, 6.47, 0.48, fill_color=C_INK, rounded=True, radius=0.14)
    add_text(s4, 1.04, 6.20, 2.55, 0.25, "↺ SELF-HEALING LOOP", size=9, bold=True, color=RGBColor(0x2D, 0xD4, 0xBF), font_name=FONT_MONO)
    add_text(s4, 3.45, 6.19, 3.75, 0.26, "異常検知時は原因特定し STEP 03 へ自動回帰", size=10, bold=True, color=RGBColor(0xE2, 0xE8, 0xF0), align=PP_ALIGN.RIGHT)

    # Right terminal panel
    add_rect(s4, 7.82, 1.72, 4.89, 3.46, fill_color=RGBColor(0x0B, 0x11, 0x20), line_color=RGBColor(0x1E, 0x29, 0x3B), line_pt=1.0, rounded=True, radius=0.04)
    add_rect(s4, 7.82, 1.72, 4.89, 0.42, fill_color=RGBColor(0x11, 0x18, 0x27))
    for i, dc in enumerate([RGBColor(0xEF, 0x44, 0x44), RGBColor(0xF5, 0x9E, 0x0B), RGBColor(0x10, 0xB9, 0x81)]):
        add_oval(s4, 8.02 + i * 0.19, 1.87, 0.11, 0.11, dc)
    add_text(s4, 9.2, 1.82, 3.3, 0.24, "antigravity — verified-loop.log", size=9, color=C_MUTED_DARK, font_name=FONT_MONO, align=PP_ALIGN.RIGHT)

    term_lines = [
        ("▸ [SCAN]   Parallel read 14 source files", C_CYAN),
        ("▸ [PLAN]   Mapped dependencies & test matrix", RGBColor(0x81, 0x8C, 0xF8)),
        ("▸ [EDIT]   Applied minimal diff across 4 modules", C_AMBER),
        ("▸ [RUN]    pytest && build && render_slides", C_CYAN),
        ("  ✓ 42 tests passed, 0 failed (1.8s)", RGBColor(0x2D, 0xD4, 0xBF)),
        ("  ✓ Visual QA: 10/10 pages clean", RGBColor(0x2D, 0xD4, 0xBF)),
        ("▸ [DONE]   Deliverable verified & cited", RGBColor(0x2D, 0xD4, 0xBF)),
    ]
    for i, (txt, col) in enumerate(term_lines):
        add_text(s4, 8.04, 2.30 + i * 0.38, 4.46, 0.30, txt, size=9.8, bold=True, color=col, font_name=FONT_MONO)

    # Bottom 2 KPI cards on right
    kpis = [
        ("EFFICIENCY", "バッチ並列実行", "独立した読込・編集・検証を同時処理し、往復を削減"),
        ("ACCOUNTABILITY", "根拠ある完了報告", "変更ファイル・行番号・検証ログを明示して透明化"),
    ]
    for i, (k, v, sub) in enumerate(kpis):
        kx = 7.82 + i * 2.52
        add_rect(s4, kx, 5.38, 2.37, 1.38, fill_color=C_WHITE, line_color=C_BORDER, line_pt=1.0, rounded=True, radius=0.06)
        add_text(s4, kx + 0.16, 5.50, 2.05, 0.22, k, size=8.5, bold=True, color=C_COBALT, font_name=FONT_MONO)
        add_text(s4, kx + 0.16, 5.74, 2.05, 0.30, v, size=11.5, bold=True, color=C_INK)
        add_text(s4, kx + 0.16, 6.08, 2.05, 0.56, sub, size=9.2, color=C_MUTED, line_spacing=1.28)

    add_footer(s4, 4)

    # ==================== SLIDE 5: ORCHESTRATION (DARK) ====================
    s5 = prs.slides.add_slide(blank)
    set_bg(s5, C_BG_DARK)
    s5.shapes.add_picture(str(imgs["orch"]), Inches(0), Inches(0), width=Inches(13.333), height=Inches(7.5))
    add_header(
        s5, "04  PARALLEL ORCHESTRATION",
        "単一視点を超越する、マルチエージェント並列統括",
        "課題の規模と性質に応じ、専門エージェント群と独立ワークスペースを自在に編成します。",
        dark=True,
    )

    # Hub card
    add_rect(s5, 0.62, 1.72, 12.09, 0.96, fill_color=RGBColor(0x16, 0x26, 0x4A), line_color=C_CYAN, line_pt=1.25, rounded=True, radius=0.10)
    add_pill(s5, 0.86, 2.01, 1.48, 0.38, "COORDINATOR", fill_color=C_COBALT, text_color=C_WHITE, size=9.5)
    add_text(s5, 2.52, 1.88, 6.8, 0.32, "Antigravity 統括エージェント", size=14.5, bold=True, color=C_WHITE)
    add_text(s5, 2.52, 2.24, 7.6, 0.30, "タスク分解・依存設計・エージェント配備・結果のクロスチェックと最終統合を担う中枢", size=10.5, color=C_INK_DARK2)
    add_pill(s5, 10.65, 2.03, 1.82, 0.34, "DYNAMIC SCALING", fill_color=C_SURFACE_DARK, text_color=C_CYAN, border_color=C_CYAN, size=8.5)

    # Connector lines
    add_rect(s5, 6.65, 2.68, 0.025, 0.22, fill_color=C_CYAN)
    add_rect(s5, 2.04, 2.88, 9.24, 0.022, fill_color=C_CYAN)
    for mx in [2.04, 5.12, 8.20, 11.28]:
        add_rect(s5, mx, 2.88, 0.022, 0.24, fill_color=C_CYAN)

    modes = [
        ("MODE 01 • DELEGATE", "専門サブエージェント", "コード調査・Webリサーチ・画像生成などを独立コンテキストへ非同期委任し、主思考をクリーンに保持。", "research / image-gen / custom"),
        ("MODE 02 • COLLABORATE", "Agent Swarm", "複数ワーカーが共有メッセージボード上で役割分担・協調し、大型プロジェクトをチーム体制で推進。", "Shared board • Multi-worker"),
        ("MODE 03 • PIPELINE", "Python ワークフロー", "コード制御による大規模ファンアウト（parallel）と段階パイプラインで大量ファイルを一括処理。", "parallel() • pipeline()"),
        ("MODE 04 • ISOLATION", "独立ワークスペース", "各ワーカーに独立作業コピー（share / branch）を割り当て、同時編集・ビルドの競合を根本排除。", "inherit / share / branch"),
    ]
    mw = 2.86
    for i, (tag, title, desc, meta) in enumerate(modes):
        mx = 0.62 + i * (mw + 0.216)
        add_rect(s5, mx, 3.12, mw, 2.86, fill_color=C_SURFACE_DARK, line_color=C_BORDER_DARK, line_pt=1.0, rounded=True, radius=0.05)
        add_text(s5, mx + 0.18, 3.32, mw - 0.36, 0.24, tag, size=8.5, bold=True, color=C_CYAN, font_name=FONT_MONO)
        add_text(s5, mx + 0.18, 3.64, mw - 0.36, 0.34, title, size=13, bold=True, color=C_WHITE)
        add_text(s5, mx + 0.18, 4.04, mw - 0.36, 1.32, desc, size=10, color=C_INK_DARK2, line_spacing=1.38)
        add_rect(s5, mx + 0.18, 5.46, mw - 0.36, 0.012, fill_color=C_BORDER_DARK)
        add_text(s5, mx + 0.18, 5.56, mw - 0.36, 0.28, meta, size=8.5, color=C_MUTED_DARK, font_name=FONT_MONO)

    bottom_pills = [
        "大規模リポジトリの横断監査・一括リファクタ",
        "複数視点からの並列レビューで見落とし削減",
        "調査・素材制作・実装の同時進行で高速化",
    ]
    for i, txt in enumerate(bottom_pills):
        px = 0.62 + i * 4.10
        add_rect(s5, px, 6.20, 3.89, 0.54, fill_color=C_SURFACE_DARK2, line_color=C_BORDER_DARK, line_pt=1.0, rounded=True, radius=0.14)
        add_oval(s5, px + 0.18, 6.42, 0.10, 0.10, C_CYAN)
        add_text(s5, px + 0.36, 6.32, 3.42, 0.30, txt, size=10, bold=True, color=C_INK_DARK)

    add_footer(s5, 5, dark=True)

    # ==================== SLIDE 6: MULTIMODAL ====================
    s6 = prs.slides.add_slide(blank)
    set_bg(s6, C_BG_LIGHT)
    add_header(
        s6, "05  MULTIMODAL & CREATIVE",
        "「読む・見る・描く」を統合したマルチモーダル表現力",
        "コードやテキストに限らず、画像・文書・音声・動画を深く理解し、洗練された成果物へ昇華します。",
    )

    # Left Input Card
    add_rect(s6, 0.62, 1.72, 6.86, 2.42, fill_color=C_WHITE, line_color=C_BORDER, line_pt=1.0, rounded=True, radius=0.05)
    add_text(s6, 0.86, 1.88, 4.2, 0.30, "多様なインプット理解（Understand）", size=13, bold=True, color=C_INK)
    add_pill(s6, 5.75, 1.90, 1.50, 0.26, "MULTI-SOURCE", fill_color=C_SURFACE_OLD, text_color=C_INK2, size=8)
    in_items = [
        ("コード・設計資産", "リポジトリ構造・設定・差分履歴を文脈ごと精密に読解"),
        ("画像・UI・PDF資料", "画面スクリーンショットの崩れや図表・仕様書を直接解析"),
        ("音声・動画メディア", "デモ動画や音声データから要件・挙動・改善点を抽出"),
        ("最新Webリサーチ", "公式ドキュメントや最新動向をリアルタイム検索で裏取り"),
    ]
    for idx, (t, d) in enumerate(in_items):
        ix = 0.86 + (idx % 2) * 3.24
        iy = 2.30 + (idx // 2) * 0.86
        add_rect(s6, ix, iy, 3.10, 0.74, fill_color=C_BG_LIGHT, line_color=C_BORDER, line_pt=0.8, rounded=True, radius=0.08)
        add_text(s6, ix + 0.12, iy + 0.08, 2.86, 0.24, t, size=10.5, bold=True, color=C_INK)
        add_text(s6, ix + 0.12, iy + 0.33, 2.86, 0.36, d, size=9, color=C_MUTED, line_spacing=1.22)

    # Left Output Card
    add_rect(s6, 0.62, 4.32, 6.86, 2.44, fill_color=C_COBALT_SOFT, line_color=C_BORDER_BLUE, line_pt=1.1, rounded=True, radius=0.05)
    add_text(s6, 0.86, 4.48, 4.2, 0.30, "多彩なアウトプット創出（Create）", size=13, bold=True, color=C_INK)
    add_pill(s6, 5.75, 4.50, 1.50, 0.26, "READY-TO-USE", fill_color=C_WHITE, text_color=C_COBALT, border_color=C_BORDER_BLUE, size=8)
    out_items = [
        ("Webアプリ・UI実装", "デザインシステムを備えた実働フロントエンド＆API構築"),
        ("オリジナル図版生成", "用途とトーンに合わせたキービジュアルを自律生成"),
        ("プレゼン＆文書資料", "HTML5・PDF・編集可能PPTXまで用途別の完成形式で納品"),
        ("Mermaid設計・分析図", "構成図・シーケンス図・比較表で複雑な議論を可視化"),
    ]
    for idx, (t, d) in enumerate(out_items):
        ix = 0.86 + (idx % 2) * 3.24
        iy = 4.90 + (idx // 2) * 0.86
        add_rect(s6, ix, iy, 3.10, 0.74, fill_color=C_WHITE, line_color=C_BORDER_BLUE, line_pt=0.8, rounded=True, radius=0.08)
        add_text(s6, ix + 0.12, iy + 0.08, 2.86, 0.24, t, size=10.5, bold=True, color=C_INK)
        add_text(s6, ix + 0.12, iy + 0.33, 2.86, 0.36, d, size=9, color=C_INK2, line_spacing=1.22)

    # Right Visual Showcase
    add_rect(s6, 7.74, 1.72, 4.97, 5.04, fill_color=C_WHITE, line_color=C_BORDER, line_pt=1.0, rounded=True, radius=0.04)
    s6.shapes.add_picture(str(imgs["multi"]), Inches(7.90), Inches(1.88), width=Inches(4.65), height=Inches(4.45))
    add_text(s6, 7.92, 6.42, 2.7, 0.24, "Art-Directed Visual Synthesis", size=9.5, bold=True, color=C_INK)
    add_text(s6, 10.45, 6.42, 2.10, 0.24, "本資料のために自律生成", size=9, color=C_MUTED, align=PP_ALIGN.RIGHT)

    add_footer(s6, 6)

    # ==================== SLIDE 7: EXTENSIBILITY BENTO ====================
    s7 = prs.slides.add_slide(blank)
    set_bg(s7, C_BG_LIGHT)
    add_header(
        s7, "06  EXTENSIBILITY & AUTOMATION",
        "チーム固有の知見を取り込み、継続進化する基盤",
        "その場限りの支援で終わらせず、ルール・外部連携・定期自動化によって組織の生産性を底上げします。",
    )

    bentos = [
        ("KNOWLEDGE SYSTEM", "Skills & Rules", [
            "プロジェクト固有の規約・手順・ベストプラクティスをモジュール化して装備",
            "一度確立した高度なワークフローをチーム全体で再現性高く再利用",
        ], "SKILL.md • Workspace Rules • Hooks", C_COBALT),
        ("ECOSYSTEM CONNECTIVITY", "MCP ＆ 外部ツール連携", [
            "Model Context Protocol 経由で外部API・DB・社内ツール群と安全に接続",
            "コード・チケット・ドキュメントを横断した業務自動化を実現",
        ], "MCP Servers • Custom Plugins • CLI", C_INDIGO),
        ("CONTINUOUS OPERATIONS", "スケジュール実行＆非同期管理", [
            "Cron・タイマーによる定期監視、日次サマリー生成、自動メンテナンスを実行",
            "開発サーバーや長時間ビルドなどのバックグラウンドプロセスを安全に制御",
        ], "Cron • One-Shot Timer • Daemon Tasks", C_TEAL),
        ("STRUCTURED COLLABORATION", "Artifacts & 可視化ドキュメント", [
            "実行計画書・実験ログ・詳細分析レポートを構造化Markdownで自動整理",
            "Mermaid図やクリック可能なファイルリンクでレビュー負荷を大幅軽減",
        ], "Plans • Reports • Mermaid Diagrams", C_SLATE),
    ]
    bw, bh = 5.92, 2.40
    for idx, (kicker, title, bullets, foot, acc) in enumerate(bentos):
        bx = 0.62 + (idx % 2) * (bw + 0.25)
        by = 1.72 + (idx // 2) * (bh + 0.22)
        add_rect(s7, bx, by, bw, bh, fill_color=C_WHITE, line_color=C_BORDER, line_pt=1.0, rounded=True, radius=0.05)
        add_rect(s7, bx, by + 0.24, 0.06, bh - 0.48, fill_color=acc)
        add_text(s7, bx + 0.26, by + 0.18, bw - 0.48, 0.22, kicker, size=8.5, bold=True, color=acc, font_name=FONT_MONO)
        add_text(s7, bx + 0.26, by + 0.44, bw - 0.48, 0.34, title, size=15.5, bold=True, color=C_INK)
        for j, b in enumerate(bullets):
            add_text(s7, bx + 0.26, by + 0.88 + j * 0.46, bw - 0.48, 0.42, f"•  {b}", size=10.5, color=C_INK2, line_spacing=1.28)
        add_pill(s7, bx + 0.26, by + 1.92, 3.35, 0.30, foot, fill_color=C_BG_LIGHT, text_color=C_MUTED, size=8.5)

    add_footer(s7, 7)

    # ==================== SLIDE 8: PRACTICAL USE CASES ====================
    s8 = prs.slides.add_slide(blank)
    set_bg(s8, C_BG_LIGHT)
    add_header(
        s8, "07  PRACTICAL USE CASES",
        "開発から意思決定まで、現場を変える4つの実践シナリオ",
        "上流の調査・構想から実装・障害対応・資料制作まで、現場のボトルネックを直接解消します。",
    )

    cases = [
        (
            "CASE 01", "新機能開発・\n高速プロトタイプ",
            "仕様検討からUI・API・テスト実装まで工数が膨らみ、初動が遅れがち。",
            "要件整理からフロント／バック並列実装、ビルド・実画面検証まで一気通貫で推進。",
            "アイデアを最短距離で「動く・検証済みのプロダクト」へ昇華", C_COBALT,
        ),
        (
            "CASE 02", "複雑バグ調査・\n大規模リファクタ",
            "原因が複数モジュールに跨り、修正の影響範囲やデグレリスクが見えにくい。",
            "並列調査で根本原因を特定し、最小差分で修正したうえで回帰テストを自動検証。",
            "デグレを未然に防ぎつつ、技術的負債と障害原因を安全に解消", C_INDIGO,
        ),
        (
            "CASE 03", "技術リサーチ・\n意思決定支援",
            "最新技術や設計案の比較検討に膨大な調査時間がかかり、判断が属人化しやすい。",
            "既存コードの制約と最新Web一次情報を掛け合わせ、比較表・構成図付きで整理。",
            "根拠とトレードオフが明確な設計判断を短時間で獲得", C_TEAL,
        ),
        (
            "CASE 04", "企画書・スライド・\nドキュメント制作",
            "構成づくり・図版制作・レイアウト調整まで一貫して高品質に仕上げる負荷が高い。",
            "ストーリー設計・専用ビジュアル生成・多形式出力・全ページ視覚QAまで完結。",
            "そのまま提案・共有に使える高品位な資料をスピーディに納品", C_SKY,
        ),
    ]
    kw = 2.86
    for idx, (num, title, challenge, approach, outcome, acc) in enumerate(cases):
        kx = 0.62 + idx * (kw + 0.216)
        add_rect(s8, kx, 1.72, kw, 5.04, fill_color=C_WHITE, line_color=C_BORDER, line_pt=1.0, rounded=True, radius=0.04)
        add_rect(s8, kx + 0.08, 1.72, kw - 0.16, 0.07, fill_color=acc)
        add_text(s8, kx + 0.20, 1.92, kw - 0.40, 0.22, num, size=8.5, bold=True, color=C_MUTED, font_name=FONT_MONO)
        add_text(s8, kx + 0.20, 2.18, kw - 0.40, 0.64, title, size=13.5, bold=True, color=C_INK, line_spacing=1.24)
        add_text(s8, kx + 0.20, 2.94, kw - 0.40, 0.20, "CHALLENGE", size=8, bold=True, color=C_MUTED, font_name=FONT_MONO)
        add_text(s8, kx + 0.20, 3.16, kw - 0.40, 0.88, challenge, size=9.8, color=C_MUTED, line_spacing=1.32)
        add_text(s8, kx + 0.20, 4.12, kw - 0.40, 0.20, "APPROACH", size=8, bold=True, color=acc, font_name=FONT_MONO)
        add_text(s8, kx + 0.20, 4.34, kw - 0.40, 0.98, approach, size=9.8, color=C_INK2, line_spacing=1.32)
        add_rect(s8, kx + 0.18, 5.46, kw - 0.36, 1.12, fill_color=C_BG_LIGHT, line_color=C_BORDER, line_pt=0.9, rounded=True, radius=0.08)
        add_text(s8, kx + 0.28, 5.58, kw - 0.56, 0.90, outcome, size=9.8, bold=True, color=C_INK, line_spacing=1.32)

    add_footer(s8, 8)

    # ==================== SLIDE 9: PROOF IN ACTION ====================
    s9 = prs.slides.add_slide(blank)
    set_bg(s9, C_BG_PROOF)
    add_header(
        s9, "08  PROOF IN ACTION",
        "このスライド資料そのものが、実行力の証明です",
        "「能力をアピールする資料を作って」という一言から、設計・素材生成・多形式出力・視覚検品まで自律完遂しました。",
    )

    steps = [
        ("01", "構成＆デザイン設計", "10枚のストーリー弧、配色ルール、日本語タイポグラフィ、余白設計を体系的に設計。", "Swiss-Modern Design System", C_COBALT),
        ("02", "並列ビジュアル生成", "3体の画像生成サブエージェントを同時起動し、世界観に調和する専用図版を制作。", "3× Parallel Subagents", C_INDIGO),
        ("03", "マルチフォーマット生成", "HTML5・高精細PDF・編集可能PPTXの3形式をコードから精密に同時ビルド。", "HTML5 + Chrome PDF + PPTX", C_SKY),
        ("04", "自動レンダリング＆視覚QA", "全スライドを画像変換して1枚ずつ実視確認し、フォント・余白・崩れを徹底検品。", "Headless Render + Visual QA", C_TEAL),
    ]
    sw = 2.86
    for idx, (num, title, desc, tech, acc) in enumerate(steps):
        sx = 0.62 + idx * (sw + 0.216)
        add_rect(s9, sx, 1.72, sw, 3.16, fill_color=C_WHITE, line_color=C_BORDER_BLUE, line_pt=1.0, rounded=True, radius=0.05)
        add_pill(s9, sx + 0.20, 1.92, 0.44, 0.38, num, fill_color=acc, text_color=C_WHITE, size=10.5)
        add_text(s9, sx + 2.24, 1.96, 0.40, 0.30, "→" if idx < 3 else "✓", size=13, bold=True, color=C_MUTED if idx < 3 else C_TEAL, align=PP_ALIGN.RIGHT)
        add_text(s9, sx + 0.20, 2.46, sw - 0.40, 0.34, title, size=13, bold=True, color=C_INK)
        add_text(s9, sx + 0.20, 2.86, sw - 0.40, 1.38, desc, size=10.2, color=C_INK2, line_spacing=1.40)
        add_rect(s9, sx + 0.20, 4.34, sw - 0.40, 0.012, fill_color=C_BORDER)
        add_text(s9, sx + 0.20, 4.44, sw - 0.40, 0.28, tech, size=8.5, bold=True, color=acc, font_name=FONT_MONO)

    # Bottom Deliverables Dark Box
    add_rect(s9, 0.62, 5.10, 12.09, 1.66, fill_color=C_INK, rounded=True, radius=0.06)
    add_text(s9, 0.86, 5.24, 8.0, 0.24, "DELIVERABLES PRODUCED AUTONOMOUSLY IN THIS SESSION", size=8.8, bold=True, color=C_CYAN, font_name=FONT_MONO)
    delivs = [
        ("Interactive HTML5 Deck", "antigravity_presentation.html", "単一ファイルで完結。ブラウザ即再生・キーボード操作・一覧モード対応。"),
        ("Print-Ready PDF", "antigravity_presentation.pdf", "16:9 高精細レイアウト。どの環境でも崩れない共有・配布向け形式。"),
        ("Editable PowerPoint", "antigravity_presentation.pptx", "テキスト・図形をそのまま編集可能なネイティブPowerPoint資料。"),
    ]
    dw = 3.74
    for idx, (t, f, d) in enumerate(delivs):
        dx = 0.86 + idx * (dw + 0.195)
        add_rect(s9, dx, 5.54, dw, 1.04, fill_color=C_SURFACE_DARK2, line_color=C_BORDER_DARK, line_pt=0.9, rounded=True, radius=0.08)
        add_text(s9, dx + 0.14, 5.62, dw - 0.28, 0.24, t, size=11, bold=True, color=C_WHITE)
        add_text(s9, dx + 0.14, 5.87, dw - 0.28, 0.20, f, size=8.5, bold=True, color=C_CYAN, font_name=FONT_MONO)
        add_text(s9, dx + 0.14, 6.10, dw - 0.28, 0.42, d, size=9, color=C_INK_DARK2, line_spacing=1.22)

    add_footer(s9, 9)

    # ==================== SLIDE 10: CLOSING ====================
    s10 = prs.slides.add_slide(blank)
    set_bg(s10, C_BG_DARK)
    s10.shapes.add_picture(str(imgs["closing"]), Inches(0), Inches(0), width=Inches(13.333), height=Inches(7.5))

    add_rect(s10, 0.66, 0.72, 0.22, 0.03, fill_color=C_CYAN)
    add_text(s10, 0.96, 0.60, 6.0, 0.26, "ANTIGRAVITY  •  GOOGLE DEEPMIND", size=9.5, bold=True, color=C_CYAN, font_name=FONT_MONO)
    add_text(s10, 0.66, 1.00, 10.5, 0.72, "複雑な課題を、確かな成果へ。", size=38, bold=True, color=C_WHITE)
    add_text(
        s10, 0.66, 1.84, 9.2, 0.66,
        "スピードだけでなく、根拠・安全性・検証品質を兼ね備えた自律パートナーとして、\nあなたの開発と創造を次の次元へ引き上げます。",
        size=13, color=C_INK_DARK2, line_spacing=1.45,
    )

    pillars = [
        ("01  TRANSPARENCY", "透明なプロセス", "実行計画・変更差分・参照ファイルと根拠を常に明示し、ブラックボックスにしません。"),
        ("02  SAFETY & CONTROL", "揺るがない安全性", "権限と環境境界を厳格に守り、判断が分かれる仕様は確認を挟んで確実に進めます。"),
        ("03  VERIFIED DELIVERY", "検証済みの完遂力", "提案で止めず、テスト合格・実視確認までクリアした実働成果物としてお届けします。"),
    ]
    pw = 3.84
    for idx, (num, title, desc) in enumerate(pillars):
        px = 0.66 + idx * (pw + 0.24)
        add_rect(s10, px, 2.92, pw, 2.38, fill_color=C_SURFACE_DARK, line_color=C_BORDER_DARK, line_pt=1.0, rounded=True, radius=0.05)
        add_text(s10, px + 0.24, 3.16, pw - 0.48, 0.24, num, size=9, bold=True, color=C_CYAN, font_name=FONT_MONO)
        add_text(s10, px + 0.24, 3.48, pw - 0.48, 0.36, title, size=15, bold=True, color=C_WHITE)
        add_text(s10, px + 0.24, 3.96, pw - 0.48, 1.10, desc, size=10.8, color=C_INK_DARK2, line_spacing=1.45)

    # Closing CTA bar
    add_rect(s10, 0.66, 5.76, 12.01, 0.72, fill_color=RGBColor(0x16, 0x2A, 0x52), line_color=C_CYAN, line_pt=1.1, rounded=True, radius=0.12)
    add_text(s10, 0.96, 5.96, 7.6, 0.34, "次に解決したい課題から、いつでも始めてください。", size=13.5, bold=True, color=C_WHITE)
    add_text(s10, 8.8, 6.00, 3.55, 0.28, "ANTIGRAVITY • READY TO EXECUTE", size=9.5, bold=True, color=C_CYAN, font_name=FONT_MONO, align=PP_ALIGN.RIGHT)

    add_footer(s10, 10, dark=True)

    prs.save(str(OUT_PPTX))
    print(f"Wrote {OUT_PPTX} ({OUT_PPTX.stat().st_size:,} bytes)")


if __name__ == "__main__":
    build_pptx()
