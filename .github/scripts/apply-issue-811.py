from pathlib import Path
import re


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new)


def regex_one(text, pattern, replacement, label):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return updated


path = Path('nonstop-browser.js')
source = path.read_text()

# Source badges are chooser-only. Keep recordingPresentation() because Now Playing and
# Media Session still use it to preserve truthful continuous-recording semantics.
source = regex_one(
    source,
    r"\n  function sourceLabel\(set\) \{.*?\n  \}\n\n  function recordingPresentation",
    "\n  function recordingPresentation",
    'remove chooser-only sourceLabel',
)

source = one(
    source,
    'grid-template-rows:auto auto auto minmax(0,1fr)',
    'grid-template-rows:auto auto minmax(0,1fr)',
    'collapse chooser to header/categories/list',
)

old_header = '''      .nonstop-browser-header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:22px 24px 12px}\n      .nonstop-browser-kicker{margin:0 0 5px;font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:rgba(246,236,215,.55)}\n      .nonstop-browser-title{margin:0;font-size:clamp(23px,3vw,34px);line-height:1.05;font-weight:600;letter-spacing:-.025em}\n      .nonstop-browser-summary{display:block;margin-top:7px;font-size:13px;line-height:1.35;color:rgba(246,236,215,.62)}\n      .nonstop-browser-close{display:grid;place-items:center;width:44px;height:44px;flex:0 0 44px;border:1px solid rgba(246,236,215,.13);border-radius:50%;background:rgba(255,255,255,.04);color:inherit;font-size:25px;line-height:1;cursor:pointer}\n      .nonstop-browser-search-wrap{padding:0 24px 12px}\n      .nonstop-browser-search{width:100%;min-height:44px;border:1px solid rgba(246,236,215,.13);border-radius:14px;background:rgba(255,255,255,.045);color:var(--ivory);padding:0 14px;font:inherit;font-size:14px;outline:none}\n'''
new_header = '''      .nonstop-browser-header{display:grid;grid-template-columns:max-content minmax(0,1fr) 44px;align-items:center;column-gap:12px;padding:20px 24px 12px}\n      .nonstop-browser-title{margin:0 4px 0 0;font-size:clamp(24px,2.6vw,30px);line-height:1.05;font-weight:600;letter-spacing:-.025em;white-space:nowrap}\n      .nonstop-browser-search{width:min(100%,380px);min-width:0;min-height:44px;justify-self:end;border:1px solid rgba(246,236,215,.13);border-radius:14px;background:rgba(255,255,255,.045);color:var(--ivory);padding:0 14px;font:inherit;font-size:14px;outline:none}\n      .nonstop-browser-close{display:grid;place-items:center;width:44px;height:44px;min-width:44px;border:1px solid rgba(246,236,215,.13);border-radius:50%;background:rgba(255,255,255,.04);color:inherit;font-size:25px;line-height:1;cursor:pointer}\n'''
source = one(source, old_header, new_header, 'replace header/search geometry')
source = one(
    source,
    '.nonstop-browser-categories{display:flex;gap:8px;overflow-x:auto;padding:0 24px 14px;scrollbar-width:none;scroll-padding-inline:24px}',
    '.nonstop-browser-categories{display:flex;gap:8px;overflow-x:auto;padding:0 24px 12px;scrollbar-width:none;scroll-padding-inline:24px}',
    'align category rail',
)
source = one(
    source,
    '.nonstop-browser-list{overflow:auto;padding:0 12px 16px 24px;display:grid;gap:8px;overscroll-behavior:contain;scrollbar-gutter:stable}',
    '.nonstop-browser-list{overflow:auto;padding:0 24px 18px;display:grid;gap:8px;overscroll-behavior:contain;scrollbar-gutter:stable}',
    'symmetrical desktop list gutter',
)
source = one(
    source,
    '.nonstop-set{width:100%;min-height:68px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;text-align:left;border:1px solid rgba(246,236,215,.09);border-radius:18px;background:rgba(255,255,255,.025);color:inherit;padding:14px 15px;cursor:pointer;transition:background .15s ease,border-color .15s ease,transform .15s ease}',
    '.nonstop-set{width:100%;min-height:64px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;text-align:left;border:1px solid rgba(246,236,215,.09);border-radius:18px;background:rgba(255,255,255,.025);color:inherit;padding:12px 15px;cursor:pointer;transition:background .15s ease,border-color .15s ease,transform .15s ease}',
    'tighten desktop row',
)
old_rows = '''      .nonstop-set-title{display:block;font-size:15px;font-weight:600;line-height:1.3}\n      .nonstop-set-meta{display:block;margin-top:4px;font-size:12px;line-height:1.4;color:rgba(246,236,215,.57)}\n      .nonstop-set-recording{display:block;margin-top:4px;font-size:11px;line-height:1.4;color:rgba(246,236,215,.78)}\n      .nonstop-set-badges{display:flex;justify-content:flex-end;align-items:center;gap:6px;flex-wrap:wrap;max-width:300px}\n      .nonstop-set-badge{display:inline-flex;align-items:center;min-height:26px;padding:0 8px;border-radius:999px;background:rgba(255,255,255,.055);font-size:10px;letter-spacing:.04em;color:rgba(246,236,215,.68);white-space:nowrap}\n      .nonstop-set-badge.youtube{color:rgba(246,236,215,.92)}\n      .nonstop-set-badge.recording{background:color-mix(in srgb,var(--accent) 13%,rgba(255,255,255,.055));color:rgba(246,236,215,.92)}\n      .nonstop-browser-empty{padding:38px 12px 52px;color:rgba(246,236,215,.58);font-size:14px;line-height:1.5;text-align:center}\n'''
new_rows = '''      .nonstop-set-copy{min-width:0}\n      .nonstop-set-title{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere;font-size:15px;font-weight:600;line-height:1.3}\n      .nonstop-set-meta{display:block;min-width:0;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:1.4;color:rgba(246,236,215,.57)}\n      .nonstop-set-duration{min-width:6.5ch;text-align:right;align-self:center;white-space:nowrap;font-size:12px;line-height:1;color:rgba(246,236,215,.68);font-variant-numeric:tabular-nums}\n      .nonstop-browser-status{padding:8px 2px 4px;color:rgba(246,236,215,.62);font-size:12px;line-height:1.4}\n      .nonstop-browser-empty{padding:38px 12px 52px;color:rgba(246,236,215,.58);font-size:14px;line-height:1.5;text-align:center}\n'''
source = one(source, old_rows, new_rows, 'replace badges with stable duration')

