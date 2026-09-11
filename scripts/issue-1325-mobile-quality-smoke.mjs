import { writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const ORIGIN = process.env.PLAYGARBA_MOBILE_QUALITY_ORIGIN || 'http://127.0.0.1:4173';
const VIEWPORT = { width: 844, height: 390 };
const CANDIDATE_CSS = `
@media(max-height:560px) and (orientation:landscape){
  html body .app .player-shell{
    grid-template-rows:auto auto auto 11px 0 auto 36px auto!important;
    padding-top:52px!important;
    padding-bottom:16px!important;
  }
  html body .app #genreStrip{grid-row:6!important;align-self:end!important}
  html body .app #browseActions{grid-row:8!important;align-self:start!important}
}
`;

function intersects(a, b) {
  if (!a || !b) return null;
  return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
}

async function measure(page, engineName, phase) {
  const result = await page.evaluate(({ engine, label }) => {
    const pack = (node) => {
      if (!(node instanceof HTMLElement)) return null;
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        rect: {
          x: box.x, y: box.y, width: box.width, height: box.height,
          top: box.top, right: box.right, bottom: box.bottom, left: box.left,
        },
        gridRow: style.gridRow,
        gridRowStart: style.gridRowStart,
        gridRowEnd: style.gridRowEnd,
        alignSelf: style.alignSelf,
        position: style.position,
        top: style.top,
        right: style.right,
        bottom: style.bottom,
        marginTop: style.marginTop,
        marginBottom: style.marginBottom,
        paddingTop: style.paddingTop,
        paddingBottom: style.paddingBottom,
        minHeight: style.minHeight,
        height: style.height,
      };
    };
    const one = (selector) => pack(document.querySelector(selector));
    const many = (selector) => [...document.querySelectorAll(selector)].map(pack).filter(Boolean);
    const shell = document.querySelector('.player-shell');
    const shellStyle = shell instanceof HTMLElement ? getComputedStyle(shell) : null;
    const genres = many('#genreStrip .genre-button');
    const progressParts = [one('#elapsedTime'), one('#progress'), one('#durationTime')];
    const transports = [one('#prevButton'), one('#playButton'), one('#nextButton')];
    return {
      engine,
      phase: label,
      viewport: { width: innerWidth, height: innerHeight },
      rootScrollWidth: document.documentElement.scrollWidth,
      shell: shell instanceof HTMLElement ? {
        ...pack(shell),
        gridTemplateRows: shellStyle?.gridTemplateRows,
        rowGap: shellStyle?.rowGap,
        alignContent: shellStyle?.alignContent,
        paddingTop: shellStyle?.paddingTop,
        paddingBottom: shellStyle?.paddingBottom,
      } : null,
      trackBlock: one('#trackBlock'),
      title: one('#songTitle'),
      artist: one('#songArtist'),
      controls: one('.controls'),
      transports,
      progressWrap: one('.progress-wrap'),
      progressParts,
      genreStrip: one('#genreStrip'),
      genres,
      browseActions: one('#browseActions'),
      browseButton: one('#browseButton'),
    };
  }, { engine: engineName, label: phase });

  const rect = (entry) => entry?.rect || null;
  result.intersections = {
    nowPlayingTransport: result.transports.some((transport) => intersects(rect(result.title), rect(transport)) || intersects(rect(result.artist), rect(transport))),
    transportProgress: result.transports.some((transport) => result.progressParts.some((progress) => intersects(rect(transport), rect(progress)))),
    progressGenre: result.progressParts.some((progress) => result.genres.some((genre) => intersects(rect(progress), rect(genre)))),
    genreExplore: result.genres.some((genre) => intersects(rect(genre), rect(result.browseButton))),
  };
  return result;
}

async function snapshots(browserType, engine) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    hasTouch: true,
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  try {
    await page.goto(`${ORIGIN}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const title = document.getElementById('songTitle');
      const genres = document.querySelectorAll('#genreStrip .genre-button[data-genre-bound="true"]');
      return Boolean(title?.textContent?.trim()) && genres.length > 0;
    }, null, { timeout: 15_000 });
    const baseline = await measure(page, engine, 'baseline');
    await page.addStyleTag({ content: CANDIDATE_CSS });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const candidate = await measure(page, engine, 'candidate');
    return [baseline, candidate];
  } finally {
    await context.close();
    await browser.close();
  }
}

const results = [];
for (const [engine, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
  results.push(...await snapshots(browserType, engine));
}

await writeFile('/tmp/issue1325-layout.json', `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));
