const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_HTML = path.join(ROOT, 'antigravity_capabilities.html');

const heroSrcCandidates = [
  '/Users/babashunsuke/.gemini/antigravity-cli/brain/35b588c8-fd83-46ff-845a-5969f214c72e/hero_prism_1795131660103.jpg',
  path.join(ROOT, 'assets/hero_prism.png'),
];
const multiSrcCandidates = [
  '/Users/babashunsuke/.gemini/antigravity-cli/brain/35b588c8-fd83-46ff-845a-5969f214c72e/multimodal_prism_1795131659639.jpg',
  path.join(ROOT, 'assets/multimodal_prism.png'),
];

function toDataUri(candidates) {
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const ext = path.extname(p).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
      const b64 = fs.readFileSync(p).toString('base64');
      return `data:${mime};base64,${b64}`;
    }
  }
  return '';
}

const HERO_IMG = toDataUri(heroSrcCandidates);
const MULTI_IMG = toDataUri(multiSrcCandidates);

const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Antigravity — 次世代エージェンティック AI 能力紹介資料</title>
<style>
  :root {
    --dark-bg: #070C18;
    --dark-surface: #111A2E;
    --dark-surface-2: #17233D;
    --dark-border: #233354;
    --light-bg: #F8FAFC;
    --white: #FFFFFF;
    --soft: #F1F5F9;
    --border: #DCE4EE;
    --ink: #0F172A;
    --body: #334155;
    --muted: #64748B;
    --faint: #94A3B8;
    --dark-body: #CBD5E1;
    --dark-muted: #94A3B8;

    --cobalt: #2563EB;
    --cobalt-soft: #EFF6FF;
    --cobalt-tint: #DBEAFE;
    --cyan: #06B6D4;
    --cyan-bright: #38BDF8;
    --indigo: #4F46E5;
    --indigo-soft: #EEF2FF;
    --teal: #0D9488;
    --teal-soft: #F0FDFA;
    --coral: #EA580C;
    --coral-soft: #FFF7ED;
    --amber: #D97706;
    --amber-bright: #F59E0B;
    --amber-soft: #FFFBEB;

    --font-ja: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-en: 'Avenir Next', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-mono: 'SF Mono', 'Menlo', 'Consolas', monospace;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #030712;
    font-family: var(--font-ja);
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
  }

  #stage-wrapper {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at 50% 35%, #111827 0%, #030712 100%);
  }

  #deck {
    position: relative;
    width: 1280px;
    height: 720px;
    transform-origin: center center;
    box-shadow: 0 32px 90px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    overflow: hidden;
    background: var(--dark-bg);
  }

  .slide {
    position: absolute;
    inset: 0;
    width: 1280px;
    height: 720px;
    padding: 40px 62px 54px 62px;
    background: var(--light-bg);
    display: flex;
    flex-direction: column;
    opacity: 0;
    pointer-events: none;
    transform: translateX(28px) scale(0.992);
    transition: opacity 0.42s cubic-bezier(0.22, 1, 0.36, 1), transform 0.42s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .slide.active {
    opacity: 1;
    pointer-events: auto;
    transform: translateX(0) scale(1);
    z-index: 2;
  }

  .slide.prev { transform: translateX(-28px) scale(0.992); }
  .slide.dark { background: var(--dark-bg); color: var(--white); }
  .slide.dark::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 5px;
    background: linear-gradient(90deg, var(--cobalt) 0%, var(--cyan) 100%);
  }

  .slide-header { margin-bottom: 22px; flex-shrink: 0; }
  .kicker {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-family: var(--font-en);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: var(--cobalt);
    margin-bottom: 8px;
  }
  .kicker::before { content: ''; width: 24px; height: 3.5px; border-radius: 2px; background: var(--cobalt); }
  .slide.dark .kicker { color: var(--cyan-bright); }
  .slide.dark .kicker::before { background: var(--cyan-bright); }

  .slide-title { font-size: 29px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.25; color: var(--ink); }
  .slide.dark .slide-title { color: var(--white); }
  .slide-subtitle { margin-top: 6px; font-size: 14.5px; color: var(--muted); line-height: 1.5; }
  .slide.dark .slide-subtitle { color: var(--dark-muted); }

  .slide-body { flex: 1; display: flex; flex-direction: column; min-height: 0; }

  .slide-footer {
    position: absolute;
    left: 62px; right: 62px; bottom: 18px;
    padding-top: 10px;
    border-top: 1px solid var(--border);
    display: flex; justify-content: space-between; align-items: center;
    font-family: var(--font-en); font-size: 10.5px; font-weight: 700; letter-spacing: 0.1em;
    color: var(--faint);
  }
  .slide.dark .slide-footer { border-top-color: var(--dark-border); color: #64748B; }
  .slide-footer .page-num { color: var(--muted); }
  .slide.dark .slide-footer .page-num { color: var(--dark-muted); }

  .pill {
    display: inline-flex; align-items: center;
    padding: 4px 11px; border-radius: 999px;
    font-size: 11px; font-weight: 700; line-height: 1.2; white-space: nowrap;
  }
  .pill.en { font-family: var(--font-en); letter-spacing: 0.08em; }

  .card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
  }

  /* SLIDE 1 */
  .s1-layout { flex: 1; display: grid; grid-template-columns: 1.22fr 1fr; gap: 24px; align-items: center; }
  .s1-left { position: relative; padding-left: 26px; border-left: 3px solid var(--dark-border); }
  .s1-left::before { content: ''; position: absolute; left: -3px; top: 0; width: 3px; height: 120px; background: linear-gradient(180deg, var(--cyan-bright), var(--cobalt)); }
  .s1-badge {
    display: inline-flex; align-items: center; padding: 6px 14px; border-radius: 999px;
    background: var(--dark-surface); border: 1px solid var(--dark-border);
    font-family: var(--font-en); font-size: 11px; font-weight: 700; letter-spacing: 0.14em;
    color: var(--cyan-bright); margin-bottom: 22px;
  }
  .s1-brand { font-family: var(--font-en); font-size: 68px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.02; color: var(--white); }
  .s1-rule { display: flex; gap: 8px; margin: 20px 0 22px; }
  .s1-rule span:first-child { width: 112px; height: 5px; border-radius: 3px; background: var(--cobalt); }
  .s1-rule span:last-child { width: 34px; height: 5px; border-radius: 3px; background: var(--cyan); }
  .s1-headline { font-size: 25px; font-weight: 700; line-height: 1.42; color: #F1F5F9; margin-bottom: 16px; }
  .s1-lead { font-size: 14.5px; line-height: 1.65; color: var(--dark-muted); margin-bottom: 30px; max-width: 560px; }
  .s1-chips { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .s1-chip { background: var(--dark-surface); border: 1px solid var(--dark-border); border-radius: 10px; padding: 12px 13px; }
  .s1-chip-bar { width: 30px; height: 3px; border-radius: 2px; margin-bottom: 8px; }
  .s1-chip-k { font-family: var(--font-en); font-size: 9.5px; font-weight: 700; letter-spacing: 0.1em; color: var(--dark-muted); margin-bottom: 5px; }
  .s1-chip-v { font-size: 11.8px; font-weight: 700; color: var(--white); white-space: nowrap; }
  .s1-visual { display: flex; align-items: center; justify-content: center; }
  .s1-visual img {
    width: 100%; max-width: 470px; aspect-ratio: 1 / 1; object-fit: contain;
    mask-image: radial-gradient(circle at center, black 62%, transparent 98%);
    -webkit-mask-image: radial-gradient(circle at center, black 62%, transparent 98%);
  }

  /* SLIDE 2 */
  .s2-compare { display: grid; grid-template-columns: 1fr 56px 1.12fr; align-items: center; gap: 12px; margin-bottom: 22px; }
  .s2-old { background: var(--soft); border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; }
  .s2-new { background: var(--ink); border: 1.5px solid var(--cobalt); border-left: 6px solid var(--cyan-bright); border-radius: 12px; padding: 16px 22px; color: var(--white); }
  .s2-arrow {
    width: 44px; height: 44px; margin: 0 auto; border-radius: 50%;
    background: var(--cobalt); color: var(--white);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; font-weight: 800; box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
  }
  .s2-pillars { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .s2-pillar { padding: 20px 22px; border-top: 5px solid var(--cobalt); display: flex; flex-direction: column; }
  .s2-pillar-head { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; }
  .s2-num { font-family: var(--font-en); font-size: 38px; font-weight: 800; line-height: 1; }
  .s2-en { font-family: var(--font-en); font-size: 10.5px; font-weight: 700; letter-spacing: 0.1em; color: var(--muted); }
  .s2-ptitle { font-size: 17px; font-weight: 800; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--border); }
  .s2-list { list-style: none; display: flex; flex-direction: column; gap: 12px; font-size: 13px; color: var(--body); line-height: 1.5; }
  .s2-list li { display: flex; gap: 10px; align-items: flex-start; }
  .s2-dot { width: 7px; height: 7px; border-radius: 50%; margin-top: 7px; flex-shrink: 0; }

  /* SLIDE 3 */
  .s3-grid { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr); gap: 18px; }
  .s3-card { padding: 20px 22px; border-left: 5px solid var(--cobalt); display: flex; flex-direction: column; justify-content: space-between; }
  .s3-top { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .s3-num { width: 36px; height: 30px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-family: var(--font-en); font-size: 13px; font-weight: 800; }
  .s3-title { font-size: 16.5px; font-weight: 800; color: var(--ink); }
  .s3-desc { font-size: 13px; line-height: 1.58; color: var(--body); flex: 1; }
  .s3-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }

  /* SLIDE 4 */
  .s4-loop-box { padding: 20px 22px 16px; margin-bottom: 18px; }
  .s4-steps { display: grid; grid-template-columns: repeat(5, 1fr); gap: 18px; }
  .s4-step {
    background: var(--light-bg); border: 1.5px solid var(--border); border-radius: 10px;
    padding: 13px 14px; cursor: pointer; transition: all 0.22s ease; position: relative;
  }
  .s4-step:hover, .s4-step.selected { border-color: var(--cobalt); background: var(--cobalt-soft); transform: translateY(-2px); }
  .s4-step.final { background: var(--ink); border-color: var(--ink); color: var(--white); }
  .s4-step.final.selected { border-color: var(--cyan-bright); background: #0F1E3A; }
  .s4-step:not(:last-child)::after {
    content: '›'; position: absolute; right: -15px; top: 50%; transform: translateY(-52%);
    font-family: var(--font-en); font-size: 22px; font-weight: 800; color: var(--cobalt);
  }
  .s4-snum { display: inline-block; padding: 2px 8px; border-radius: 5px; font-family: var(--font-en); font-size: 11px; font-weight: 800; color: var(--white); margin-bottom: 6px; }
  .s4-stitle { font-size: 14px; font-weight: 800; margin-bottom: 4px; }
  .s4-ssub { font-size: 11.5px; color: var(--muted); line-height: 1.4; }
  .s4-step.final .s4-ssub { color: var(--dark-body); }
  .s4-feedback {
    margin-top: 12px; padding: 9px 16px; border-radius: 8px;
    background: var(--cobalt-soft); border: 1px solid var(--cobalt-tint);
    display: flex; align-items: center; justify-content: space-between;
    font-size: 12px; font-weight: 700; color: var(--cobalt);
  }
  .s4-trace { font-family: var(--font-mono); font-size: 11px; font-weight: 500; color: var(--ink); background: var(--white); padding: 4px 10px; border-radius: 6px; border: 1px solid var(--cobalt-tint); }
  .s4-bottom { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .s4-panel { padding: 20px 24px; border-top: 5px solid var(--cobalt); display: flex; flex-direction: column; }
  .s4-panel.dark-panel { background: var(--ink); border-color: var(--dark-border); border-top: 5px solid var(--cyan); color: var(--white); }
  .s4-prow { display: grid; grid-template-columns: 132px 1fr; gap: 14px; align-items: center; margin-top: 13px; }
  .s4-ptag { text-align: center; padding: 6px 8px; border-radius: 6px; background: var(--cobalt-soft); color: var(--cobalt); font-size: 11.5px; font-weight: 800; }
  .s4-domain-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; flex: 1; }
  .s4-dcard { background: var(--dark-surface); border: 1px solid var(--dark-border); border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; justify-content: center; }
  .s4-dcard h4 { font-size: 12.5px; font-weight: 700; color: var(--cyan-bright); margin-bottom: 5px; }
  .s4-dcard p { font-size: 11px; color: var(--dark-body); line-height: 1.4; }

  /* SLIDE 5 */
  .s5-grid { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 16px; }
  .s5-card { padding: 18px 20px; border-top: 5px solid var(--cobalt); display: flex; flex-direction: column; }
  .s5-diagram { height: 98px; border-radius: 9px; border: 1px solid var(--border); margin: 12px 0; display: flex; align-items: center; justify-content: center; padding: 8px; }
  .s5-best { margin-top: auto; padding: 8px 12px; border-radius: 7px; font-size: 11.5px; font-weight: 700; }
  .s5-banner { background: var(--ink); color: var(--white); border-radius: 10px; padding: 13px 20px; display: flex; align-items: center; gap: 16px; font-size: 13px; }

  /* SLIDE 6 */
  .s6-layout { flex: 1; display: grid; grid-template-columns: 1fr 1.04fr; gap: 24px; min-height: 0; }
  .s6-left { display: flex; flex-direction: column; gap: 18px; }
  .s6-io { padding: 18px 22px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .s6-io-row { display: grid; grid-template-columns: 130px 1fr; gap: 10px; font-size: 12.5px; margin-top: 10px; line-height: 1.45; }
  .s6-showcase { padding: 18px; display: flex; flex-direction: column; }
  .s6-img-frame { flex: 1; background: #EFF4F6; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
  .s6-img-frame img { width: 100%; height: 100%; object-fit: cover; }

  /* SLIDE 7 */
  .s7-layout { flex: 1; display: grid; grid-template-columns: 1.35fr 1fr; gap: 24px; }
  .s7-left { padding: 24px 28px; display: flex; flex-direction: column; }
  .s7-item { display: flex; gap: 16px; align-items: flex-start; margin-top: 22px; }
  .s7-badge { width: 44px; height: 44px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-family: var(--font-en); font-size: 15px; font-weight: 800; }
  .s7-right { background: var(--ink); border: 1px solid var(--dark-border); border-radius: 14px; padding: 22px 24px; color: var(--white); display: flex; flex-direction: column; }
  .s7-layer { background: var(--dark-surface); border: 1px solid var(--dark-border); border-radius: 10px; padding: 14px 16px; margin-top: 14px; border-left: 5px solid var(--cobalt); }

  /* SLIDE 8 */
  .s8-head { display: grid; grid-template-columns: 250px 1.35fr 1fr; background: var(--ink); color: var(--white); border-radius: 9px; padding: 12px 20px; font-size: 13px; font-weight: 700; margin-bottom: 12px; }
  .s8-rows { flex: 1; display: flex; flex-direction: column; gap: 12px; }
  .s8-row { flex: 1; display: grid; grid-template-columns: 250px 1.35fr 1fr; align-items: center; padding: 10px 18px; border-left: 6px solid var(--cobalt); }
  .s8-scene { display: flex; align-items: center; gap: 12px; padding-right: 14px; border-right: 1px solid var(--border); height: 100%; }
  .s8-flow { padding: 0 18px; font-size: 12.5px; color: var(--body); line-height: 1.5; border-right: 1px solid var(--border); height: 100%; display: flex; align-items: center; }
  .s8-val { margin-left: 14px; padding: 10px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; color: var(--ink); line-height: 1.48; }

  /* SLIDE 9 */
  .s9-steps { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 20px; flex: 1; }
  .s9-step { background: var(--dark-surface); border: 1px solid var(--dark-border); border-top: 5px solid var(--cyan-bright); border-radius: 11px; padding: 18px 16px; display: flex; flex-direction: column; transition: transform 0.2s ease, border-color 0.2s ease; }
  .s9-step:hover { transform: translateY(-3px); border-color: var(--cyan-bright); background: var(--dark-surface-2); }
  .s9-deliverables { background: var(--dark-surface-2); border: 1px solid var(--cobalt); border-left: 6px solid var(--cyan-bright); border-radius: 12px; padding: 16px 22px; }
  .s9-files { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 10px; }
  .s9-file { background: var(--dark-bg); border: 1px solid var(--dark-border); border-radius: 8px; padding: 10px 14px; }

  /* SLIDE 10 */
  .s10-layout { flex: 1; display: grid; grid-template-columns: 1.12fr 1fr; gap: 32px; align-items: stretch; }
  .s10-commit { background: var(--dark-surface); border: 1px solid var(--dark-border); border-radius: 11px; padding: 16px 20px; border-left: 6px solid var(--cobalt); }
  .s10-cta { background: var(--dark-surface-2); border: 1.5px solid var(--cobalt); border-radius: 16px; padding: 32px 32px 26px; display: flex; flex-direction: column; }
  .s10-prompt { background: var(--dark-bg); border: 1px solid var(--dark-border); border-radius: 9px; padding: 12px 15px; font-size: 12.5px; color: #E2E8F0; }
  .s10-cmds { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 12px; }
  .s10-cmd-chip { text-align: center; }
  .s10-cmd-chip span { display: block; background: var(--cobalt); color: var(--white); font-family: var(--font-en); font-size: 11.5px; font-weight: 700; padding: 5px 8px; border-radius: 999px; margin-bottom: 5px; }
  .s10-cmd-chip small { font-size: 10.5px; color: var(--dark-muted); }

  /* CONTROLS */
  #progress-bar { position: fixed; top: 0; left: 0; height: 3px; background: linear-gradient(90deg, var(--cobalt), var(--cyan-bright)); z-index: 50; transition: width 0.3s ease; }
  #hud {
    position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%);
    background: rgba(11, 16, 32, 0.88); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 999px;
    padding: 6px 14px; display: flex; align-items: center; gap: 8px;
    color: #E2E8F0; font-family: var(--font-en); font-size: 12px; z-index: 60;
    box-shadow: 0 10px 30px rgba(0,0,0,0.45);
  }
  #hud button { background: transparent; border: none; color: #CBD5E1; cursor: pointer; padding: 5px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; transition: background 0.15s ease, color 0.15s ease; }
  #hud button:hover { background: rgba(255,255,255,0.12); color: #FFFFFF; }
  #hud button.active { background: var(--cobalt); color: #FFFFFF; }
  #hud .sep { width: 1px; height: 16px; background: rgba(255,255,255,0.16); margin: 0 2px; }
  #hud-counter { min-width: 56px; text-align: center; font-weight: 700; color: var(--cyan-bright); }

  #notes-drawer {
    position: fixed; bottom: 68px; left: 50%; transform: translateX(-50%) translateY(16px);
    width: min(820px, 92vw); background: rgba(15, 23, 42, 0.96); backdrop-filter: blur(14px);
    border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 14px; padding: 16px 22px;
    color: #E2E8F0; z-index: 55; opacity: 0; pointer-events: none; transition: all 0.22s ease;
    box-shadow: 0 20px 50px rgba(0,0,0,0.55);
  }
  #notes-drawer.open { opacity: 1; pointer-events: auto; transform: translateX(-50%) translateY(0); }
  #notes-drawer .notes-label { font-family: var(--font-en); font-size: 10px; font-weight: 800; letter-spacing: 0.14em; color: var(--cyan-bright); margin-bottom: 6px; }
  #notes-text { font-size: 13.5px; line-height: 1.65; }

  #overview { position: fixed; inset: 0; background: rgba(3, 7, 18, 0.96); z-index: 80; padding: 36px 48px 90px; overflow-y: auto; display: none; }
  #overview.open { display: block; }
  .ov-header { display: flex; justify-content: space-between; align-items: center; color: #F8FAFC; margin-bottom: 24px; }
  .ov-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
  .ov-item { background: #111A2E; border: 1.5px solid #233354; border-radius: 12px; padding: 16px; cursor: pointer; color: #E2E8F0; transition: border-color 0.2s ease, transform 0.2s ease; }
  .ov-item:hover, .ov-item.current { border-color: var(--cyan-bright); transform: translateY(-2px); }
  .ov-item .ov-num { font-family: var(--font-en); font-size: 11px; font-weight: 800; color: var(--cyan-bright); margin-bottom: 6px; }
  .ov-item .ov-title { font-size: 14px; font-weight: 700; line-height: 1.4; }

  @media print {
    @page { size: 1280px 720px; margin: 0; }
    html, body { width: 1280px; height: auto; overflow: visible; background: white; }
    #hud, #progress-bar, #notes-drawer, #overview { display: none !important; }
    #stage-wrapper { position: static; display: block; background: none; }
    #deck { width: 1280px !important; height: auto !important; transform: none !important; box-shadow: none !important; border-radius: 0 !important; overflow: visible !important; }
    .slide { position: relative !important; opacity: 1 !important; transform: none !important; pointer-events: auto !important; page-break-after: always; break-after: page; }
  }
</style>
</head>
<body>
<div id="progress-bar"></div>

<div id="stage-wrapper">
  <div id="deck">

    <!-- ==================== SLIDE 1 ==================== -->
    <section class="slide dark active" data-title="Antigravity — 次世代エージェンティック AI" data-notes="本日は、Google DeepMind チームによって設計された次世代エージェンティック AI「Antigravity」の能力をご紹介します。単なる対話型AIではなく、計画・実装・検証までを自律的に完遂するパートナーとしての実力を、具体的な仕組みと実例でお伝えします。">
      <div class="s1-layout">
        <div class="s1-left">
          <div class="s1-badge">GOOGLE DEEPMIND &nbsp;•&nbsp; AGENTIC AI</div>
          <h1 class="s1-brand">Antigravity</h1>
          <div class="s1-rule"><span></span><span></span></div>
          <p class="s1-headline">思考から実装・検証までを自律完遂する、<br>次世代エージェンティック AI パートナー</p>
          <p class="s1-lead">コード開発・マルチエージェント並列協調・マルチモーダル認識・リサーチ分析を統合し、アイデアを「検証済みの成果物」へと最速で昇華させます。</p>
          <div class="s1-chips">
            <div class="s1-chip">
              <div class="s1-chip-bar" style="background: var(--cobalt);"></div>
              <div class="s1-chip-k">AUTONOMOUS</div>
              <div class="s1-chip-v">実装〜テストを自律完遂</div>
            </div>
            <div class="s1-chip">
              <div class="s1-chip-bar" style="background: var(--cyan);"></div>
              <div class="s1-chip-k">ORCHESTRATION</div>
              <div class="s1-chip-v">Swarm・Workflow 並列</div>
            </div>
            <div class="s1-chip">
              <div class="s1-chip-bar" style="background: var(--amber-bright);"></div>
              <div class="s1-chip-k">SELF-VERIFIED</div>
              <div class="s1-chip-v">視覚・実行結果の自己検証</div>
            </div>
          </div>
        </div>
        <div class="s1-visual">
          <img src="${HERO_IMG}" alt="Antigravity Geometric Prism Artwork" />
        </div>
      </div>
      <div class="slide-footer">
        <span>CAPABILITY OVERVIEW DECK &nbsp;•&nbsp; 2026</span>
        <span>Designed &amp; Built Autonomously by Antigravity</span>
      </div>
    </section>

    <!-- ==================== SLIDE 2 ==================== -->
    <section class="slide" data-title="「答えるAI」から「現場でやり切るパートナー」へ" data-notes="Antigravityの最大の特長は「答えて終わり」ではない点です。従来型AIでは人間がコードの反映やデバッグを担う必要がありましたが、Antigravityは自律実行・並列スケール・自己検証の3つの柱で成果物の完成まで責任を持ちます。">
      <div class="slide-header">
        <div class="kicker">01 / PARADIGM SHIFT</div>
        <h2 class="slide-title">「答えるAI」から「現場でやり切るパートナー」へ</h2>
        <p class="slide-subtitle">テキストの助言で終わらず、ワークスペースを直接理解・操作し、検証済みの成果物まで到達します。</p>
      </div>
      <div class="slide-body">
        <div class="s2-compare">
          <div class="s2-old">
            <span class="pill" style="background:#E2E8F0; color:#334155; margin-bottom:8px;">従来のチャット型 AI</span>
            <div style="font-size:16px; font-weight:800; color:#334155; margin-bottom:5px;">コード断片や手順を「提案」して終了</div>
            <div style="font-size:12.5px; color:#64748B;">ファイル反映・実行・エラー解消・動作確認は人間が都度コピペして往復</div>
          </div>
          <div class="s2-arrow">→</div>
          <div class="s2-new">
            <span class="pill" style="background:var(--cobalt); color:#FFFFFF; margin-bottom:8px;">Antigravity（自律型エージェント）</span>
            <div style="font-size:16.5px; font-weight:800; color:#FFFFFF; margin-bottom:5px;">環境を把握し、実装から検証まで一気通貫で完遂</div>
            <div style="font-size:12.5px; color:#CBD5E1;">複数ファイルの並列編集・実行・エラー修復・目視検証まで自律遂行</div>
          </div>
        </div>
        <div class="s2-pillars">
          <div class="card s2-pillar" style="border-top-color: var(--cobalt);">
            <div class="s2-pillar-head"><div class="s2-num" style="color:var(--cobalt);">01</div><div class="s2-en">AUTONOMOUS<br>EXECUTION</div></div>
            <div class="s2-ptitle">自律完遂のエンジニアリング</div>
            <ul class="s2-list">
              <li><span class="s2-dot" style="background:var(--cobalt);"></span><span>読解・設計・編集・コマンド実行を単一ループで自走</span></li>
              <li><span class="s2-dot" style="background:var(--cobalt);"></span><span>テストやビルドの失敗を検知し、原因を特定して自動修復</span></li>
              <li><span class="s2-dot" style="background:var(--cobalt);"></span><span>独立タスクを並列バッチ実行し、無駄な往復を排除</span></li>
            </ul>
          </div>
          <div class="card s2-pillar" style="border-top-color: var(--indigo);">
            <div class="s2-pillar-head"><div class="s2-num" style="color:var(--indigo);">02</div><div class="s2-en">PARALLEL<br>ORCHESTRATION</div></div>
            <div class="s2-ptitle">知能の並列スケール</div>
            <ul class="s2-list">
              <li><span class="s2-dot" style="background:var(--indigo);"></span><span>調査や画像制作を専門サブエージェントへ非同期に委譲</span></li>
              <li><span class="s2-dot" style="background:var(--indigo);"></span><span>Swarm により複数ワーカーが独立ブランチで同時開発</span></li>
              <li><span class="s2-dot" style="background:var(--indigo);"></span><span>Python ワークフローで大規模ファイルの並列監査を実行</span></li>
            </ul>
          </div>
          <div class="card s2-pillar" style="border-top-color: var(--teal);">
            <div class="s2-pillar-head"><div class="s2-num" style="color:var(--teal);">03</div><div class="s2-en">VERIFIED &amp;<br>TRUSTWORTHY</div></div>
            <div class="s2-ptitle">視覚検証と透明な信頼性</div>
            <ul class="s2-list">
              <li><span class="s2-dot" style="background:var(--teal);"></span><span>画像・PDF・動画の読解に加え、成果物を画像化して検査</span></li>
              <li><span class="s2-dot" style="background:var(--teal);"></span><span>実行ログ・該当ファイル・行番号リンクに基づく誠実報告</span></li>
              <li><span class="s2-dot" style="background:var(--teal);"></span><span>セキュリティ境界を厳守し、曖昧な仕様は的確に確認</span></li>
            </ul>
          </div>
        </div>
      </div>
      <div class="slide-footer">
        <span>ANTIGRAVITY — AGENTIC AI CAPABILITY OVERVIEW</span>
        <span class="page-num">02 / 10</span>
      </div>
    </section>

    <!-- ==================== SLIDE 3 ==================== -->
    <section class="slide" data-title="6つのコア能力とツールエコシステム" data-notes="全体像として6つのコア能力を備えています。ソフトウェア開発だけでなく、複数エージェントによる並列推進、マルチモーダル制作、最新リサーチ、定期自動化、そしてチーム向けカスタム拡張までを1つの統合基盤で扱えます。">
      <div class="slide-header">
        <div class="kicker">02 / CAPABILITY MAP</div>
        <h2 class="slide-title">開発・協調・制作・自動化を横断する 6つのコア能力</h2>
        <p class="slide-subtitle">目的や難易度に応じて最適なツール群と推論戦略を組み合わせ、エンドツーエンドで課題を解決します。</p>
      </div>
      <div class="slide-body">
        <div class="s3-grid">
          <div class="card s3-card" style="border-left-color:var(--cobalt);">
            <div>
              <div class="s3-top"><div class="s3-num" style="background:var(--cobalt-soft); color:var(--cobalt);">01</div><div class="s3-title">フルサイクル開発</div></div>
              <p class="s3-desc">コード読解・設計・複数ファイル並列編集・コマンド実行・自動デバッグを一気通貫で遂行。</p>
            </div>
            <div class="s3-tags">
              <span class="pill" style="background:var(--cobalt-soft); color:var(--cobalt);">並列編集</span>
              <span class="pill" style="background:var(--cobalt-soft); color:var(--cobalt);">コマンド実行</span>
              <span class="pill" style="background:var(--cobalt-soft); color:var(--cobalt);">自動デバッグ</span>
            </div>
          </div>
          <div class="card s3-card" style="border-left-color:var(--indigo);">
            <div>
              <div class="s3-top"><div class="s3-num" style="background:var(--indigo-soft); color:var(--indigo);">02</div><div class="s3-title">マルチエージェント協調</div></div>
              <p class="s3-desc">専門サブエージェント委譲、Swarm 並列チーム開発、Python ワークフローによる大規模処理を実現。</p>
            </div>
            <div class="s3-tags">
              <span class="pill en" style="background:var(--indigo-soft); color:var(--indigo);">Subagents</span>
              <span class="pill en" style="background:var(--indigo-soft); color:var(--indigo);">Swarm</span>
              <span class="pill en" style="background:var(--indigo-soft); color:var(--indigo);">Workflows</span>
            </div>
          </div>
          <div class="card s3-card" style="border-left-color:var(--coral);">
            <div>
              <div class="s3-top"><div class="s3-num" style="background:var(--coral-soft); color:var(--coral);">03</div><div class="s3-title">マルチモーダル理解＆制作</div></div>
              <p class="s3-desc">画像・PDF・音声・動画を直接解析。画像生成・スライド・図解・UI制作と視覚検証を統合。</p>
            </div>
            <div class="s3-tags">
              <span class="pill" style="background:var(--coral-soft); color:var(--coral);">画像/PDF/動画</span>
              <span class="pill" style="background:var(--coral-soft); color:var(--coral);">画像生成</span>
              <span class="pill" style="background:var(--coral-soft); color:var(--coral);">視覚検査</span>
            </div>
          </div>
          <div class="card s3-card" style="border-left-color:var(--teal);">
            <div>
              <div class="s3-top"><div class="s3-num" style="background:var(--teal-soft); color:var(--teal);">04</div><div class="s3-title">深層リサーチ＆分析</div></div>
              <p class="s3-desc">大規模コードベースの横断探索、Web 検索、データ分析スクリプト、Artifacts 作成を実行。</p>
            </div>
            <div class="s3-tags">
              <span class="pill" style="background:var(--teal-soft); color:var(--teal);">Web検索</span>
              <span class="pill" style="background:var(--teal-soft); color:var(--teal);">データ分析</span>
              <span class="pill en" style="background:var(--teal-soft); color:var(--teal);">Artifacts</span>
            </div>
          </div>
          <div class="card s3-card" style="border-left-color:var(--amber);">
            <div>
              <div class="s3-top"><div class="s3-num" style="background:var(--amber-soft); color:var(--amber);">05</div><div class="s3-title">非同期タスク＆定期自動化</div></div>
              <p class="s3-desc">長時間処理のバックグラウンド管理、通知による自動復帰、タイマー・Cron 定期運用に対応。</p>
            </div>
            <div class="s3-tags">
              <span class="pill" style="background:var(--amber-soft); color:var(--amber);">バックグラウンド</span>
              <span class="pill" style="background:var(--amber-soft); color:var(--amber);">Cron定期実行</span>
              <span class="pill" style="background:var(--amber-soft); color:var(--amber);">通知復帰</span>
            </div>
          </div>
          <div class="card s3-card" style="border-left-color:var(--ink);">
            <div>
              <div class="s3-top"><div class="s3-num" style="background:var(--soft); color:var(--ink);">06</div><div class="s3-title">拡張性＆安全ガバナンス</div></div>
              <p class="s3-desc">Skills・Rules・MCP 連携でチーム固有の業務に最適化。アクセス制御と安全境界を厳守し透明に協働。</p>
            </div>
            <div class="s3-tags">
              <span class="pill en" style="background:var(--soft); color:var(--ink);">Skills / MCP</span>
              <span class="pill" style="background:var(--soft); color:var(--ink);">権限厳守</span>
              <span class="pill" style="background:var(--soft); color:var(--ink);">合意形成</span>
            </div>
          </div>
        </div>
      </div>
      <div class="slide-footer">
        <span>ANTIGRAVITY — AGENTIC AI CAPABILITY OVERVIEW</span>
        <span class="page-num">03 / 10</span>
      </div>
    </section>

    <!-- ==================== SLIDE 4 ==================== -->
    <section class="slide" data-title="自律エンジニアリング・ループ" data-notes="ソフトウェア開発では、要件把握から並列読込、一括実装、ビルド＆テスト検証までを自動で回します。各ステップをクリックすると実際の実行イメージを確認できます。">
      <div class="slide-header">
        <div class="kicker">03 / AUTONOMOUS ENGINEERING</div>
        <h2 class="slide-title">探索・実装・検証・自己修復を高速回転させる開発ループ</h2>
        <p class="slide-subtitle">独立した調査・編集を並列バッチ実行し、コマンド検証とエラー修復を自律ループで回し切ります（各ステップをクリック可能）。</p>
      </div>
      <div class="slide-body">
        <div class="card s4-loop-box">
          <div class="s4-steps" id="s4-steps">
            <div class="s4-step selected" data-trace="ls &amp;&amp; which tools &amp;&amp; git status  →  実行環境・依存・規約を1ターンで把握">
              <div class="s4-snum" style="background:var(--cobalt);">01</div>
              <div class="s4-stitle">要件・環境把握</div>
              <div class="s4-ssub">構成・依存・制約を<br>一括スキャン</div>
            </div>
            <div class="s4-step" data-trace="read_file(A, B, C) [parallel]  →  複数モジュールを同時読込し設計立案">
              <div class="s4-snum" style="background:var(--indigo);">02</div>
              <div class="s4-stitle">設計・並列読込</div>
              <div class="s4-ssub">関連ファイルを同時に<br>読み込み全体像を把握</div>
            </div>
            <div class="s4-step" data-trace="edit_file / write_file [batch]  →  整合性を保ち全変更を一括適用">
              <div class="s4-snum" style="background:var(--cobalt);">03</div>
              <div class="s4-stitle">一括実装・編集</div>
              <div class="s4-ssub">整合性を保ちながら<br>複数ファイルを同時更新</div>
            </div>
            <div class="s4-step" data-trace="build &amp;&amp; test &amp;&amp; lint  →  失敗時は全エラー要因を特定し Step 03 へ自律復帰">
              <div class="s4-snum" style="background:var(--teal);">04</div>
              <div class="s4-stitle">自動ビルド＆検証</div>
              <div class="s4-ssub">テスト・Lint・差分を<br>チェーンコマンドで確認</div>
            </div>
            <div class="s4-step final" data-trace="summary + file://links + verification log  →  検証済み成果物を透明に報告">
              <div class="s4-snum" style="background:var(--cyan);">05</div>
              <div class="s4-stitle">検証済み納品</div>
              <div class="s4-ssub">根拠ファイルリンク付き<br>で簡潔・誠実に報告</div>
            </div>
          </div>
          <div class="s4-feedback">
            <span>↺ &nbsp;自律エラー修復ループ：失敗時は全エラー要因を一括修正して再検証</span>
            <span class="s4-trace" id="s4-trace-text">ls &amp;&amp; which tools &amp;&amp; git status  →  実行環境・依存・規約を1ターンで把握</span>
          </div>
        </div>

        <div class="s4-bottom">
          <div class="card s4-panel">
            <div style="font-size:16.5px; font-weight:800; color:var(--ink);">スピードと精度を両立する実装スタイル</div>
            <div class="s4-prow"><div class="s4-ptag">並列バッチ処理</div><div style="font-size:12.5px; color:var(--body); line-height:1.45;">独立した検索・ファイル読込・編集を1ターン内で同時実行し待ち時間を圧縮</div></div>
            <div class="s4-prow"><div class="s4-ptag">一括コマンド検証</div><div style="font-size:12.5px; color:var(--body); line-height:1.45;">ビルド・単体テスト・差分確認を連結実行し、手戻りのない確認を実現</div></div>
            <div class="s4-prow"><div class="s4-ptag">最小差分・高保守性</div><div style="font-size:12.5px; color:var(--body); line-height:1.45;">既存アーキテクチャと規約を尊重し、保守性の高い安全なコードを実装</div></div>
          </div>
          <div class="card s4-panel dark-panel">
            <div style="font-size:16.5px; font-weight:800; color:var(--white);">実戦での主要エンジニアリング対応領域</div>
            <div class="s4-domain-grid">
              <div class="s4-dcard"><h4>Web / App フルスタック開発</h4><p>UI・API・DB・状態管理まで一貫構築</p></div>
              <div class="s4-dcard"><h4>難解バグの根本原因調査</h4><p>ログ解析・再現テスト・ピンポイント修正</p></div>
              <div class="s4-dcard"><h4>大規模リファクタリング</h4><p>依存の全件追跡と安全・段階的な置換</p></div>
              <div class="s4-dcard"><h4>自動化スクリプト・開発基盤</h4><p>CLI・データ変換・検証基盤を整備</p></div>
            </div>
          </div>
        </div>
      </div>
      <div class="slide-footer">
        <span>ANTIGRAVITY — AGENTIC AI CAPABILITY OVERVIEW</span>
        <span class="page-num">04 / 10</span>
      </div>
    </section>

    <!-- ==================== SLIDE 5 ==================== -->
    <section class="slide" data-title="知能を並列スケールする 3層アーキテクチャ" data-notes="複雑な案件でも1人で抱え込まず、3つの階層で並列スケールできます。軽い委譲はSubagents、チーム並行開発はSwarm、数十件規模の機械的なファンアウトや監査にはPython Workflowsを使い分けます。">
      <div class="slide-header">
        <div class="kicker">04 / MULTI-AGENT ORCHESTRATION</div>
        <h2 class="slide-title">課題の規模に応じて知能を並列スケールする 3層アーキテクチャ</h2>
        <p class="slide-subtitle">単一エージェントの限界を超え、専門委譲・自律チーム開発・コード制御ワークフローを使い分けます。</p>
      </div>
      <div class="slide-body">
        <div class="s5-grid">
          <div class="card s5-card" style="border-top-color:var(--cobalt);">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
              <span class="pill en" style="background:var(--cobalt-soft); color:var(--cobalt);">TIER 01</span>
              <span style="font-family:var(--font-en); font-size:18px; font-weight:800;">Subagents</span>
            </div>
            <div style="font-size:13px; font-weight:700; color:var(--cobalt);">専門タスクの非同期委譲</div>
            <div class="s5-diagram" style="background:var(--cobalt-soft);">
              <svg viewBox="0 0 320 84" width="100%" height="100%">
                <path d="M160 30 V42 M56 42 H264 M56 42 V54 M160 42 V54 M264 42 V54" fill="none" stroke="#2563EB" stroke-width="1.6"/>
                <rect x="105" y="6" width="110" height="24" rx="12" fill="#2563EB"/>
                <text x="160" y="22" text-anchor="middle" fill="#FFF" font-family="Avenir Next, sans-serif" font-size="10.5" font-weight="700">Main Agent</text>
                <rect x="10" y="54" width="92" height="24" rx="12" fill="#FFF" stroke="#2563EB" stroke-width="1.2"/>
                <text x="56" y="70" text-anchor="middle" fill="#0F172A" font-family="Avenir Next, sans-serif" font-size="10" font-weight="700">Research</text>
                <rect x="114" y="54" width="92" height="24" rx="12" fill="#FFF" stroke="#2563EB" stroke-width="1.2"/>
                <text x="160" y="70" text-anchor="middle" fill="#0F172A" font-family="Avenir Next, sans-serif" font-size="10" font-weight="700">Image Gen</text>
                <rect x="218" y="54" width="92" height="24" rx="12" fill="#FFF" stroke="#2563EB" stroke-width="1.2"/>
                <text x="264" y="70" text-anchor="middle" fill="#0F172A" font-family="Avenir Next, sans-serif" font-size="10" font-weight="700">Custom</text>
              </svg>
            </div>
            <p style="font-size:12.5px; color:var(--body); line-height:1.5; margin-bottom:10px;">独立したコンテキストで専門エージェントを起動。メイン対話を整理された状態に保ちつつ並列処理。</p>
            <ul style="list-style:none; font-size:12px; color:var(--ink); display:flex; flex-direction:column; gap:6px; margin-bottom:12px;">
              <li>▸ &nbsp;<strong>research</strong>：大規模調査・仕様読解に特化</li>
              <li>▸ &nbsp;<strong>image-generator</strong>：専用ビジュアル素材生成</li>
              <li>▸ &nbsp;<strong>カスタム定義</strong>：独自ロールをその場で構築</li>
            </ul>
            <div class="s5-best" style="background:var(--cobalt-soft); color:var(--cobalt);">最適な用途：広範な調査・クリエイティブ制作</div>
          </div>

          <div class="card s5-card" style="border-top-color:var(--indigo);">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
              <span class="pill en" style="background:var(--indigo-soft); color:var(--indigo);">TIER 02</span>
              <span style="font-family:var(--font-en); font-size:18px; font-weight:800;">Swarm</span>
            </div>
            <div style="font-size:13px; font-weight:700; color:var(--indigo);">自律チームによる並列開発</div>
            <div class="s5-diagram" style="background:var(--indigo-soft);">
              <svg viewBox="0 0 320 84" width="100%" height="100%">
                <line x1="56" y1="30" x2="56" y2="56" stroke="#4F46E5" stroke-width="1.6"/>
                <line x1="160" y1="30" x2="160" y2="56" stroke="#4F46E5" stroke-width="1.6"/>
                <line x1="264" y1="30" x2="264" y2="56" stroke="#4F46E5" stroke-width="1.6"/>
                <rect x="44" y="6" width="232" height="24" rx="12" fill="#4F46E5"/>
                <text x="160" y="22" text-anchor="middle" fill="#FFF" font-family="Avenir Next, sans-serif" font-size="10.5" font-weight="700">Shared Message Board</text>
                <rect x="8" y="54" width="96" height="24" rx="12" fill="#FFF" stroke="#4F46E5" stroke-width="1.2"/>
                <text x="56" y="70" text-anchor="middle" fill="#0F172A" font-family="Avenir Next, sans-serif" font-size="9.5" font-weight="700">Dev A (share)</text>
                <rect x="112" y="54" width="96" height="24" rx="12" fill="#FFF" stroke="#4F46E5" stroke-width="1.2"/>
                <text x="160" y="70" text-anchor="middle" fill="#0F172A" font-family="Avenir Next, sans-serif" font-size="9.5" font-weight="700">Dev B (share)</text>
                <rect x="216" y="54" width="96" height="24" rx="12" fill="#FFF" stroke="#4F46E5" stroke-width="1.2"/>
                <text x="264" y="70" text-anchor="middle" fill="#0F172A" font-family="Avenir Next, sans-serif" font-size="9.5" font-weight="700">Verifier</text>
              </svg>
            </div>
            <p style="font-size:12.5px; color:var(--body); line-height:1.5; margin-bottom:10px;">共有メッセージボード上で複数ワーカーが自律連携。独立ワークスペースで競合ゼロの同時開発。</p>
            <ul style="list-style:none; font-size:12px; color:var(--ink); display:flex; flex-direction:column; gap:6px; margin-bottom:12px;">
              <li>▸ &nbsp;<strong>share / branch</strong> による安全な分離作業空間</li>
              <li>▸ &nbsp;実装・テスト・レビューの役割分担＆相互確認</li>
              <li>▸ &nbsp;進捗に応じた動的メンバー追加と結果統合</li>
            </ul>
            <div class="s5-best" style="background:var(--indigo-soft); color:var(--indigo);">最適な用途：大規模機能開発・多役割プロジェクト</div>
          </div>

          <div class="card s5-card" style="border-top-color:var(--teal);">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
              <span class="pill en" style="background:var(--teal-soft); color:var(--teal);">TIER 03</span>
              <span style="font-family:var(--font-en); font-size:18px; font-weight:800;">Python Workflows</span>
            </div>
            <div style="font-size:13px; font-weight:700; color:var(--teal);">コード制御の大規模並列処理</div>
            <div class="s5-diagram" style="background:var(--teal-soft);">
              <svg viewBox="0 0 320 84" width="100%" height="100%">
                <line x1="78" y1="42" x2="112" y2="18" stroke="#0D9488" stroke-width="1.5"/>
                <line x1="78" y1="42" x2="112" y2="42" stroke="#0D9488" stroke-width="1.5"/>
                <line x1="78" y1="42" x2="112" y2="66" stroke="#0D9488" stroke-width="1.5"/>
                <line x1="204" y1="18" x2="234" y2="42" stroke="#0D9488" stroke-width="1.5"/>
                <line x1="204" y1="42" x2="234" y2="42" stroke="#0D9488" stroke-width="1.5"/>
                <line x1="204" y1="66" x2="234" y2="42" stroke="#0D9488" stroke-width="1.5"/>
                <rect x="8" y="28" width="72" height="28" rx="14" fill="#0D9488"/>
                <text x="44" y="46" text-anchor="middle" fill="#FFF" font-family="Avenir Next, sans-serif" font-size="10.5" font-weight="700">Python</text>
                <rect x="112" y="8" width="92" height="20" rx="6" fill="#FFF" stroke="#0D9488" stroke-width="1.2"/>
                <text x="158" y="21.5" text-anchor="middle" fill="#0F172A" font-family="Avenir Next, sans-serif" font-size="9.5" font-weight="700">Worker #1..N</text>
                <rect x="112" y="32" width="92" height="20" rx="6" fill="#FFF" stroke="#0D9488" stroke-width="1.2"/>
                <text x="158" y="45.5" text-anchor="middle" fill="#0F172A" font-family="Avenir Next, sans-serif" font-size="9.5" font-weight="700">Pipeline Stage</text>
                <rect x="112" y="56" width="92" height="20" rx="6" fill="#FFF" stroke="#0D9488" stroke-width="1.2"/>
                <text x="158" y="69.5" text-anchor="middle" fill="#0F172A" font-family="Avenir Next, sans-serif" font-size="9.5" font-weight="700">Cross-Check</text>
                <rect x="234" y="28" width="78" height="28" rx="14" fill="#0F172A"/>
                <text x="273" y="46" text-anchor="middle" fill="#FFF" font-family="Avenir Next, sans-serif" font-size="10" font-weight="700">Aggregate</text>
              </svg>
            </div>
            <p style="font-size:12.5px; color:var(--body); line-height:1.5; margin-bottom:10px;">Python スクリプト (run_workflow) で多数のエージェントとツールを構造化オーケストレーション。</p>
            <ul style="list-style:none; font-size:12px; color:var(--ink); display:flex; flex-direction:column; gap:6px; margin-bottom:12px;">
              <li>▸ &nbsp;<strong>parallel</strong>：数十ファイル・複数観点へ一斉展開</li>
              <li>▸ &nbsp;<strong>pipeline</strong>：前段結果を次段へ自動連携</li>
              <li>▸ &nbsp;自動フィルタリング・クロスチェック・最終集計</li>
            </ul>
            <div class="s5-best" style="background:var(--teal-soft); color:var(--teal);">最適な用途：全社コード監査・多角的バッチ分析</div>
          </div>
        </div>
        <div class="s5-banner">
          <span class="pill en" style="background:var(--cobalt); color:#FFF;">REACTIVE ARCHITECTURE</span>
          <span>イベント駆動の自動復帰設計：完了通知で即座に再開するためポーリング待機ゼロ。複数並列ジョブを最短レイテンシで統合します。</span>
        </div>
      </div>
      <div class="slide-footer">
        <span>ANTIGRAVITY — AGENTIC AI CAPABILITY OVERVIEW</span>
        <span class="page-num">05 / 10</span>
      </div>
    </section>

    <!-- ==================== SLIDE 6 ==================== -->
    <section class="slide" data-title="マルチモーダル理解 × クリエイティブ制作" data-notes="マルチモーダル能力は「読む」だけでなく「創って自ら見る」点に価値があります。スライドやWeb UIを作ったあとに画像化して自分の目でレイアウト崩れをチェックし修正できるため、完成度が格段に高まります。">
      <div class="slide-header">
        <div class="kicker">05 / MULTIMODAL &amp; CREATIVE SYNTHESIS</div>
        <h2 class="slide-title">あらゆるメディアを「読む力」と、ビジュアルを「創り検証する力」</h2>
        <p class="slide-subtitle">テキストの枠を超え、画像・PDF・動画・音声の直接理解から、資料・UI・挿絵の一貫制作まで対応します。</p>
      </div>
      <div class="slide-body">
        <div class="s6-layout">
          <div class="s6-left">
            <div class="card s6-io" style="border-left: 6px solid var(--teal);">
              <span class="pill en" style="background:var(--teal-soft); color:var(--teal); align-self:flex-start; margin-bottom:8px;">INPUT — DIRECT PERCEPTION</span>
              <div style="font-size:16.5px; font-weight:800; margin-bottom:6px;">画像・文書・動画・音声を直接理解</div>
              <div class="s6-io-row"><strong style="color:var(--teal);">● 画像・UI画面</strong><span>スクリーンショットから余白崩れ・配色・情報設計を即座に診断</span></div>
              <div class="s6-io-row"><strong style="color:var(--teal);">● PDF・設計書</strong><span>図表を含む長文仕様書や論文を直接読み込み構造化</span></div>
              <div class="s6-io-row"><strong style="color:var(--teal);">● 音声・動画</strong><span>操作録画やデモ動画・音声ファイルから事実と課題を抽出</span></div>
            </div>
            <div class="card s6-io" style="border-left: 6px solid var(--coral);">
              <span class="pill en" style="background:var(--coral-soft); color:var(--coral); align-self:flex-start; margin-bottom:8px;">OUTPUT — VISUAL CREATION &amp; QA</span>
              <div style="font-size:16.5px; font-weight:800; margin-bottom:6px;">コード × ビジュアルの統合制作と自己検査</div>
              <div class="s6-io-row"><strong style="color:var(--coral);">● 専用画像生成</strong><span>image-generator 連携で資料・UI用の専用画像を制作</span></div>
              <div class="s6-io-row"><strong style="color:var(--coral);">● 多彩な表現媒体</strong><span>PPTX・HTML・Mermaid図・Artifacts を一貫生成</span></div>
              <div class="s6-io-row"><strong style="color:var(--coral);">● 視覚的自己検証</strong><span>成果物を画像化して自ら目視し、崩れを徹底修正</span></div>
            </div>
          </div>
          <div class="card s6-showcase">
            <div class="s6-img-frame"><img src="${MULTI_IMG}" alt="Multimodal Prism Editorial Render" /></div>
            <span class="pill en" style="background:var(--cobalt-soft); color:var(--cobalt); align-self:flex-start; margin-bottom:8px;">LIVE VISUAL ARTIFACT</span>
            <div style="font-size:15.5px; font-weight:800; color:var(--ink); margin-bottom:6px;">デザイン設計・画像生成・レイアウト統合を一貫実行</div>
            <p style="font-size:12.5px; color:var(--muted); line-height:1.55;">上の3Dアートワークも、本資料のカラー設計に合わせてブリーフを作成し、サブエージェントで生成・最適比率で自動配置しています。</p>
          </div>
        </div>
      </div>
      <div class="slide-footer">
        <span>ANTIGRAVITY — AGENTIC AI CAPABILITY OVERVIEW</span>
        <span class="page-num">06 / 10</span>
      </div>
    </section>

    <!-- ==================== SLIDE 7 ==================== -->
    <section class="slide" data-title="リサーチ・意思決定支援 & 拡張基盤" data-notes="リサーチと意思決定支援では、ファイル・行番号付きの根拠を必ず残すため検証が容易です。また右側の拡張スタックにより、SkillsやMCP・スケジュール実行を組み合わせてチーム専属のエージェントへ育てられます。">
      <div class="slide-header">
        <div class="kicker">06 / RESEARCH &amp; EXTENSIBILITY</div>
        <h2 class="slide-title">根拠ある意思決定支援と、現場に合わせて進化する拡張基盤</h2>
        <p class="slide-subtitle">コード・Web・データを横断した高速リサーチに加え、チーム固有の知見や外部ツールと自在に連携します。</p>
      </div>
      <div class="slide-body">
        <div class="s7-layout">
          <div class="card s7-left">
            <div style="font-size:17.5px; font-weight:800; padding-bottom:12px; border-bottom:1px solid var(--border);">リサーチから意思決定ドキュメントまで一気通貫</div>
            <div class="s7-item">
              <div class="s7-badge" style="background:var(--cobalt-soft); color:var(--cobalt);">01</div>
              <div>
                <div style="font-size:15px; font-weight:800; margin-bottom:5px;">既存コード × 最新 Web 情報の統合調査</div>
                <p style="font-size:13px; color:var(--body); line-height:1.55;">リポジトリ内の実装詳細を正確に読み解きつつ、Web 検索で最新ライブラリ仕様や設計ベストプラクティスを即時キャッチアップ。</p>
              </div>
            </div>
            <div class="s7-item">
              <div class="s7-badge" style="background:var(--teal-soft); color:var(--teal);">02</div>
              <div>
                <div style="font-size:15px; font-weight:800; margin-bottom:5px;">スクリプト駆動の実データ分析＆構造化レポート</div>
                <p style="font-size:13px; color:var(--body); line-height:1.55;">Python / Node 等で検証スクリプトを実行し一次データを集計。Mermaid 図解や表を組み込んだ見やすい Artifacts レポートを出力。</p>
              </div>
            </div>
            <div class="s7-item">
              <div class="s7-badge" style="background:var(--indigo-soft); color:var(--indigo);">03</div>
              <div>
                <div style="font-size:15px; font-weight:800; margin-bottom:5px;">ファイル・行番号リンク付きの追跡可能な根拠提示</div>
                <p style="font-size:13px; color:var(--body); line-height:1.55;">すべての発見事項・変更箇所にクリック可能な参照リンクを明記。レビュー担当者が数秒で裏取りできる高い透明性を担保。</p>
              </div>
            </div>
          </div>

          <div class="s7-right">
            <span class="pill en" style="background:var(--dark-surface-2); color:var(--cyan-bright); border:1px solid var(--dark-border); align-self:flex-start; margin-bottom:10px;">EXTENSIBILITY ARCHITECTURE</span>
            <div style="font-size:17px; font-weight:800; margin-bottom:6px;">組織・個人に最適化する 3つの拡張層</div>
            <div class="s7-layer" style="border-left-color:var(--cobalt);">
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;">
                <span style="font-family:var(--font-en); font-size:10px; font-weight:800; color:var(--cobalt);">LAYER 01</span>
                <strong style="font-family:var(--font-en); font-size:14.5px;">Skills &amp; Rules</strong>
              </div>
              <p style="font-size:12px; color:var(--dark-body); line-height:1.5;">業務ノウハウ・手順書・デザイン規約をスキルとして定義。タスク内容に応じて自動ロードし再現性を確保。</p>
            </div>
            <div class="s7-layer" style="border-left-color:var(--cyan);">
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;">
                <span style="font-family:var(--font-en); font-size:10px; font-weight:800; color:var(--cyan);">LAYER 02</span>
                <strong style="font-family:var(--font-en); font-size:14.5px;">MCP Servers &amp; Hooks</strong>
              </div>
              <p style="font-size:12px; color:var(--dark-body); line-height:1.5;">外部サービス・社内ツール・イベントフックを安全に統合し、開発ワークフロー全体へ能力を拡張。</p>
            </div>
            <div class="s7-layer" style="border-left-color:var(--amber-bright);">
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;">
                <span style="font-family:var(--font-en); font-size:10px; font-weight:800; color:var(--amber-bright);">LAYER 03</span>
                <strong style="font-family:var(--font-en); font-size:14.5px;">Schedule &amp; Daemons</strong>
              </div>
              <p style="font-size:12px; color:var(--dark-body); line-height:1.5;">Cron 定期実行・ワンショットタイマー・常駐プロセス管理により、監視や定期レポートを自律運用。</p>
            </div>
          </div>
        </div>
      </div>
      <div class="slide-footer">
        <span>ANTIGRAVITY — AGENTIC AI CAPABILITY OVERVIEW</span>
        <span class="page-num">07 / 10</span>
      </div>
    </section>

    <!-- ==================== SLIDE 8 ==================== -->
    <section class="slide" data-title="実務シーン別の具体的な活用シナリオ" data-notes="実務での代表的な4つのシナリオをまとめました。ゼロイチの試作から大規模レガシーコード改修、提案資料作成、継続的な品質監査まで、いずれも「調査→実行→検証」をまとめて任せられるのがポイントです。">
      <div class="slide-header">
        <div class="kicker">07 / REAL-WORLD SCENARIOS</div>
        <h2 class="slide-title">構想から運用まで — 実務シーン別の具体的な活用シナリオ</h2>
        <p class="slide-subtitle">単なる部分補助にとどまらず、開発・調査・資料化・監査のボトルネックそのものを解消します。</p>
      </div>
      <div class="slide-body">
        <div class="s8-head">
          <div>活用シーン</div>
          <div style="padding-left:18px;">Antigravity の自律ワークフロー</div>
          <div style="padding-left:14px;">現場にもたらす価値</div>
        </div>
        <div class="s8-rows">
          <div class="card s8-row" style="border-left-color:var(--cobalt);">
            <div class="s8-scene">
              <div class="s3-num" style="background:var(--cobalt-soft); color:var(--cobalt); height:38px; width:38px; flex-shrink:0;">01</div>
              <div style="font-size:14px; font-weight:800; line-height:1.35;">新規プロダクト試作<br>(0 → 1 開発)</div>
            </div>
            <div class="s8-flow">要件整理 → アーキテクチャ設計 → UI・API実装 → 必要画像の生成 → ローカル起動と画面・動作確認を一気通貫で実施</div>
            <div class="s8-val" style="background:var(--cobalt-soft);">アイデアを最短時間で「触って検証できるプロトタイプ」に変換し意思決定を加速</div>
          </div>
          <div class="card s8-row" style="border-left-color:var(--indigo);">
            <div class="s8-scene">
              <div class="s3-num" style="background:var(--indigo-soft); color:var(--indigo); height:38px; width:38px; flex-shrink:0;">02</div>
              <div style="font-size:14px; font-weight:800; line-height:1.35;">大規模コード調査<br>&amp; 安全な改修</div>
            </div>
            <div class="s8-flow">依存関係・影響範囲を並列探索 → 設計意図を把握 → 複数ファイルを整合性を保って同時修正 → ビルド＆回帰テストで検証</div>
            <div class="s8-val" style="background:var(--indigo-soft);">属人化した既存コードの調査負荷を大幅に削減し、デグレを防ぎながら改修を推進</div>
          </div>
          <div class="card s8-row" style="border-left-color:var(--teal);">
            <div class="s8-scene">
              <div class="s3-num" style="background:var(--teal-soft); color:var(--teal); height:38px; width:38px; flex-shrink:0;">03</div>
              <div style="font-size:14px; font-weight:800; line-height:1.35;">リサーチ・データ分析<br>&amp; 提案資料制作</div>
            </div>
            <div class="s8-flow">Web最新情報・社内資料を収集 → Python等で集計・検証 → ストーリー設計 → PPTX / HTML 資料生成と全ページ視覚検査</div>
            <div class="s8-val" style="background:var(--teal-soft);">調査から経営・顧客向けの完成スライドまでワンストップで高品質に出力</div>
          </div>
          <div class="card s8-row" style="border-left-color:var(--coral);">
            <div class="s8-scene">
              <div class="s3-num" style="background:var(--coral-soft); color:var(--coral); height:38px; width:38px; flex-shrink:0;">04</div>
              <div style="font-size:14px; font-weight:800; line-height:1.35;">品質監査・レビュー<br>&amp; 定常タスク自動化</div>
            </div>
            <div class="s8-flow">Python Workflow や Swarm で全モジュールを多角的に並列レビュー → 改善PR案作成 → Cron による定期チェックを自動化</div>
            <div class="s8-val" style="background:var(--coral-soft);">見落としやすい品質チェックを仕組み化し、チームの生産性と健全性を継続維持</div>
          </div>
        </div>
      </div>
      <div class="slide-footer">
        <span>ANTIGRAVITY — AGENTIC AI CAPABILITY OVERVIEW</span>
        <span class="page-num">08 / 10</span>
      </div>
    </section>

    <!-- ==================== SLIDE 9 ==================== -->
    <section class="slide dark" data-title="この資料そのものが「能力の証明」" data-notes="能力を言葉で語るだけでなく、このスライド資料自体が実証結果です。環境調査・構成設計・画像サブエージェント並列生成・PPTXとHTMLのコード構築・全ページ目視検証までをすべて単一セッションで自律実行しました。">
      <div class="slide-header">
        <div class="kicker">08 / PROOF BY EXECUTION</div>
        <h2 class="slide-title">語るだけでなく、今この資料そのもので実証する</h2>
        <p class="slide-subtitle">「能力をアピールするスライドを作って」という一文から、以下の 5 工程をすべて自律実行して本資料を生成・検証しました。</p>
      </div>
      <div class="slide-body">
        <div class="s9-steps">
          <div class="s9-step" style="border-top-color:var(--cyan-bright);">
            <div style="font-family:var(--font-en); font-size:11px; font-weight:800; letter-spacing:0.12em; color:var(--cyan-bright); margin-bottom:8px;">STEP 01</div>
            <div style="font-size:16px; font-weight:800; margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid var(--dark-border);">環境を自律調査</div>
            <p style="font-size:12.5px; color:var(--dark-body); line-height:1.6;">OS・日本語フォント・pptxgenjs・Chrome・Keynote 等の利用可能ツールを自動検出し最適な制作環境を確立。</p>
          </div>
          <div class="s9-step" style="border-top-color:var(--cobalt);">
            <div style="font-family:var(--font-en); font-size:11px; font-weight:800; letter-spacing:0.12em; color:#60A5FA; margin-bottom:8px;">STEP 02</div>
            <div style="font-size:16px; font-weight:800; margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid var(--dark-border);">構成＆デザイン設計</div>
            <p style="font-size:12.5px; color:var(--dark-body); line-height:1.6;">全10枚のストーリー・配色トークン・毎スライド異なる視覚レイアウトを12カラムグリッド単位で設計。</p>
          </div>
          <div class="s9-step" style="border-top-color:#818CF8;">
            <div style="font-family:var(--font-en); font-size:11px; font-weight:800; letter-spacing:0.12em; color:#818CF8; margin-bottom:8px;">STEP 03</div>
            <div style="font-size:16px; font-weight:800; margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid var(--dark-border);">専用ビジュアル生成</div>
            <p style="font-size:12.5px; color:var(--dark-body); line-height:1.6;">image-generator サブエージェントを 2 体並列起動し、本資料専用の 3D 挿絵を同時制作・エッジ最適化。</p>
          </div>
          <div class="s9-step" style="border-top-color:#FB923C;">
            <div style="font-family:var(--font-en); font-size:11px; font-weight:800; letter-spacing:0.12em; color:#FB923C; margin-bottom:8px;">STEP 04</div>
            <div style="font-size:16px; font-weight:800; margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid var(--dark-border);">複数媒体を同時構築</div>
            <p style="font-size:12.5px; color:var(--dark-body); line-height:1.6;">ネイティブ編集可能な .pptx と単一ファイル完結のインタラクティブ .html をコードから精密に同時生成。</p>
          </div>
          <div class="s9-step" style="border-top-color:#2DD4BF;">
            <div style="font-family:var(--font-en); font-size:11px; font-weight:800; letter-spacing:0.12em; color:#2DD4BF; margin-bottom:8px;">STEP 05</div>
            <div style="font-size:16px; font-weight:800; margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid var(--dark-border);">全スライド視覚検証</div>
            <p style="font-size:12.5px; color:var(--dark-body); line-height:1.6;">PDF→PNG 変換した全10枚を自ら画像として目視検査し、影崩れや図解ライン・文字切れを徹底修正。</p>
          </div>
        </div>
        <div class="s9-deliverables">
          <div style="font-family:var(--font-en); font-size:10.5px; font-weight:800; letter-spacing:0.14em; color:var(--cyan-bright);">DELIVERABLES GENERATED IN THIS SESSION</div>
          <div class="s9-files">
            <div class="s9-file">
              <div style="display:flex; align-items:center; gap:8px; font-family:var(--font-en); font-size:13px; font-weight:700; color:#FFF; margin-bottom:3px;"><span style="width:8px; height:8px; border-radius:50%; background:var(--cobalt);"></span>antigravity_capabilities.pptx</div>
              <div style="font-size:11px; color:var(--dark-muted);">ネイティブ編集可能・全ページ発表者ノート付き</div>
            </div>
            <div class="s9-file">
              <div style="display:flex; align-items:center; gap:8px; font-family:var(--font-en); font-size:13px; font-weight:700; color:#FFF; margin-bottom:3px;"><span style="width:8px; height:8px; border-radius:50%; background:#2DD4BF;"></span>antigravity_capabilities.pdf</div>
              <div style="font-size:11px; color:var(--dark-muted);">配布・レビュー用の高精細 PDF エクスポート</div>
            </div>
            <div class="s9-file">
              <div style="display:flex; align-items:center; gap:8px; font-family:var(--font-en); font-size:13px; font-weight:700; color:#FFF; margin-bottom:3px;"><span style="width:8px; height:8px; border-radius:50%; background:#FB923C;"></span>antigravity_capabilities.html</div>
              <div style="font-size:11px; color:var(--dark-muted);">キーボード操作・一覧・ノート切替対応 Web 版</div>
            </div>
          </div>
        </div>
      </div>
      <div class="slide-footer">
        <span>ANTIGRAVITY — AGENTIC AI CAPABILITY OVERVIEW</span>
        <span class="page-num">09 / 10</span>
      </div>
    </section>

    <!-- ==================== SLIDE 10 ==================== -->
    <section class="slide dark" data-title="信頼と協働 — 次のプロジェクトへ" data-notes="最後に、Antigravityが最も大切にしているのは「安心して任せられる透明な協働」です。セキュリティ境界の厳守・的確な合意形成・一次情報に基づく報告をお約束します。ぜひ次のプロジェクトからご一緒させてください。">
      <div class="s10-layout" style="padding-top: 8px;">
        <div style="display:flex; flex-direction:column;">
          <div class="kicker">09 / TRUST &amp; COLLABORATION</div>
          <h2 style="font-size:32px; font-weight:800; line-height:1.28; margin-bottom:24px;">安心して任せられる、<br>透明で誠実な協働スタイル</h2>
          <div style="display:flex; flex-direction:column; gap:14px; flex:1;">
            <div class="s10-commit" style="border-left-color:var(--cobalt);">
              <div style="font-size:16px; font-weight:800; margin-bottom:6px;">安全性と境界の厳守</div>
              <p style="font-size:13px; color:var(--dark-body); line-height:1.55;">権限チェック・アクセス制御・セキュリティ境界を一切迂回せず、正規かつ安全な手順のみで作業を遂行します。</p>
            </div>
            <div class="s10-commit" style="border-left-color:var(--cyan-bright);">
              <div style="font-size:16px; font-weight:800; margin-bottom:6px;">推測せず、的確な対話で合意形成</div>
              <p style="font-size:13px; color:var(--dark-body); line-height:1.55;">重要な仕様分岐や設計判断は勝手に決めつけず、論点を整理した選択肢で素早く確認してから前へ進めます。</p>
            </div>
            <div class="s10-commit" style="border-left-color:#2DD4BF;">
              <div style="font-size:16px; font-weight:800; margin-bottom:6px;">検証済みの一次情報に基づく誠実な報告</div>
              <p style="font-size:13px; color:var(--dark-body); line-height:1.55;">過度な誇張や未確認の推測を避け、実際の実行結果・テスト結果・参照ファイルリンクを明示して共有します。</p>
            </div>
          </div>
        </div>

        <div class="s10-cta">
          <div style="width:76px; height:5px; border-radius:3px; background:var(--cyan-bright); margin-bottom:20px;"></div>
          <h3 style="font-size:27px; font-weight:800; line-height:1.34; margin-bottom:14px;">次のプロジェクトを、<br>一緒に形にしましょう。</h3>
          <p style="font-size:13.5px; color:var(--dark-muted); line-height:1.6; margin-bottom:22px;">曖昧な構想段階でも、複雑な既存システムでも。<br>まずは解決したい課題をそのまま伝えてください。</p>

          <div style="font-family:var(--font-en); font-size:10.5px; font-weight:800; letter-spacing:0.14em; color:var(--cyan-bright); margin-bottom:10px;">TRY ASKING</div>
          <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:22px;">
            <div class="s10-prompt">「既存リポジトリを調査してボトルネックと改善案をまとめて」</div>
            <div class="s10-prompt">「このアイデアから動く Web アプリを設計・実装・検証して」</div>
            <div class="s10-prompt">「最新データを調べて提案スライドと分析レポートを作って」</div>
          </div>

          <div style="margin-top:auto; padding-top:14px; border-top:1px solid var(--dark-border);">
            <div style="font-family:var(--font-en); font-size:10px; font-weight:800; letter-spacing:0.14em; color:var(--dark-muted);">POWER WORKFLOW SHORTCUTS</div>
            <div class="s10-cmds">
              <div class="s10-cmd-chip"><span>/plan</span><small>設計立案</small></div>
              <div class="s10-cmd-chip"><span>/teamwork</span><small>並列開発</small></div>
              <div class="s10-cmd-chip"><span>/boost</span><small>深層検証</small></div>
              <div class="s10-cmd-chip"><span>/schedule</span><small>定期実行</small></div>
            </div>
          </div>
        </div>
      </div>
      <div class="slide-footer">
        <span>ANTIGRAVITY — AGENTIC AI CAPABILITY OVERVIEW</span>
        <span class="page-num">10 / 10</span>
      </div>
    </section>

  </div>
</div>

<div id="notes-drawer">
  <div class="notes-label">SPEAKER NOTES (N)</div>
  <div id="notes-text"></div>
</div>

<div id="overview">
  <div class="ov-header">
    <h2 style="font-size:20px; font-weight:800;">スライド一覧（クリックして移動 / ESC で閉じる）</h2>
    <button id="ov-close" style="background:#2563EB; color:#FFF; border:none; padding:8px 16px; border-radius:999px; font-weight:700; cursor:pointer;">閉じる</button>
  </div>
  <div class="ov-grid" id="ov-grid"></div>
</div>

<nav id="hud" aria-label="Presentation controls">
  <button id="btn-prev" title="前のスライド (←)">◀</button>
  <span id="hud-counter">01 / 10</span>
  <button id="btn-next" title="次のスライド (→ / Space)">▶</button>
  <div class="sep"></div>
  <button id="btn-grid" title="一覧表示 (G)">一覧</button>
  <button id="btn-notes" title="発表者ノート (N)">ノート</button>
  <button id="btn-fs" title="全画面表示 (F)">全画面</button>
</nav>

<script>
(function() {
  const slides = Array.from(document.querySelectorAll('.slide'));
  const deck = document.getElementById('deck');
  const progressBar = document.getElementById('progress-bar');
  const counter = document.getElementById('hud-counter');
  const notesDrawer = document.getElementById('notes-drawer');
  const notesText = document.getElementById('notes-text');
  const btnNotes = document.getElementById('btn-notes');
  const overview = document.getElementById('overview');
  const ovGrid = document.getElementById('ov-grid');

  let current = 0;

  function resize() {
    const pad = 28;
    const scaleX = (window.innerWidth - pad) / 1280;
    const scaleY = (window.innerHeight - pad) / 720;
    const scale = Math.min(scaleX, scaleY, 1.45);
    deck.style.transform = \`scale(\${Math.max(0.25, scale)})\`;
  }

  function render() {
    slides.forEach((s, i) => {
      s.classList.toggle('active', i === current);
      s.classList.toggle('prev', i < current);
    });
    const total = slides.length;
    counter.textContent = \`\${String(current + 1).padStart(2, '0')} / \${String(total).padStart(2, '0')}\`;
    progressBar.style.width = \`\${((current + 1) / total) * 100}%\`;
    notesText.textContent = slides[current].dataset.notes || '';
    history.replaceState(null, '', \`#slide-\${current + 1}\`);
    Array.from(ovGrid.children).forEach((el, i) => el.classList.toggle('current', i === current));
  }

  function go(idx) {
    current = Math.max(0, Math.min(slides.length - 1, idx));
    render();
  }

  slides.forEach((s, i) => {
    const item = document.createElement('div');
    item.className = 'ov-item';
    item.innerHTML = \`<div class="ov-num">SLIDE \${String(i + 1).padStart(2, '0')}</div><div class="ov-title">\${s.dataset.title || ''}</div>\`;
    item.addEventListener('click', () => { go(i); overview.classList.remove('open'); });
    ovGrid.appendChild(item);
  });

  const s4Steps = Array.from(document.querySelectorAll('#s4-steps .s4-step'));
  const s4Trace = document.getElementById('s4-trace-text');
  s4Steps.forEach((step) => {
    step.addEventListener('click', (e) => {
      e.stopPropagation();
      s4Steps.forEach((el) => el.classList.remove('selected'));
      step.classList.add('selected');
      if (s4Trace) s4Trace.textContent = step.dataset.trace || '';
    });
  });

  document.getElementById('btn-prev').addEventListener('click', () => go(current - 1));
  document.getElementById('btn-next').addEventListener('click', () => go(current + 1));
  document.getElementById('btn-grid').addEventListener('click', () => overview.classList.toggle('open'));
  document.getElementById('ov-close').addEventListener('click', () => overview.classList.remove('open'));
  btnNotes.addEventListener('click', () => {
    notesDrawer.classList.toggle('open');
    btnNotes.classList.toggle('active', notesDrawer.classList.contains('open'));
  });
  document.getElementById('btn-fs').addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      overview.classList.remove('open');
      notesDrawer.classList.remove('open');
      btnNotes.classList.remove('active');
      return;
    }
    if (overview.classList.contains('open')) return;
    if (['ArrowRight', ' ', 'PageDown', 'ArrowDown'].includes(e.key)) { e.preventDefault(); go(current + 1); }
    else if (['ArrowLeft', 'PageUp', 'ArrowUp', 'Backspace'].includes(e.key)) { e.preventDefault(); go(current - 1); }
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(slides.length - 1);
    else if (e.key.toLowerCase() === 'g') overview.classList.toggle('open');
    else if (e.key.toLowerCase() === 'n') {
      notesDrawer.classList.toggle('open');
      btnNotes.classList.toggle('active', notesDrawer.classList.contains('open'));
    }
    else if (e.key.toLowerCase() === 'f') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    }
  });

  const hashMatch = location.hash.match(/^#slide-(\d+)$/);
  if (hashMatch) {
    const n = parseInt(hashMatch[1], 10) - 1;
    if (!Number.isNaN(n)) current = Math.max(0, Math.min(slides.length - 1, n));
  }

  window.addEventListener('resize', resize);
  resize();
  render();
})();
</script>
</body>
</html>
`;

fs.writeFileSync(OUT_HTML, html, 'utf8');
console.log(`Generated HTML: ${OUT_HTML} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);