old_mobile = '''        .nonstop-browser-header{padding:20px 18px 11px}\n        .nonstop-browser-search-wrap{padding:0 18px 11px}\n        .nonstop-browser-categories{padding:0 18px 13px;scroll-padding-inline:18px}\n        .nonstop-browser-list{padding:0 10px 18px 18px}\n        .nonstop-set{grid-template-columns:minmax(0,1fr);gap:9px;padding:13px 14px}\n        .nonstop-set-badges{justify-content:flex-start;max-width:none}\n'''
new_mobile = '''        .nonstop-browser-header{grid-template-columns:max-content minmax(0,1fr) 44px;column-gap:8px;padding:16px 18px 10px}\n        .nonstop-browser-title{margin-right:2px;font-size:clamp(20px,5.4vw,22px)}\n        .nonstop-browser-search{width:100%}\n        .nonstop-browser-categories{padding:0 18px 12px;scroll-padding-inline:18px}\n        .nonstop-browser-list{padding:0 18px 18px}\n        .nonstop-set{grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:12px 14px}\n'''
source = one(source, old_mobile, new_mobile, 'preserve phone two-column rows')

source = one(
    source,
    "    panel.setAttribute('aria-labelledby', 'nonstopBrowserTitle');\n",
    "    panel.setAttribute('aria-labelledby', 'nonstopBrowserTitle');\n    panel.setAttribute('tabindex', '-1');\n",
    'focusable dialog',
)
old_markup = '''    panel.innerHTML = `\n      <header class="nonstop-browser-header">\n        <div>\n          <p class="nonstop-browser-kicker">Continuous YouTube listening</p>\n          <h2 class="nonstop-browser-title" id="nonstopBrowserTitle">Nonstop Garba</h2>\n          <span class="nonstop-browser-summary" id="nonstopBrowserSummary" aria-live="polite">Loading verified recordings…</span>\n        </div>\n        <button class="nonstop-browser-close" id="nonstopBrowserClose" type="button" aria-label="Close Nonstop Garba">×</button>\n      </header>\n      <div class="nonstop-browser-search-wrap">\n        <input class="nonstop-browser-search" id="nonstopBrowserSearch" type="search" inputmode="search" autocomplete="off" enterkeyhint="search" aria-label="Search nonstop sets and artists" placeholder="Search recordings, artists or songs" />\n      </div>\n      <nav class="nonstop-browser-categories" id="nonstopBrowserCategories" aria-label="Nonstop Garba categories"></nav>\n      <div class="nonstop-browser-list" id="nonstopBrowserList" aria-live="polite"></div>`;\n'''
new_markup = '''    panel.innerHTML = `\n      <header class="nonstop-browser-header">\n        <h2 class="nonstop-browser-title" id="nonstopBrowserTitle">Nonstop Garba</h2>\n        <input class="nonstop-browser-search" id="nonstopBrowserSearch" type="search" inputmode="search" autocomplete="off" enterkeyhint="search" aria-label="Search Nonstop Garba" placeholder="Search" />\n        <button class="nonstop-browser-close" id="nonstopBrowserClose" type="button" aria-label="Close Nonstop Garba">×</button>\n      </header>\n      <nav class="nonstop-browser-categories" id="nonstopBrowserCategories" aria-label="Nonstop Garba categories"></nav>\n      <div class="nonstop-browser-list" id="nonstopBrowserList" aria-live="polite"></div>`;\n'''
source = one(source, old_markup, new_markup, 'simplify header DOM')
source = one(
    source,
    "      list.innerHTML = '<div class=\"nonstop-browser-empty\">Loading verified YouTube recordings…</div>';",
    "      list.innerHTML = '<div class=\"nonstop-browser-empty\">Loading Nonstop Garba…</div>';",
    'loading copy',
)
source = one(
    source,
    "    requestAnimationFrame(() => $('nonstopBrowserSearch')?.focus({ preventScroll: true }));",
    "    requestAnimationFrame(() => panel?.focus({ preventScroll: true }));",
    'avoid forced touch keyboard',
)
source = one(
    source,
    "        list.innerHTML = '<div class=\"nonstop-browser-empty\">The YouTube Nonstop recordings could not load. Check your connection and try again.</div>';",
    "        list.innerHTML = '<div class=\"nonstop-browser-empty\">Nonstop Garba couldn\\'t load. Check your connection and try again.</div>';",
    'full error copy',
)
source = regex_one(
    source,
    r"\n    const summary = \$\('nonstopBrowserSummary'\);\n    if \(summary\) \{.*?\n    \}\n",
    "\n",
    'remove visible count/explanation summary',
)

