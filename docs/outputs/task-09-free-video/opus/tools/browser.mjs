import puppeteer from 'puppeteer-core';
export async function openPage(url, { log = true } = {}) {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new', protocolTimeout: 0,
    args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-gpu-watchdog', '--disable-hang-monitor',
      '--force-color-profile=srgb', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  if (log) page.on('console', (m) => console.log('PAGE:', m.text()));
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto(url);
  await page.waitForFunction('window.__ready || window.__error', { timeout: 0 });
  const err = await page.evaluate(() => window.__error);
  if (err) { console.error(err); await browser.close(); process.exit(1); }
  return { browser, page };
}
