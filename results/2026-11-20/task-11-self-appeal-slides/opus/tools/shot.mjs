// 任意のページ（file:// など）を、指定サイズでヘッドレス Chrome に撮影する補助スクリプト。
// 使い方: node tools/shot.mjs <url> <out.png> [width=1600] [height=900] [waitMs=2500]
import { chromium } from 'playwright-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [url, out, w = '1600', h = '900', wait = '2500'] = process.argv.slice(2);
if (!url || !out) {
  console.error('usage: node tools/shot.mjs <url> <out.png> [width] [height] [waitMs]');
  process.exit(1);
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(+wait);
  await page.screenshot({ path: out });
  console.log('saved', out);
} finally {
  await browser.close();
}