render_start = source.find('  function renderBrowser() {')
if render_start < 0:
    raise SystemExit('renderBrowser not found')
list_start = source.find("    const list = $('nonstopBrowserList');\n    if (!list) return;\n    list.removeAttribute('aria-busy');\n", render_start)
list_end = source.find('\n  function focusableElements()', list_start)
if list_start < 0 or list_end < 0:
    raise SystemExit(f'bounded render list anchors missing: start={list_start}, end={list_end}')

new_list = '''    const list = $('nonstopBrowserList');
    if (!list) return;
    list.removeAttribute('aria-busy');

    const partialFailureCount = state.failedChunks.size;
    const makePartialStatus = () => {
      const status = document.createElement('div');
      status.className = 'nonstop-browser-status';
      status.setAttribute('role', 'status');
      status.textContent = `${partialFailureCount} Nonstop section${partialFailureCount === 1 ? '' : 's'} couldn't load.`;
      return status;
    };

    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'nonstop-browser-empty';
      empty.innerHTML = state.browserQuery
        ? 'No Nonstop Garba matches this search.<br>Try another search or category.'
        : 'No Nonstop Garba matches this category.<br>Choose another category.';
      if (partialFailureCount) list.replaceChildren(makePartialStatus(), empty);
      else list.replaceChildren(empty);
      return;
    }

    const rows = filtered.map((set) => {
      const button = document.createElement('button');
      const active = state.activeSet?.id === set.id;
      const starting = state.startingSetId === set.id;
      const meta = [set.artistsText, set.year || null].filter(Boolean).join(' · ');
      const duration = formatTime(set.durationSeconds);
      button.type = 'button';
      button.className = `nonstop-set${active ? ' active' : ''}`;
      button.setAttribute('aria-label', [active ? 'Currently playing' : 'Play', set.title, meta || null, duration || null].filter(Boolean).join(', '));
      button.setAttribute('aria-pressed', String(active));
      if (starting) {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
      }
      button.innerHTML = `
        <span class="nonstop-set-copy">
          <span class="nonstop-set-title"></span>
          <span class="nonstop-set-meta"></span>
        </span>
        <span class="nonstop-set-duration" aria-hidden="true"></span>`;
      button.querySelector('.nonstop-set-title').textContent = set.title;
      button.querySelector('.nonstop-set-meta').textContent = meta;
      button.querySelector('.nonstop-set-duration').textContent = duration;
      button.addEventListener('click', async () => {
        const played = await startNonstop(set.id);
        if (played) closeBrowser();
      });
      return button;
    });

    if (partialFailureCount) list.replaceChildren(makePartialStatus(), ...rows);
    else list.replaceChildren(...rows);
  }
'''
source = source[:list_start] + new_list + source[list_end:]
path.write_text(source)

