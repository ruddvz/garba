import { chromium, webkit } from 'playwright';

const ORIGIN = 'http://127.0.0.1:4174';
const cases = [
  ['phone', { width: 390, height: 844 }],
  ['tablet', { width: 768, height: 1024 }],
  ['desktop', { width: 1440, height: 900 }],
];
const engines = [['chromium', chromium], ['webkit', webkit]];
let failed = false;

for (const [engineName, engine] of engines) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const [label, viewport] of cases) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      page.setDefaultTimeout(6000);
      page.setDefaultNavigationTimeout(8000);
      const failures = [];
      page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
      page.on('console', (message) => {
        if (message.type() === 'error') failures.push(`console: ${message.text()}`);
      });
      const started = Date.now();
      try {
        const response = await page.goto(`${ORIGIN}/explore/`, { waitUntil: 'commit' });
        await page.locator('#catalogueTitle').waitFor({ state: 'visible' });
        const title = await page.locator('#catalogueTitle').textContent();
        if (title?.trim() !== 'Explore') throw new Error(`Explore heading mismatch: ${JSON.stringify(title)}`);
        await page.locator('.collection-card').first().waitFor({ state: 'visible' });
        const count = await page.locator('.collection-card').count();
        const elapsed = Date.now() - started;
        if (count < 1) throw new Error('No collection cards rendered');
        if (elapsed > 5000) throw new Error(`First collection card took ${elapsed}ms (>5000ms)`);
        console.log(`PASS ${engineName}/${label}: status=${response?.status()} cards=${count} ready=${elapsed}ms`);
        if (failures.length) console.log(`NOTE ${engineName}/${label}: ${failures.join(' | ')}`);
      } catch (error) {
        failed = true;
        let snapshot = 'snapshot unavailable';
        try {
          snapshot = await Promise.race([
            page.evaluate(() => ({
              url: location.href,
              readyState: document.readyState,
              title: document.title,
              heading: document.querySelector('#catalogueTitle')?.outerHTML || null,
              count: document.querySelectorAll('.collection-card').length,
              bodyClass: document.body?.className || '',
            })),
            new Promise((resolve) => setTimeout(() => resolve('main-thread-unresponsive'), 1500)),
          ]);
        } catch {}
        console.error(`FAIL ${engineName}/${label}: ${error.message}`);
        console.error(`DIAG ${engineName}/${label}: ${JSON.stringify(snapshot)}`);
        if (failures.length) console.error(`RUNTIME ${engineName}/${label}: ${failures.join(' | ')}`);
      } finally {
        await context.close().catch(() => {});
      }
    }
  } finally {
    await browser.close();
  }
}

if (failed) process.exitCode = 1;
