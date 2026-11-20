#!/usr/bin/env python3
"""Build self-contained HTML5 presentation (antigravity_presentation.html)."""

from __future__ import annotations

import base64
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "presentation_assets"
OUT_HTML = ROOT / "antigravity_presentation.html"


def img_b64(filename: str) -> str:
    path = ASSETS / filename
    data = path.read_bytes()
    return f"data:image/png;base64,{base64.b64encode(data).decode('ascii')}"


# Crisp minimal monochrome stroke icons (24x24)
ICONS = {
    "brain": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.54Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.54Z"/></svg>',
    "terminal": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
    "network": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M10.8 7.2 6.2 15.8"/><path d="M13.2 7.2 17.8 15.8"/><path d="M7.5 18h9"/></svg>',
    "layers": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg>',
    "shield_check": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>',
    "cpu": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="0.5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>',
    "check": '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 10.5 8 14l7.5-8"/></svg>',
    "x": '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 5.5 14.5 14.5M14.5 5.5l-9 9"/></svg>',
    "arrow_right": '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h12M11 5l5 5-5 5"/></svg>',
}


def slide_footer(num: int, total: int = 10, dark: bool = False) -> str:
    cls = "slide-footer dark" if dark else "slide-footer"
    return f"""
      <footer class="{cls}">
        <span class="footer-brand"><span class="brand-dot"></span>Antigravity — Capability Overview</span>
        <span class="footer-page">{num:02d} / {total:02d}</span>
      </footer>
    """


def build_html() -> str:
    hero_uri = img_b64("hero_bg.png")
    multi_uri = img_b64("multimodal_visual.png")
    orch_uri = img_b64("orchestration_bg.png")

    html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Antigravity — Capability Overview</title>