validator_path = Path('scripts/lib/validate-nonstop-transport-ux.mjs')
validator = validator_path.read_text()
validator = one(
    validator,
    "const source = await readFile(path.join(root, 'nonstop-browser.js'), 'utf8');\nconst smoke = await readFile(path.join(root, '.github/browser/browser-smoke.spec.mjs'), 'utf8');\n",
    "const source = await readFile(path.join(root, 'nonstop-browser.js'), 'utf8');\n",
    'remove cross-owned smoke dependency',
)
for marker in [
    "  'class=\"nonstop-set-recording\"',\n",
    "  'class=\"nonstop-set-badge recording\"',\n",
    "  'one choice = one recording · chapters stay inside the recording',\n",
]:
    if marker not in validator:
        raise SystemExit(f'legacy focused marker missing: {marker.strip()}')
    validator = validator.replace(marker, '')
legacy_smoke = '''for (const marker of [\n  "sets.first().locator('.nonstop-set-recording')",\n  "sets.first().locator('.nonstop-set-badge.recording')",\n  "toContainText('one choice = one recording')",\n]) {\n  if (!smoke.includes(marker)) fail(`Browser smoke coverage is missing the Nonstop recording contract: ${marker}`);\n}\n\n'''
validator = one(validator, legacy_smoke, '', 'remove stale smoke assertions from focused validator')
anchor = "const trackForSetStart = source.indexOf('function trackForSet(set)');\n"
ui_checks = '''for (const marker of [
  'grid-template-columns:max-content minmax(0,1fr) 44px',
  'grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:12px 14px',
  'font-variant-numeric:tabular-nums',
  'id="nonstopBrowserSearch" type="search"',
  'aria-label="Search Nonstop Garba" placeholder="Search"',
  'class="nonstop-set-duration" aria-hidden="true"',
  "panel.setAttribute('tabindex', '-1')",
  'requestAnimationFrame(() => panel?.focus({ preventScroll: true }))',
  'Loading Nonstop Garba…',
  'No Nonstop Garba matches this search.',
]) {
  if (!source.includes(marker)) fail(`Clean Nonstop chooser contract is missing: ${marker}`);
}

const chooserStart = source.indexOf('function ensureBrowser()');
const chooserEnd = source.indexOf('\n  function focusableElements()', chooserStart);
const chooser = chooserStart >= 0 && chooserEnd > chooserStart
  ? source.slice(chooserStart, chooserEnd)
  : '';
if (!chooser) fail('Nonstop chooser render block is missing');
for (const removed of [
  'Continuous YouTube listening',
  'nonstopBrowserSummary',
  'nonstop-set-recording',
  'nonstop-set-badges',
  'nonstop-set-badge youtube',
  'one choice = one recording',
]) {
  if (chooser.includes(removed)) fail(`Normal Nonstop chooser must not render removed presentation: ${removed}`);
}

'''
validator = one(validator, anchor, ui_checks + anchor, 'add clean chooser checks')
validator = one(
    validator,
    "console.log('✓ chooser cards distinguish chaptered recordings from full recordings without implying separate queued audio');\n",
    "console.log('✓ chooser rows stay minimal: title, artist/year and duration only');\n",
    'update chooser message',
)
validator = one(
    validator,
    "console.log('✓ browser smoke tests assert the one-recording language and recording-format badge');\n",
    "console.log('✓ chooser header, gutters, mobile two-column rows and dialog focus are regression-guarded');\n",
    'update focused UI message',
)
validator_path.write_text(validator)