<style>
  :root {{
    --bg-light: #F8FAFC;
    --surface: #FFFFFF;
    --bg-dark: #090E1A;
    --surface-dark: rgba(255, 255, 255, 0.055);
    --ink: #0F172A;
    --ink-2: #334155;
    --muted: #64748B;
    --ink-dark: #F8FAFC;
    --ink-dark-2: #CBD5E1;
    --muted-dark: #94A3B8;
    --border: #E2E8F0;
    --border-dark: rgba(255, 255, 255, 0.13);
    --cobalt: #2563EB;
    --cobalt-soft: #EFF6FF;
    --indigo: #4F46E5;
    --cyan: #38BDF8;
    --teal: #0D9488;
    --teal-soft: #F0FDFA;
    --amber: #D97706;
    --font-sans: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-mono: 'SF Mono', 'Menlo', 'Monaco', monospace;
  }}

  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }}

  html, body {{
    width: 100%;
    height: 100%;
    background: #0B1120;
    font-family: var(--font-sans);
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }}

  /* Screen presentation shell */
  body.screen-mode {{
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }}

  .deck-stage {{
    position: relative;
    width: 1280px;
    height: 720px;
    transform-origin: center center;
    box-shadow: 0 28px 90px rgba(0, 0, 0, 0.55);
    border-radius: 6px;
    overflow: hidden;
    background: var(--bg-dark);
  }}

  .slide {{
    position: relative;
    width: 1280px;
    height: 720px;
    overflow: hidden;
    background: var(--bg-light);
    color: var(--ink);
    display: flex;
    flex-direction: column;
    padding: 46px 60px 34px 60px;
  }}

  body.screen-mode .slide {{
    position: absolute;
    inset: 0;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.28s ease;
  }}

  body.screen-mode .slide.active {{
    opacity: 1;
    pointer-events: auto;
    z-index: 2;
  }}

  /* Overview grid mode */
  body.overview-mode {{
    overflow-y: auto;
    display: block;
    padding: 36px 36px 84px 36px;
    background: #0F172A;
  }}

  body.overview-mode .deck-stage {{
    width: auto;
    height: auto;
    transform: none !important;
    box-shadow: none;
    border-radius: 0;
    overflow: visible;
    background: transparent;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 24px;
    max-width: 1440px;
    margin: 0 auto;
  }}

  body.overview-mode .slide-thumb {{
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: 10px;
    border: 2px solid rgba(255, 255, 255, 0.14);
    cursor: pointer;
    transition: transform 0.18s ease, border-color 0.18s ease;
  }}

  body.overview-mode .slide-thumb:hover {{
    transform: translateY(-3px);
    border-color: var(--cyan);
  }}

  body.overview-mode .slide-thumb.current {{
    border-color: var(--cobalt);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.35);
  }}

  body.overview-mode .slide-thumb .slide {{
    position: absolute;
    top: 0;
    left: 0;
    opacity: 1;
    pointer-events: none;
    transform-origin: top left;
  }}

  /* HUD Controls */
  .hud {{
    position: fixed;
    bottom: 18px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.84);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: #F8FAFC;
    font-size: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  }}

  .hud button {{
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: #E2E8F0;
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 999px;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }}

  .hud button:hover {{
    background: rgba(255, 255, 255, 0.14);
    color: #FFFFFF;
  }}

  .hud-counter {{
    font-family: var(--font-mono);
    font-size: 12px;
    color: #94A3B8;
    min-width: 54px;
    text-align: center;
  }}

  /* Typography & Header Chrome */
  .slide-header {{
    margin-bottom: 24px;
    flex-shrink: 0;
  }}

  .eyebrow {{
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--cobalt);
    margin-bottom: 7px;
    display: flex;
    align-items: center;
    gap: 8px;
  }}

  .eyebrow::before {{
    content: "";
    display: inline-block;
    width: 18px;
    height: 2px;
    background: var(--cobalt);
    border-radius: 2px;
  }}

  .slide.dark .eyebrow {{
    color: var(--cyan);
  }}

  .slide.dark .eyebrow::before {{
    background: var(--cyan);
  }}

  .slide-title {{
    font-size: 31px;
    font-weight: 800;
    letter-spacing: -0.025em;
    line-height: 1.24;
    color: var(--ink);
  }}

  .slide.dark .slide-title {{
    color: var(--ink-dark);
  }}

  .slide-subtitle {{
    margin-top: 6px;
    font-size: 14.5px;
    font-weight: 400;
    line-height: 1.5;
    color: var(--muted);
  }}

  .slide.dark .slide-subtitle {{
    color: var(--muted-dark);
  }}

  .slide-body {{
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }}

  .slide-footer {{
    margin-top: 18px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11.5px;
    color: var(--muted);
    flex-shrink: 0;
  }}

  .slide-footer.dark {{
    border-top-color: var(--border-dark);
    color: var(--muted-dark);
  }}

  .footer-brand {{
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    letter-spacing: 0.01em;
  }}

  .brand-dot {{
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--cobalt), var(--cyan));
    display: inline-block;
  }}

  .footer-page {{
    font-family: var(--font-mono);
    font-weight: 600;
    letter-spacing: 0.08em;
  }}

  /* ================= SLIDE 1: HERO COVER ================= */
  .slide-cover {{
    padding: 0;
    background: var(--bg-dark);
    color: var(--ink-dark);
  }}

  .cover-bg {{
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
  }}

  .cover-scrim {{
    position: absolute;
    inset: 0;
    background: linear-gradient(
      95deg,
      rgba(9, 14, 26, 0.96) 0%,
      rgba(9, 14, 26, 0.88) 46%,
      rgba(9, 14, 26, 0.42) 72%,
      rgba(9, 14, 26, 0.14) 100%
    );
    z-index: 1;
  }}

  .cover-content {{
    position: relative;
    z-index: 2;
    height: 100%;
    padding: 64px 72px 52px 72px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}

  .cover-pill {{
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 7px 15px;
    border-radius: 999px;
    border: 1px solid rgba(56, 189, 248, 0.35);
    background: rgba(15, 23, 42, 0.65);
    color: var(--cyan);
    font-family: var(--font-mono);
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.14em;
    width: fit-content;
  }}

  .cover-pill-dot {{
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--cyan);
    box-shadow: 0 0 10px var(--cyan);
  }}

  .cover-main {{
    max-width: 700px;
  }}

  .cover-title {{
    font-size: 74px;
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1.04;
    color: #FFFFFF;
    margin-bottom: 22px;
  }}

  .cover-tagline {{
    font-size: 25px;
    font-weight: 700;
    line-height: 1.42;
    color: #E2E8F0;
    margin-bottom: 18px;
  }}

  .cover-tagline .accent {{
    color: var(--cyan);
  }}

  .cover-lead {{
    font-size: 15px;
    line-height: 1.72;
    color: #94A3B8;
    max-width: 600px;
  }}

  .cover-meta-row {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 22px;
    border-top: 1px solid rgba(255, 255, 255, 0.14);
  }}

  .cover-specs {{
    display: flex;
    gap: 36px;
  }}

  .cover-spec {{
    display: flex;
    flex-direction: column;
    gap: 3px;
  }}

  .cover-spec-label {{
    font-family: var(--font-mono);
    font-size: 10.5px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--cyan);
    font-weight: 700;
  }}

  .cover-spec-val {{
    font-size: 13.5px;
    font-weight: 600;
    color: #E2E8F0;
  }}

  .cover-year {{
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 600;
    color: #E2E8F0;
    letter-spacing: 0.08em;
    text-shadow: 0 1px 10px rgba(9, 14, 26, 0.9);
  }}

  /* ================= SLIDE 2: PARADIGM SHIFT ================= */
  .compare-grid {{
    display: grid;
    grid-template-columns: 1fr 48px 1.12fr;
    gap: 0;
    align-items: stretch;
    flex: 1;
  }}

  .compare-card {{
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 24px 26px;
    display: flex;
    flex-direction: column;
  }}

  .compare-card.old {{
    background: #F1F5F9;
    border-color: #E2E8F0;
  }}

  .compare-card.new {{
    background: #FFFFFF;
    border: 1.5px solid #BFDBFE;
    box-shadow: 0 12px 32px rgba(37, 99, 235, 0.08);
    position: relative;
    overflow: hidden;
  }}

  .compare-card.new::before {{
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--cobalt), var(--indigo), var(--cyan));
  }}

  .compare-card-head {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }}

  .compare-card-title {{
    font-size: 18px;
    font-weight: 800;
    color: var(--ink);
  }}

  .compare-card.old .compare-card-title {{
    color: #475569;
  }}

  .badge-pill {{
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 4px 10px;
    border-radius: 999px;
    text-transform: uppercase;
  }}

  .badge-muted {{
    background: #E2E8F0;
    color: #475569;
  }}

  .badge-cobalt {{
    background: var(--cobalt-soft);
    color: var(--cobalt);
    border: 1px solid #BFDBFE;
  }}

  .compare-list {{
    display: flex;
    flex-direction: column;
    gap: 14px;
    flex: 1;
    justify-content: center;
  }}

  .compare-item {{
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }}

  .compare-icon {{
    width: 24px;
    height: 24px;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }}

  .compare-icon svg {{
    width: 14px;
    height: 14px;
  }}

  .compare-icon.old {{
    background: #E2E8F0;
    color: #64748B;
  }}

  .compare-icon.new {{
    background: #DBEAFE;
    color: var(--cobalt);
  }}

  .compare-item-title {{
    font-size: 14.5px;
    font-weight: 700;
    color: var(--ink);
    margin-bottom: 2px;
  }}

  .compare-card.old .compare-item-title {{
    color: #334155;
  }}

  .compare-item-desc {{
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--muted);
  }}

  .compare-arrow-col {{
    display: flex;
    align-items: center;
    justify-content: center;
  }}

  .compare-arrow-circle {{
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: var(--cobalt);
    color: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.28);
  }}

  .compare-arrow-circle svg {{
    width: 17px;
    height: 17px;
  }}

  .flow-banner {{
    margin-top: 18px;
    background: #0F172A;
    color: #F8FAFC;
    border-radius: 12px;
    padding: 13px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }}

  .flow-banner-label {{
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: var(--cyan);
    text-transform: uppercase;
  }}

  .flow-steps-inline {{
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
    font-weight: 700;
  }}

  .flow-step-chip {{
    padding: 4px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #E2E8F0;
  }}

  .flow-step-chip.final {{
    background: var(--cobalt);
    border-color: var(--cobalt);
    color: #FFFFFF;
  }}

  .flow-sep {{
    color: #64748B;
    font-size: 13px;
  }}

  /* ================= SLIDE 3: 6 CAPABILITIES ================= */
  .cap-grid {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 18px;
    flex: 1;
  }}

  .cap-card {{
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 20px 22px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: 0 2px 10px rgba(15, 23, 42, 0.03);
  }}

  .cap-top {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }}

  .cap-icon-box {{
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: var(--cobalt-soft);
    color: var(--cobalt);
    display: flex;
    align-items: center;
    justify-content: center;
  }}

  .cap-icon-box.indigo {{
    background: #EEF2FF;
    color: var(--indigo);
  }}

  .cap-icon-box.teal {{
    background: var(--teal-soft);
    color: var(--teal);
  }}

  .cap-icon-box svg {{
    width: 21px;
    height: 21px;
  }}

  .cap-num {{
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 700;
    color: #94A3B8;
  }}

  .cap-title {{
    font-size: 16.5px;
    font-weight: 800;
    color: var(--ink);
    margin-bottom: 7px;
  }}

  .cap-desc {{
    font-size: 12.8px;
    line-height: 1.58;
    color: var(--ink-2);
  }}

  .cap-tag {{
    margin-top: 12px;
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 600;
    color: var(--muted);
    padding-top: 9px;
    border-top: 1px solid #F1F5F9;
  }}

  /* ================= SLIDE 4: EXECUTION LOOP ================= */
  .loop-layout {{
    display: grid;
    grid-template-columns: 1.38fr 1fr;
    gap: 26px;
    flex: 1;
    min-height: 0;
  }}

  .loop-diagram-card {{
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 22px 24px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}

  .loop-stages {{
    display: flex;
    flex-direction: column;
    gap: 11px;
    flex: 1;
    justify-content: center;
  }}

  .loop-stage {{
    display: grid;
    grid-template-columns: 74px 1fr;
    gap: 14px;
    align-items: center;
    padding: 12px 16px;
    border-radius: 11px;
    background: #F8FAFC;
    border: 1px solid var(--border);
  }}

  .loop-stage.highlight {{
    background: #EFF6FF;
    border-color: #BFDBFE;
  }}

  .loop-stage.verify {{
    background: #F0FDFA;
    border-color: #99F6E4;
  }}

  .loop-step-badge {{
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 800;
    color: var(--cobalt);
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    text-align: center;
    padding: 6px 4px;
  }}

  .loop-stage.verify .loop-step-badge {{
    color: var(--teal);
    border-color: #5EEAD4;
  }}

  .loop-stage-title {{
    font-size: 14.5px;
    font-weight: 800;
    color: var(--ink);
    margin-bottom: 2px;
  }}

  .loop-stage-desc {{
    font-size: 12.2px;
    line-height: 1.45;
    color: var(--ink-2);
  }}

  .loop-feedback-bar {{
    margin-top: 12px;
    padding: 11px 16px;
    border-radius: 10px;
    background: linear-gradient(90deg, #0F172A, #1E293B);
    color: #E2E8F0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    font-size: 11.8px;
  }}

  .loop-feedback-tag {{
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 700;
    color: #2DD4BF;
    letter-spacing: 0.08em;
    white-space: nowrap;
    flex-shrink: 0;
  }}

  .loop-right {{
    display: flex;
    flex-direction: column;
    gap: 16px;
  }}

  .terminal-card {{
    background: #0B1120;
    border: 1px solid #1E293B;
    border-radius: 16px;
    overflow: hidden;
    flex: 1;
    display: flex;
    flex-direction: column;
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.14);
  }}

  .terminal-bar {{
    padding: 11px 16px;
    background: #111827;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }}

  .term-dots {{
    display: flex;
    gap: 6px;
  }}

  .term-dot {{
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #334155;
  }}

  .term-dot.r {{ background: #EF4444; opacity: 0.85; }}
  .term-dot.y {{ background: #F59E0B; opacity: 0.85; }}
  .term-dot.g {{ background: #10B981; opacity: 0.85; }}

  .term-title {{
    font-family: var(--font-mono);
    font-size: 11px;
    color: #94A3B8;
  }}

  .terminal-body {{
    padding: 18px 20px;
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.85;
    color: #E2E8F0;
    flex: 1;
  }}

  .t-cyan {{ color: #38BDF8; font-weight: 700; }}
  .t-indigo {{ color: #818CF8; font-weight: 700; }}
  .t-amber {{ color: #FBBF24; font-weight: 700; }}
  .t-teal {{ color: #2DD4BF; font-weight: 700; }}
  .t-muted {{ color: #94A3B8; }}

  .kpi-row {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }}

  .kpi-chip {{
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px 16px;
  }}

  .kpi-label {{
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    color: var(--cobalt);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 4px;
  }}

  .kpi-val {{
    font-size: 14px;
    font-weight: 800;
    color: var(--ink);
    margin-bottom: 3px;
  }}

  .kpi-sub {{
    font-size: 11.5px;
    color: var(--muted);
    line-height: 1.4;
  }}

  /* ================= SLIDE 5: ORCHESTRATION (DARK) ================= */
  .slide-dark-feature {{
    background: var(--bg-dark);
    color: var(--ink-dark);
  }}

  .dark-bg-img {{
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.72;
    z-index: 0;
  }}

  .dark-bg-scrim {{
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 48%, rgba(9, 14, 26, 0.56) 0%, rgba(9, 14, 26, 0.88) 100%);
    z-index: 1;
  }}

  .slide-dark-feature > *:not(.dark-bg-img):not(.dark-bg-scrim) {{
    position: relative;
    z-index: 2;
  }}

  .orch-shell {{
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 18px;
  }}

  .orch-hub {{
    background: linear-gradient(135deg, rgba(37, 99, 235, 0.24), rgba(79, 70, 229, 0.22));
    border: 1.5px solid rgba(56, 189, 248, 0.48);
    border-radius: 14px;
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    backdrop-filter: blur(8px);
  }}

  .orch-hub-left {{
    display: flex;
    align-items: center;
    gap: 14px;
  }}

  .orch-hub-badge {{
    padding: 6px 12px;
    border-radius: 8px;
    background: var(--cobalt);
    color: #FFFFFF;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
  }}

  .orch-hub-title {{
    font-size: 18px;
    font-weight: 800;
    color: #FFFFFF;
  }}

  .orch-hub-desc {{
    font-size: 12.8px;
    color: #CBD5E1;
  }}

  .orch-connectors {{
    height: 22px;
    width: 100%;
    display: block;
    margin: -10px 0;
  }}

  .orch-grid {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    flex: 1;
  }}

  .orch-card {{
    background: rgba(15, 23, 42, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 14px;
    padding: 20px 18px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    backdrop-filter: blur(8px);
  }}

  .orch-card-tag {{
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 700;
    color: var(--cyan);
    letter-spacing: 0.08em;
    margin-bottom: 10px;
  }}

  .orch-card-title {{
    font-size: 16px;
    font-weight: 800;
    color: #FFFFFF;
    margin-bottom: 8px;
  }}

  .orch-card-desc {{
    font-size: 12.5px;
    line-height: 1.58;
    color: #CBD5E1;
  }}

  .orch-card-meta {{
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    font-family: var(--font-mono);
    font-size: 11px;
    color: #94A3B8;
  }}

  .orch-bottom-strip {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }}

  .orch-pill {{
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 11px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12.8px;
    font-weight: 600;
    color: #E2E8F0;
  }}

  .orch-pill-dot {{
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--cyan);
    flex-shrink: 0;
  }}

  /* ================= SLIDE 6: MULTIMODAL ================= */
  .multi-layout {{
    display: grid;
    grid-template-columns: 1.32fr 1fr;
    gap: 26px;
    flex: 1;
    min-height: 0;
  }}

  .multi-col {{
    display: flex;
    flex-direction: column;
    gap: 16px;
  }}

  .io-card {{
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 15px;
    padding: 18px 22px;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }}

  .io-card.output {{
    background: linear-gradient(180deg, #FFFFFF 0%, #F5F9FF 100%);
    border-color: #BFDBFE;
  }}

  .io-head {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }}

  .io-title {{
    font-size: 15.5px;
    font-weight: 800;
    color: var(--ink);
  }}

  .io-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 14px;
  }}

  .io-item {{
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 10px 12px;
  }}

  .io-card.output .io-item {{
    background: #FFFFFF;
    border-color: #DBEAFE;
  }}

  .io-item-title {{
    font-size: 13px;
    font-weight: 800;
    color: var(--ink);
    margin-bottom: 3px;
  }}

  .io-item-desc {{
    font-size: 11.6px;
    line-height: 1.45;
    color: var(--muted);
  }}

  .visual-frame {{
    background: #FFFFFF;
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
  }}

  .visual-img-wrap {{
    flex: 1;
    border-radius: 11px;
    overflow: hidden;
    background: #F8FAFC;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
  }}

  .visual-img-wrap img {{
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }}

  .visual-caption {{
    margin-top: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11.5px;
    color: var(--muted);
  }}

  .visual-caption strong {{
    color: var(--ink);
    font-weight: 700;
  }}

  /* ================= SLIDE 7: BENTO EXTENSIBILITY ================= */
  .bento-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 18px;
    flex: 1;
  }}

  .bento-card {{
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 22px 24px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
  }}

  .bento-card::after {{
    content: "";
    position: absolute;
    left: 0;
    top: 20px;
    bottom: 20px;
    width: 4px;
    border-radius: 0 4px 4px 0;
    background: var(--cobalt);
  }}

  .bento-card.indigo::after {{ background: var(--indigo); }}
  .bento-card.teal::after {{ background: var(--teal); }}
  .bento-card.slate::after {{ background: #334155; }}

  .bento-kicker {{
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: var(--cobalt);
    margin-bottom: 6px;
  }}

  .bento-card.indigo .bento-kicker {{ color: var(--indigo); }}
  .bento-card.teal .bento-kicker {{ color: var(--teal); }}
  .bento-card.slate .bento-kicker {{ color: #475569; }}

  .bento-title {{
    font-size: 19px;
    font-weight: 800;
    color: var(--ink);
    margin-bottom: 10px;
  }}

  .bento-list {{
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }}

  .bento-list li {{
    font-size: 13px;
    line-height: 1.52;
    color: var(--ink-2);
    padding-left: 16px;
    position: relative;
  }}

  .bento-list li::before {{
    content: "";
    position: absolute;
    left: 0;
    top: 8px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #94A3B8;
  }}

  .bento-foot {{
    margin-top: 12px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--muted);
    background: #F8FAFC;
    border-radius: 8px;
    padding: 6px 10px;
    width: fit-content;
  }}

  /* ================= SLIDE 8: USE CASES ================= */
  .cases-grid {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 18px;
    flex: 1;
  }}

  .case-card {{
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 15px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 3px 12px rgba(15, 23, 42, 0.03);
  }}

  .case-accent {{
    height: 5px;
    background: var(--cobalt);
  }}

  .case-accent.c2 {{ background: var(--indigo); }}
  .case-accent.c3 {{ background: var(--teal); }}
  .case-accent.c4 {{ background: #0284C7; }}

  .case-inner {{
    padding: 20px 18px;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}

  .case-num {{
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 700;
    color: var(--muted);
    letter-spacing: 0.1em;
    margin-bottom: 6px;
  }}

  .case-title {{
    font-size: 16.5px;
    font-weight: 800;
    line-height: 1.35;
    color: var(--ink);
    margin-bottom: 14px;
  }}

  .case-block {{
    margin-bottom: 11px;
  }}

  .case-block-label {{
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--muted);
    text-transform: uppercase;
    margin-bottom: 3px;
  }}

  .case-block-text {{
    font-size: 12.2px;
    line-height: 1.52;
    color: var(--ink-2);
  }}

  .case-outcome {{
    margin-top: auto;
    padding: 11px 12px;
    border-radius: 10px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    font-size: 12.2px;
    font-weight: 700;
    line-height: 1.48;
    color: var(--ink);
  }}

  /* ================= SLIDE 9: PROOF IN ACTION ================= */
  .slide-proof {{
    background: linear-gradient(180deg, #F8FAFC 0%, #EFF6FF 100%);
  }}

  .proof-timeline {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 20px;
    flex: 1;
  }}

  .proof-step {{
    background: #FFFFFF;
    border: 1px solid #DBEAFE;
    border-radius: 15px;
    padding: 20px 18px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: 0 6px 20px rgba(37, 99, 235, 0.05);
  }}

  .proof-step-top {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }}

  .proof-num {{
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: var(--cobalt);
    color: #FFFFFF;
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
  }}

  .proof-step:nth-child(2) .proof-num {{ background: var(--indigo); }}
  .proof-step:nth-child(3) .proof-num {{ background: #0284C7; }}
  .proof-step:nth-child(4) .proof-num {{ background: var(--teal); }}

  .proof-arrow {{
    color: #94A3B8;
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 700;
  }}

  .proof-step-title {{
    font-size: 15.5px;
    font-weight: 800;
    color: var(--ink);
    margin-bottom: 8px;
  }}

  .proof-step-desc {{
    font-size: 12.5px;
    line-height: 1.56;
    color: var(--ink-2);
  }}

  .proof-step-tech {{
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px solid #F1F5F9;
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 600;
    color: var(--cobalt);
  }}

  .deliverables-box {{
    background: #0F172A;
    border-radius: 15px;
    padding: 18px 22px;
    color: #F8FAFC;
  }}

  .deliverables-head {{
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: var(--cyan);
    text-transform: uppercase;
    margin-bottom: 12px;
  }}

  .deliverables-grid {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }}

  .deliv-card {{
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 11px;
    padding: 12px 15px;
  }}

  .deliv-title {{
    font-size: 13.5px;
    font-weight: 800;
    color: #FFFFFF;
    margin-bottom: 3px;
  }}

  .deliv-file {{
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--cyan);
    margin-bottom: 5px;
  }}

  .deliv-desc {{
    font-size: 11.8px;
    color: #CBD5E1;
    line-height: 1.45;
  }}

  /* ================= SLIDE 10: CLOSING ================= */
  .slide-closing {{
    padding: 0;
    background: var(--bg-dark);
    color: var(--ink-dark);
  }}

  .closing-bg {{
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scaleX(-1);
    opacity: 0.72;
    z-index: 0;
  }}

  .closing-scrim {{
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(9, 14, 26, 0.78) 0%,
      rgba(9, 14, 26, 0.88) 55%,
      rgba(9, 14, 26, 0.96) 100%
    );
    z-index: 1;
  }}

  .closing-content {{
    position: relative;
    z-index: 2;
    height: 100%;
    padding: 58px 66px 38px 66px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}

  .closing-hero {{
    max-width: 820px;
  }}

  .closing-title {{
    font-size: 48px;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.18;
    color: #FFFFFF;
    margin-top: 12px;
    margin-bottom: 14px;
  }}

  .closing-sub {{
    font-size: 16px;
    line-height: 1.65;
    color: #CBD5E1;
    max-width: 720px;
  }}

  .pillars-grid {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin: 34px 0 0 0;
  }}

  .pillar-card {{
    background: rgba(15, 23, 42, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 14px;
    padding: 28px 26px;
    backdrop-filter: blur(10px);
  }}

  .pillar-num {{
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    color: var(--cyan);
    letter-spacing: 0.12em;
    margin-bottom: 8px;
  }}

  .pillar-title {{
    font-size: 18px;
    font-weight: 800;
    color: #FFFFFF;
    margin-bottom: 8px;
  }}

  .pillar-desc {{
    font-size: 13px;
    line-height: 1.6;
    color: #CBD5E1;
  }}

  .closing-cta-bar {{
    padding: 16px 24px;
    border-radius: 12px;
    background: linear-gradient(90deg, rgba(37, 99, 235, 0.34), rgba(56, 189, 248, 0.18));
    border: 1px solid rgba(56, 189, 248, 0.38);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }}

  .closing-cta-text {{
    font-size: 16px;
    font-weight: 700;
    color: #FFFFFF;
  }}

  .closing-cta-meta {{
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--cyan);
    font-weight: 700;
  }}

  /* ================= PRINT / PDF EXPORT ================= */
  @page {{
    size: 1280px 720px;
    margin: 0;
  }}

  @media print {{
    html, body {{
      width: 1280px;
      height: auto;
      background: #FFFFFF !important;
      overflow: visible !important;
      display: block !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }}

    .hud {{
      display: none !important;
    }}

    .deck-stage {{
      width: 1280px !important;
      height: auto !important;
      transform: none !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      overflow: visible !important;
      background: transparent !important;
      display: block !important;
    }}

    .slide {{
      position: relative !important;
      inset: auto !important;
      opacity: 1 !important;
      pointer-events: auto !important;
      width: 1280px !important;
      height: 720px !important;
      page-break-after: always !important;
      break-after: page !important;
      overflow: hidden !important;
    }}

    .slide:last-child {{
      page-break-after: auto !important;
      break-after: auto !important;
    }}
  }}
</style>
</head>
<body class="screen-mode">

<main class="deck-stage" id="deck">

  <!-- SLIDE 1: COVER -->
  <section class="slide slide-cover active" data-slide="1">
    <img class="cover-bg" src="{hero_uri}" alt="Antigravity Key Visual" />
    <div class="cover-scrim"></div>
    <div class="cover-content">
      <div class="cover-pill">
        <span class="cover-pill-dot"></span>
        GOOGLE DEEPMIND &bull; AGENTIC AI ASSISTANT
      </div>

      <div class="cover-main">
        <h1 class="cover-title">Antigravity</h1>
        <p class="cover-tagline">思考から実装・検証までを<span class="accent">自律完遂</span>する、<br />次世代エージェント型AIパートナー</p>
        <p class="cover-lead">質問に答えるだけのチャットを超え、実環境でのコード編集・コマンド実行・マルチエージェント並列処理・視覚検証までを一気通貫で担います。</p>
      </div>

      <div class="cover-meta-row">
        <div class="cover-specs">
          <div class="cover-spec">
            <span class="cover-spec-label">Execution</span>
            <span class="cover-spec-val">自律設計・実装・自己修復</span>
          </div>
          <div class="cover-spec">
            <span class="cover-spec-label">Scale</span>
            <span class="cover-spec-val">並列マルチエージェント統括</span>
          </div>
          <div class="cover-spec">
            <span class="cover-spec-label">Delivery</span>
            <span class="cover-spec-val">検証済み成果物の一貫納品</span>
          </div>
        </div>
        <span class="cover-year">CAPABILITY OVERVIEW &bull; 2026</span>
      </div>
    </div>
  </section>

  <!-- SLIDE 2: PARADIGM SHIFT -->
  <section class="slide" data-slide="2">
    <header class="slide-header">
      <div class="eyebrow">01 &nbsp; PARADIGM SHIFT</div>
      <h2 class="slide-title">「答えるAI」から「やり遂げるAI」へ</h2>
      <p class="slide-subtitle">助言を返すだけで終わらず、実際の環境で手を動かし、検証済みの成果物として仕上げます。</p>
    </header>

    <div class="slide-body">
      <div class="compare-grid">
        <div class="compare-card old">
          <div class="compare-card-head">
            <h3 class="compare-card-title">従来の対話型AI</h3>
            <span class="badge-pill badge-muted">Advice Only</span>
          </div>
          <div class="compare-list">
            <div class="compare-item">
              <div class="compare-icon old">{ICONS['x']}</div>
              <div>
                <div class="compare-item-title">テキスト提案止まり</div>
                <div class="compare-item-desc">コード断片や手順を返すだけで、反映や実行は人間任せ。</div>
              </div>
            </div>
            <div class="compare-item">
              <div class="compare-icon old">{ICONS['x']}</div>
              <div>
                <div class="compare-item-title">エラーの往復コスト</div>
                <div class="compare-item-desc">実行結果やエラーを直接見えず、何度もコピペと再質問が必要。</div>
              </div>
            </div>
            <div class="compare-item">
              <div class="compare-icon old">{ICONS['x']}</div>
              <div>
                <div class="compare-item-title">単一スレッドの限界</div>
                <div class="compare-item-desc">調査・実装・レビューを同時並行できず、大規模課題で失速。</div>
              </div>
            </div>
            <div class="compare-item">
              <div class="compare-icon old">{ICONS['x']}</div>
              <div>
                <div class="compare-item-title">品質の裏付けがない</div>
                <div class="compare-item-desc">ビルド通過や画面の崩れを確認しないまま出力を終えてしまう。</div>
              </div>
            </div>
          </div>
        </div>

        <div class="compare-arrow-col">
          <div class="compare-arrow-circle">{ICONS['arrow_right']}</div>
        </div>

        <div class="compare-card new">
          <div class="compare-card-head">
            <h3 class="compare-card-title">Antigravity（エージェント型AI）</h3>
            <span class="badge-pill badge-cobalt">End-to-End Execution</span>
          </div>
          <div class="compare-list">
            <div class="compare-item">
              <div class="compare-icon new">{ICONS['check']}</div>
              <div>
                <div class="compare-item-title">実環境への直接アクション</div>
                <div class="compare-item-desc">リポジトリ探索・複数ファイル編集・シェル実行・ビルドまで直接操作して前進。</div>
              </div>
            </div>
            <div class="compare-item">
              <div class="compare-icon new">{ICONS['check']}</div>
              <div>
                <div class="compare-item-title">自律的なエラー自己修復ループ</div>
                <div class="compare-item-desc">実際のテストログと出力結果を解析し、原因特定から修正・再検証まで完遂。</div>
              </div>
            </div>
            <div class="compare-item">
              <div class="compare-icon new">{ICONS['check']}</div>
              <div>
                <div class="compare-item-title">並列マルチエージェント協調</div>
                <div class="compare-item-desc">調査・実装・ビジュアル生成を専門エージェント群で同時並列実行し高速化。</div>
              </div>
            </div>
            <div class="compare-item">
              <div class="compare-icon new">{ICONS['check']}</div>
              <div>
                <div class="compare-item-title">テスト＆視覚検証まで責任完了</div>
                <div class="compare-item-desc">自動テスト合格に加え、出力資料やUIを画像で実視確認してから納品。</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flow-banner">
        <span class="flow-banner-label">End-to-End Workflow</span>
        <div class="flow-steps-inline">
          <span class="flow-step-chip">要件構造化</span>
          <span class="flow-sep">&rarr;</span>
          <span class="flow-step-chip">環境・Web調査</span>
          <span class="flow-sep">&rarr;</span>
          <span class="flow-step-chip">実装・生成</span>
          <span class="flow-sep">&rarr;</span>
          <span class="flow-step-chip">実行・視覚検証</span>
          <span class="flow-sep">&rarr;</span>
          <span class="flow-step-chip final">確かな成果物</span>
        </div>
      </div>
    </div>

    {slide_footer(2)}
  </section>

  <!-- SLIDE 3: 6 CORE CAPABILITIES -->
  <section class="slide" data-slide="3">
    <header class="slide-header">
      <div class="eyebrow">02 &nbsp; CAPABILITY MAP</div>
      <h2 class="slide-title">複雑な課題を突破する、6つのコア能力</h2>
      <p class="slide-subtitle">開発・調査・制作・運用の各領域を横断し、実務に直結するエージェント能力を統合しています。</p>
    </header>

    <div class="slide-body">
      <div class="cap-grid">
        <div class="cap-card">
          <div>
            <div class="cap-top">
              <div class="cap-icon-box">{ICONS['brain']}</div>
              <span class="cap-num">01</span>
            </div>
            <h3 class="cap-title">深い推論と設計力</h3>
            <p class="cap-desc">曖昧な要件を構造化し、アーキテクチャ選定・トレードオフ比較・安全な実行計画を事前に設計します。</p>
          </div>
          <div class="cap-tag">Architecture &bull; Root-Cause Analysis</div>
        </div>

        <div class="cap-card">
          <div>
            <div class="cap-top">
              <div class="cap-icon-box indigo">{ICONS['terminal']}</div>
              <span class="cap-num">02</span>
            </div>
            <h3 class="cap-title">自律コーディング＆実行</h3>
            <p class="cap-desc">複数ファイルへの精密な編集から、依存解決・CLIコマンド実行・ビルド処理までをシームレスに遂行します。</p>
          </div>
          <div class="cap-tag">Code Edit &bull; Shell &bull; Build Pipeline</div>
        </div>

        <div class="cap-card">
          <div>
            <div class="cap-top">
              <div class="cap-icon-box">{ICONS['network']}</div>
              <span class="cap-num">03</span>
            </div>
            <h3 class="cap-title">並列マルチエージェント</h3>
            <p class="cap-desc">サブエージェント、Swarm、Python Workflowを駆使し、大規模タスクを同時並列で分解・統括します。</p>
          </div>
          <div class="cap-tag">Subagents &bull; Swarm &bull; Workflows</div>
        </div>

        <div class="cap-card">
          <div>
            <div class="cap-top">
              <div class="cap-icon-box indigo">{ICONS['layers']}</div>
              <span class="cap-num">04</span>
            </div>
            <h3 class="cap-title">マルチモーダル＆視覚生成</h3>
            <p class="cap-desc">コード・画像・PDF・音声・動画・最新Web情報を横断理解し、キービジュアルや資料も自ら生み出します。</p>
          </div>
          <div class="cap-tag">Vision &bull; Docs &bull; Image Generation</div>
        </div>

        <div class="cap-card">
          <div>
            <div class="cap-top">
              <div class="cap-icon-box teal">{ICONS['shield_check']}</div>
              <span class="cap-num">05</span>
            </div>
            <h3 class="cap-title">自律検証＆品質保証</h3>
            <p class="cap-desc">自動テスト・静的解析に加え、成果物をレンダリングして画像で実視チェックし、破綻を自ら修復します。</p>
          </div>
          <div class="cap-tag">Testing &bull; Visual QA &bull; Self-Healing</div>
        </div>

        <div class="cap-card">
          <div>
            <div class="cap-top">
              <div class="cap-icon-box teal">{ICONS['cpu']}</div>
              <span class="cap-num">06</span>
            </div>
            <h3 class="cap-title">拡張性と継続自動化</h3>
            <p class="cap-desc">Skills・Rules・MCP連携・Cronスケジュール実行により、一度の解決をチームの継続資産へ定着させます。</p>
          </div>
          <div class="cap-tag">Skills &bull; MCP &bull; Cron Automation</div>
        </div>
      </div>
    </div>

    {slide_footer(3)}
  </section>

  <!-- SLIDE 4: AUTONOMOUS EXECUTION LOOP -->
  <section class="slide" data-slide="4">
    <header class="slide-header">
      <div class="eyebrow">03 &nbsp; AUTONOMOUS EXECUTION</div>
      <h2 class="slide-title">書いて終わりにしない。検証駆動の自律開発ループ</h2>
      <p class="slide-subtitle">探索・設計・実装・検証・修復を閉ループで回し、確証のある状態まで自ら磨き上げます。</p>
    </header>

    <div class="slide-body">
      <div class="loop-layout">
        <div class="loop-diagram-card">
          <div class="loop-stages">
            <div class="loop-stage">
              <div class="loop-step-badge">STEP 01</div>
              <div>
                <div class="loop-stage-title">並列探索・全体把握</div>
                <div class="loop-stage-desc">関連ファイル・設定・既存テストをバッチ並列で読み込み、文脈と制約を正確に把握。</div>
              </div>
            </div>
            <div class="loop-stage">
              <div class="loop-step-badge">STEP 02</div>
              <div>
                <div class="loop-stage-title">影響分析・設計計画</div>
                <div class="loop-stage-desc">変更範囲とエッジケースを整理し、最小コストで安全な実装・検証戦略を立案。</div>
              </div>
            </div>
            <div class="loop-stage highlight">
              <div class="loop-step-badge">STEP 03</div>
              <div>
                <div class="loop-stage-title">精密な並列実装・生成</div>
                <div class="loop-stage-desc">既存アーキテクチャとコーディング規約に沿ったクリーンな差分を一括適用。</div>
              </div>
            </div>
            <div class="loop-stage verify">
              <div class="loop-step-badge">STEP 04</div>
              <div>
                <div class="loop-stage-title">実行テスト・実視検証</div>
                <div class="loop-stage-desc">ビルド・ユニットテスト・レンダリング画像の目視確認を実行し、品質を客観判定。</div>
              </div>
            </div>
          </div>

          <div class="loop-feedback-bar">
            <span class="loop-feedback-tag">&#x21BA; SELF-HEALING LOOP</span>
            <span>異常・崩れ検知時は原因を即座に特定し STEP 03 へ自動回帰</span>
          </div>
        </div>

        <div class="loop-right">
          <div class="terminal-card">
            <div class="terminal-bar">
              <div class="term-dots">
                <span class="term-dot r"></span>
                <span class="term-dot y"></span>
                <span class="term-dot g"></span>
              </div>
              <span class="term-title">antigravity — verified-loop.log</span>
            </div>
            <div class="terminal-body">
              <div><span class="t-cyan">&#x25B8; [SCAN]</span>   Parallel read 14 source files</div>
              <div><span class="t-indigo">&#x25B8; [PLAN]</span>   Mapped dependencies &amp; test matrix</div>
              <div><span class="t-amber">&#x25B8; [EDIT]</span>   Applied minimal diff across 4 modules</div>
              <div><span class="t-cyan">&#x25B8; [RUN]</span>    pytest &amp;&amp; build &amp;&amp; render_slides</div>
              <div><span class="t-teal">  &#x2713;</span> 42 tests passed, 0 failed <span class="t-muted">(1.8s)</span></div>
              <div><span class="t-teal">  &#x2713;</span> Visual QA: 10/10 pages clean</div>
              <div><span class="t-teal">&#x25B8; [DONE]</span>   Deliverable verified &amp; cited</div>
            </div>
          </div>

          <div class="kpi-row">
            <div class="kpi-chip">
              <div class="kpi-label">Efficiency</div>
              <div class="kpi-val">バッチ並列実行</div>
              <div class="kpi-sub">独立した読込・編集・検証を同時処理し、ムダな往復を削減</div>
            </div>
            <div class="kpi-chip">
              <div class="kpi-label">Accountability</div>
              <div class="kpi-val">根拠ある完了報告</div>
              <div class="kpi-sub">変更ファイル・行番号・検証ログを明示してレビューを高速化</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {slide_footer(4)}
  </section>

  <!-- SLIDE 5: MULTI-AGENT ORCHESTRATION (DARK) -->
  <section class="slide dark slide-dark-feature" data-slide="5">
    <img class="dark-bg-img" src="{orch_uri}" alt="Orchestration Backdrop" />
    <div class="dark-bg-scrim"></div>

    <header class="slide-header">
      <div class="eyebrow">04 &nbsp; PARALLEL ORCHESTRATION</div>
      <h2 class="slide-title">単一視点を超越する、マルチエージェント並列統括</h2>
      <p class="slide-subtitle">課題の規模と性質に応じ、専門エージェント群と独立ワークスペースを自在に編成します。</p>
    </header>

    <div class="slide-body">
      <div class="orch-shell">
        <div class="orch-hub">
          <div class="orch-hub-left">
            <span class="orch-hub-badge">COORDINATOR</span>
            <div>
              <div class="orch-hub-title">Antigravity 統括エージェント</div>
              <div class="orch-hub-desc">タスク分解・依存設計・エージェント配備・結果のクロスチェックと最終統合を担う中枢</div>
            </div>
          </div>
          <span class="badge-pill" style="background:rgba(56,189,248,0.16); color:#38BDF8; border:1px solid rgba(56,189,248,0.35);">Dynamic Scaling</span>
        </div>

        <svg class="orch-connectors" viewBox="0 0 1160 28" preserveAspectRatio="none">
          <path d="M580 0 V14 M145 14 H1015 M145 14 V28 M435 14 V28 M725 14 V28 M1015 14 V28"
                stroke="rgba(56,189,248,0.55)" stroke-width="1.8" fill="none" />
        </svg>

        <div class="orch-grid">
          <div class="orch-card">
            <div>
              <div class="orch-card-tag">MODE 01 &bull; DELEGATE</div>
              <h3 class="orch-card-title">専門サブエージェント</h3>
              <p class="orch-card-desc">コード調査・Webリサーチ・画像生成などを独立コンテキストへ非同期委任し、主思考をクリーンに保持。</p>
            </div>
            <div class="orch-card-meta">research / image-generator / custom</div>
          </div>

          <div class="orch-card">
            <div>
              <div class="orch-card-tag">MODE 02 &bull; COLLABORATE</div>
              <h3 class="orch-card-title">Agent Swarm</h3>
              <p class="orch-card-desc">複数ワーカーが共有メッセージボード上で役割分担・協調し、大型プロジェクトをチーム体制で推進。</p>
            </div>
            <div class="orch-card-meta">Shared board &bull; Multi-worker</div>
          </div>

          <div class="orch-card">
            <div>
              <div class="orch-card-tag">MODE 03 &bull; PIPELINE</div>
              <h3 class="orch-card-title">Python ワークフロー</h3>
              <p class="orch-card-desc">コード制御による大規模ファンアウト（parallel）と段階パイプライン（pipeline）で大量ファイルを一括処理。</p>
            </div>
            <div class="orch-card-meta">parallel() &bull; pipeline() &bull; aggregate</div>
          </div>

          <div class="orch-card">
            <div>
              <div class="orch-card-tag">MODE 04 &bull; ISOLATION</div>
              <h3 class="orch-card-title">独立ワークスペース</h3>
              <p class="orch-card-desc">各ワーカーに独立した作業コピー（share / branch）を割り当て、同時編集・ビルドの競合を根本排除。</p>
            </div>
            <div class="orch-card-meta">workspace: inherit / share / branch</div>
          </div>
        </div>

        <div class="orch-bottom-strip">
          <div class="orch-pill"><span class="orch-pill-dot"></span>大規模リポジトリの横断監査・一括リファクタ</div>
          <div class="orch-pill"><span class="orch-pill-dot"></span>複数視点からの並列レビューで見落とし削減</div>
          <div class="orch-pill"><span class="orch-pill-dot"></span>調査・素材制作・実装の同時進行でリードタイム短縮</div>
        </div>
      </div>
    </div>

    {slide_footer(5, dark=True)}
  </section>

  <!-- SLIDE 6: MULTIMODAL & VISUAL -->
  <section class="slide" data-slide="6">
    <header class="slide-header">
      <div class="eyebrow">05 &nbsp; MULTIMODAL &amp; CREATIVE</div>
      <h2 class="slide-title">「読む・見る・描く」を統合したマルチモーダル表現力</h2>
      <p class="slide-subtitle">コードやテキストに限らず、画像・文書・音声・動画を深く理解し、洗練された成果物へ昇華します。</p>
    </header>

    <div class="slide-body">
      <div class="multi-layout">
        <div class="multi-col">
          <div class="io-card">
            <div class="io-head">
              <h3 class="io-title">多様なインプット理解（Understand）</h3>
              <span class="badge-pill badge-muted">Multi-Source Input</span>
            </div>
            <div class="io-grid">
              <div class="io-item">
                <div class="io-item-title">コード・設計資産</div>
                <div class="io-item-desc">リポジトリ構造・設定・差分履歴を文脈ごと精密に読解</div>
              </div>
              <div class="io-item">
                <div class="io-item-title">画像・UI・PDF資料</div>
                <div class="io-item-desc">画面スクリーンショットの崩れや図表・仕様書を直接解析</div>
              </div>
              <div class="io-item">
                <div class="io-item-title">音声・動画メディア</div>
                <div class="io-item-desc">デモ動画や音声データから要件・挙動・改善点を抽出</div>
              </div>
              <div class="io-item">
                <div class="io-item-title">最新Webリサーチ</div>
                <div class="io-item-desc">公式ドキュメントや最新動向をリアルタイム検索で裏取り</div>
              </div>
            </div>
          </div>

          <div class="io-card output">
            <div class="io-head">
              <h3 class="io-title">多彩なアウトプット創出（Create）</h3>
              <span class="badge-pill badge-cobalt">Ready-to-Use Output</span>
            </div>
            <div class="io-grid">
              <div class="io-item">
                <div class="io-item-title">Webアプリ・UI実装</div>
                <div class="io-item-desc">デザインシステムを備えた実働フロントエンド＆API構築</div>
              </div>
              <div class="io-item">
                <div class="io-item-title">オリジナル図版生成</div>
                <div class="io-item-desc">用途とトーンに合わせたキービジュアルを自律生成</div>
              </div>
              <div class="io-item">
                <div class="io-item-title">プレゼン＆文書資料</div>
                <div class="io-item-desc">HTML5・PDF・編集可能PPTXまで用途別の完成形式で納品</div>
              </div>
              <div class="io-item">
                <div class="io-item-title">Mermaid設計・分析図</div>
                <div class="io-item-desc">構成図・シーケンス図・比較表で複雑な議論を可視化</div>
              </div>
            </div>
          </div>
        </div>

        <div class="visual-frame">
          <div class="visual-img-wrap">
            <img src="{multi_uri}" alt="Multimodal Intelligence Visual" />
          </div>
          <div class="visual-caption">
            <span><strong>Art-Directed Visual Synthesis</strong></span>
            <span>本スライドのために自律生成</span>
          </div>
        </div>
      </div>
    </div>

    {slide_footer(6)}
  </section>

  <!-- SLIDE 7: EXTENSIBILITY & AUTOMATION -->
  <section class="slide" data-slide="7">
    <header class="slide-header">
      <div class="eyebrow">06 &nbsp; EXTENSIBILITY &amp; AUTOMATION</div>
      <h2 class="slide-title">チーム固有の知見を取り込み、継続進化する基盤</h2>
      <p class="slide-subtitle">その場限りの支援で終わらせず、ルール・外部連携・定期自動化によって組織の生産性を底上げします。</p>
    </header>

    <div class="slide-body">
      <div class="bento-grid">
        <div class="bento-card">
          <div>
            <div class="bento-kicker">KNOWLEDGE SYSTEM</div>
            <h3 class="bento-title">Skills &amp; Rules</h3>
            <ul class="bento-list">
              <li>プロジェクト固有の規約・手順・ベストプラクティスをモジュール化して装備</li>
              <li>一度確立した高度なワークフローをチーム全体で再現性高く再利用</li>
            </ul>
          </div>
          <div class="bento-foot">SKILL.md &bull; Workspace Rules &bull; Hooks</div>
        </div>

        <div class="bento-card indigo">
          <div>
            <div class="bento-kicker">ECOSYSTEM CONNECTIVITY</div>
            <h3 class="bento-title">MCP ＆ 外部ツール連携</h3>
            <ul class="bento-list">
              <li>Model Context Protocol 経由で外部API・DB・社内ツール群と安全に接続</li>
              <li>コード・チケット・ドキュメントを横断した業務自動化を実現</li>
            </ul>
          </div>
          <div class="bento-foot">MCP Servers &bull; Custom Plugins &bull; CLI</div>
        </div>

        <div class="bento-card teal">
          <div>
            <div class="bento-kicker">CONTINUOUS OPERATIONS</div>
            <h3 class="bento-title">スケジュール実行＆非同期管理</h3>
            <ul class="bento-list">
              <li>Cron・タイマーによる定期監視、日次サマリー生成、自動メンテナンスを実行</li>
              <li>開発サーバーや長時間ビルドなどのバックグラウンドプロセスを安全に制御</li>
            </ul>
          </div>
          <div class="bento-foot">Cron &bull; One-Shot Timer &bull; Daemon Tasks</div>
        </div>

        <div class="bento-card slate">
          <div>
            <div class="bento-kicker">STRUCTURED COLLABORATION</div>
            <h3 class="bento-title">Artifacts &amp; 可視化ドキュメント</h3>
            <ul class="bento-list">
              <li>実行計画書・実験ログ・詳細分析レポートを構造化Markdownで自動整理</li>
              <li>Mermaid図やクリック可能なファイルリンクでレビュー負荷を大幅軽減</li>
            </ul>
          </div>
          <div class="bento-foot">Plans &bull; Reports &bull; Mermaid Diagrams</div>
        </div>
      </div>
    </div>

    {slide_footer(7)}
  </section>

  <!-- SLIDE 8: PRACTICAL USE CASES -->
  <section class="slide" data-slide="8">
    <header class="slide-header">
      <div class="eyebrow">07 &nbsp; PRACTICAL USE CASES</div>
      <h2 class="slide-title">開発から意思決定まで、現場を変える4つの実践シナリオ</h2>
      <p class="slide-subtitle">上流の調査・構想から実装・障害対応・資料制作まで、現場のボトルネックを直接解消します。</p>
    </header>

    <div class="slide-body">
      <div class="cases-grid">
        <div class="case-card">
          <div class="case-accent"></div>
          <div class="case-inner">
            <div>
              <div class="case-num">CASE 01</div>
              <h3 class="case-title">新機能開発・<br />高速プロトタイプ</h3>
              <div class="case-block">
                <div class="case-block-label">Challenge</div>
                <p class="case-block-text">仕様検討からUI・API・テスト実装まで工数が膨らみ、初動が遅れがち。</p>
              </div>
              <div class="case-block">
                <div class="case-block-label" style="color:var(--cobalt);">Approach</div>
                <p class="case-block-text">要件整理からフロント／バック並列実装、ビルド・実画面検証まで一気通貫で推進。</p>
              </div>
            </div>
            <div class="case-outcome">アイデアを最短距離で「動く・検証済みのプロダクト」へ昇華</div>
          </div>
        </div>

        <div class="case-card">
          <div class="case-accent c2"></div>
          <div class="case-inner">
            <div>
              <div class="case-num">CASE 02</div>
              <h3 class="case-title">複雑バグ調査・<br />大規模リファクタ</h3>
              <div class="case-block">
                <div class="case-block-label">Challenge</div>
                <p class="case-block-text">原因が複数モジュールに跨り、修正による影響範囲やデグレリスクが見えにくい。</p>
              </div>
              <div class="case-block">
                <div class="case-block-label" style="color:var(--indigo);">Approach</div>
                <p class="case-block-text">並列調査で根本原因を特定し、最小差分で修正したうえで回帰テストを自動検証。</p>
              </div>
            </div>
            <div class="case-outcome">デグレを未然に防ぎつつ、技術的負債と障害原因を安全に解消</div>
          </div>
        </div>

        <div class="case-card">
          <div class="case-accent c3"></div>
          <div class="case-inner">
            <div>
              <div class="case-num">CASE 03</div>
              <h3 class="case-title">技術リサーチ・<br />意思決定支援</h3>
              <div class="case-block">
                <div class="case-block-label">Challenge</div>
                <p class="case-block-text">最新技術や設計案の比較検討に膨大な調査時間がかかり、判断が属人化しやすい。</p>
              </div>
              <div class="case-block">
                <div class="case-block-label" style="color:var(--teal);">Approach</div>
                <p class="case-block-text">既存コードの制約と最新Web一次情報を掛け合わせ、比較表・構成図付きで整理。</p>
              </div>
            </div>
            <div class="case-outcome">根拠とトレードオフが明確な設計判断を短時間で獲得</div>
          </div>
        </div>

        <div class="case-card">
          <div class="case-accent c4"></div>
          <div class="case-inner">
            <div>
              <div class="case-num">CASE 04</div>
              <h3 class="case-title">企画書・スライド・<br />ドキュメント制作</h3>
              <div class="case-block">
                <div class="case-block-label">Challenge</div>
                <p class="case-block-text">構成づくり・図版制作・レイアウト調整まで一貫して高品質に仕上げる負荷が高い。</p>
              </div>
              <div class="case-block">
                <div class="case-block-label" style="color:#0284C7;">Approach</div>
                <p class="case-block-text">ストーリー設計・専用ビジュアル生成・多形式出力・全ページ視覚QAまで完結。</p>
              </div>
            </div>
            <div class="case-outcome">そのまま提案・共有に使える高品位な資料をスピーディに納品</div>
          </div>
        </div>
      </div>
    </div>

    {slide_footer(8)}
  </section>

  <!-- SLIDE 9: PROOF IN ACTION -->
  <section class="slide slide-proof" data-slide="9">
    <header class="slide-header">
      <div class="eyebrow">08 &nbsp; PROOF IN ACTION</div>
      <h2 class="slide-title">このスライド資料そのものが、実行力の証明です</h2>
      <p class="slide-subtitle">「能力をアピールする資料を作って」という一言から、設計・素材生成・多形式出力・視覚検品まで自律完遂しました。</p>
    </header>

    <div class="slide-body">
      <div class="proof-timeline">
        <div class="proof-step">
          <div>
            <div class="proof-step-top">
              <div class="proof-num">01</div>
              <span class="proof-arrow">&rarr;</span>
            </div>
            <h3 class="proof-step-title">構成＆デザイン設計</h3>
            <p class="proof-step-desc">10枚のストーリー弧、配色ルール、日本語タイポグラフィ、余白設計を体系的に設計。</p>
          </div>
          <div class="proof-step-tech">Swiss-Modern Design System</div>
        </div>

        <div class="proof-step">
          <div>
            <div class="proof-step-top">
              <div class="proof-num">02</div>
              <span class="proof-arrow">&rarr;</span>
            </div>
            <h3 class="proof-step-title">並列ビジュアル生成</h3>
            <p class="proof-step-desc">3体の画像生成サブエージェントを同時起動し、世界観に調和する専用図版を制作。</p>
          </div>
          <div class="proof-step-tech">3&times; Parallel Subagents</div>
        </div>

        <div class="proof-step">
          <div>
            <div class="proof-step-top">
              <div class="proof-num">03</div>
              <span class="proof-arrow">&rarr;</span>
            </div>
            <h3 class="proof-step-title">マルチフォーマット生成</h3>
            <p class="proof-step-desc">HTML5・高精細PDF・編集可能PPTXの3形式をコードから精密に同時ビルド。</p>
          </div>
          <div class="proof-step-tech">HTML5 + Chrome PDF + python-pptx</div>
        </div>

        <div class="proof-step">
          <div>
            <div class="proof-step-top">
              <div class="proof-num">04</div>
              <span class="proof-arrow">&#x2713;</span>
            </div>
            <h3 class="proof-step-title">自動レンダリング＆視覚QA</h3>
            <p class="proof-step-desc">全スライドを画像変換して1枚ずつ実視確認し、フォント・余白・崩れを徹底検品。</p>
          </div>
          <div class="proof-step-tech">Headless Render + Visual Inspection</div>
        </div>
      </div>

      <div class="deliverables-box">
        <div class="deliverables-head">Deliverables Produced Autonomously in This Session</div>
        <div class="deliverables-grid">
          <div class="deliv-card">
            <div class="deliv-title">Interactive HTML5 Deck</div>
            <div class="deliv-file">antigravity_presentation.html</div>
            <div class="deliv-desc">単一ファイルで完結。ブラウザ即再生・キーボード操作・一覧モード対応。</div>
          </div>
          <div class="deliv-card">
            <div class="deliv-title">Print-Ready PDF</div>
            <div class="deliv-file">antigravity_presentation.pdf</div>
            <div class="deliv-desc">16:9 高精細レイアウト。どの環境でも崩れない共有・配布向けフォーマット。</div>
          </div>
          <div class="deliv-card">
            <div class="deliv-title">Editable PowerPoint</div>
            <div class="deliv-file">antigravity_presentation.pptx</div>
            <div class="deliv-desc">テキスト・図形をそのまま編集可能なネイティブPowerPoint資料。</div>
          </div>
        </div>
      </div>
    </div>

    {slide_footer(9)}
  </section>

  <!-- SLIDE 10: CLOSING -->
  <section class="slide dark slide-closing" data-slide="10">
    <img class="closing-bg" src="{hero_uri}" alt="Closing Backdrop" />
    <div class="closing-scrim"></div>
    <div class="closing-content">
      <div>
        <div class="eyebrow">ANTIGRAVITY &nbsp;&bull;&nbsp; GOOGLE DEEPMIND</div>
        <div class="closing-hero">
          <h2 class="closing-title">複雑な課題を、確かな成果へ。</h2>
          <p class="closing-sub">スピードだけでなく、根拠・安全性・検証品質を兼ね備えた自律パートナーとして、あなたの開発と創造を次の次元へ引き上げます。</p>
        </div>

        <div class="pillars-grid">
          <div class="pillar-card">
            <div class="pillar-num">01 &nbsp; TRANSPARENCY</div>
            <h3 class="pillar-title">透明なプロセス</h3>
            <p class="pillar-desc">実行計画・変更差分・参照ファイルと根拠を常に明示し、ブラックボックスにしません。</p>
          </div>
          <div class="pillar-card">
            <div class="pillar-num">02 &nbsp; SAFETY &amp; CONTROL</div>
            <h3 class="pillar-title">揺るがない安全性</h3>
            <p class="pillar-desc">権限と環境境界を厳格に守り、判断が分かれる仕様は確認を挟んで確実に進めます。</p>
          </div>
          <div class="pillar-card">
            <div class="pillar-num">03 &nbsp; VERIFIED DELIVERY</div>
            <h3 class="pillar-title">検証済みの完遂力</h3>
            <p class="pillar-desc">提案で止めず、テスト合格・実視確認までクリアした実働成果物としてお届けします。</p>
          </div>
        </div>
      </div>

      <div>
        <div class="closing-cta-bar">
          <span class="closing-cta-text">次に解決したい課題から、いつでも始めてください。</span>
          <span class="closing-cta-meta">ANTIGRAVITY &bull; READY TO EXECUTE</span>
        </div>
        {slide_footer(10, dark=True)}
      </div>
    </div>
  </section>

</main>

<nav class="hud" id="hud" aria-label="Slide controls">
  <button id="btn-prev" title="Previous (&larr;)">&larr; Prev</button>
  <span class="hud-counter" id="hud-counter">01 / 10</span>
  <button id="btn-next" title="Next (&rarr; / Space)">Next &rarr;</button>
  <button id="btn-grid" title="Overview (G)">Grid</button>
  <button id="btn-fs" title="Fullscreen (F)">Full</button>
</nav>

<script>
(() => {{
  const deck = document.getElementById('deck');
  const slides = Array.from(deck.querySelectorAll('.slide'));
  const counter = document.getElementById('hud-counter');
  let current = 0;
  let overview = false;

  function pad(n) {{ return String(n).padStart(2, '0'); }}

  function scaleStage() {{
    if (overview) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min((vw - 24) / 1280, (vh - 24) / 720, 1.35);
    deck.style.transform = `scale(${{Math.max(0.2, scale)}})`;
  }}

  function showSlide(idx) {{
    current = Math.max(0, Math.min(slides.length - 1, idx));
    slides.forEach((s, i) => s.classList.toggle('active', i === current));
    counter.textContent = `${{pad(current + 1)}} / ${{pad(slides.length)}}`;
    if (location.hash !== `#${{current + 1}}`) {{
      history.replaceState(null, '', `#${{current + 1}}`);
    }}
  }}

  function toggleOverview(force) {{
    overview = typeof force === 'boolean' ? force : !overview;
    if (overview) {{
      document.body.classList.remove('screen-mode');
      document.body.classList.add('overview-mode');
      deck.innerHTML = '';
      slides.forEach((slide, i) => {{
        const wrap = document.createElement('div');
        wrap.className = 'slide-thumb' + (i === current ? ' current' : '');
        wrap.appendChild(slide);
        wrap.addEventListener('click', () => {{
          toggleOverview(false);
          showSlide(i);
        }});
        deck.appendChild(wrap);
      }});
      requestAnimationFrame(scaleThumbs);
    }} else {{
      document.body.classList.remove('overview-mode');
      document.body.classList.add('screen-mode');
      deck.innerHTML = '';
      slides.forEach((slide) => {{
        slide.style.transform = '';
        deck.appendChild(slide);
      }});
      showSlide(current);
      scaleStage();
    }}
  }}

  function scaleThumbs() {{
    if (!overview) return;
    deck.querySelectorAll('.slide-thumb').forEach((wrap) => {{
      const s = wrap.clientWidth / 1280;
      const sl = wrap.querySelector('.slide');
      if (sl) sl.style.transform = `scale(${{s}})`;
    }});
  }}

  document.getElementById('btn-prev').addEventListener('click', () => {{
    if (overview) toggleOverview(false);
    showSlide(current - 1);
  }});
  document.getElementById('btn-next').addEventListener('click', () => {{
    if (overview) toggleOverview(false);
    showSlide(current + 1);
  }});
  document.getElementById('btn-grid').addEventListener('click', () => toggleOverview());
  document.getElementById('btn-fs').addEventListener('click', () => {{
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }});

  window.addEventListener('keydown', (e) => {{
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {{
      e.preventDefault();
      if (overview) toggleOverview(false);
      showSlide(current + 1);
    }} else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {{
      e.preventDefault();
      if (overview) toggleOverview(false);
      showSlide(current - 1);
    }} else if (e.key === 'Home') {{
      showSlide(0);
    }} else if (e.key === 'End') {{
      showSlide(slides.length - 1);
    }} else if (e.key.toLowerCase() === 'g' || e.key === 'Escape') {{
      if (e.key === 'Escape' && !overview) return;
      toggleOverview();
    }} else if (e.key.toLowerCase() === 'f') {{
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    }}
  }});

  window.addEventListener('resize', () => {{
    scaleStage();
    scaleThumbs();
  }});

  const initial = parseInt(location.hash.replace('#', ''), 10);
  showSlide(Number.isFinite(initial) ? initial - 1 : 0);
  scaleStage();
}})();
</script>
</body>
</html>
"""
    return html


if __name__ == "__main__":
    OUT_HTML.write_text(build_html(), encoding="utf-8")
    print(f"Wrote {OUT_HTML} ({OUT_HTML.stat().st_size:,} bytes)")
