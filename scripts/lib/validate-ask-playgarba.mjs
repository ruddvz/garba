#!/usr/bin/env node
// Ask PlayGarba contract: help that answers only from what PlayGarba has, never sends a question anywhere, opens from
// More (not the top bar), and points only at controls and pages that exist.
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const read = (f) => readFile(path.join(root, f), 'utf8');
const fail = (m) => { console.error(`✗ ${m}`); process.exitCode = 1; };

const [html, js, intentsRaw] = await Promise.all([read('index.html'), read('assets/runtime/ask-playgarba.js'), read('assets/runtime/ask-intents.json')]);
const intents = JSON.parse(intentsRaw);

// Opens from More, beside the request form, and loads without joining app.js
const more = html.slice(html.indexOf('id="moreCard"'), html.indexOf('</section>', html.indexOf('id="moreCard"')));
if (!more.includes('id="askButton"') || !more.includes('<span>Ask PlayGarba</span>')) fail('Ask PlayGarba must open from a row in More');
const topbar = html.slice(0, html.indexOf('id="moreCard"'));
if (/id="askButton"/.test(topbar)) fail('Ask PlayGarba must not add a top-bar control');
if (!/<script src="assets\/runtime\/ask-playgarba\.js\?v=[\w.-]+" defer><\/script>/.test(html)) fail('index.html must load the Ask PlayGarba runtime, versioned and deferred');
const app = await read('app.js');
if (/ask-playgarba/.test(app)) fail('Ask PlayGarba stays a standalone runtime; app.js must not import it');

// Nothing leaves the device: no network call but its own two files, questions kept per tab for an hour
if (!js.includes("get('assets/runtime/ask-intents.json')") || !js.includes("get('assets/runtime/ask-pages.json')")) fail('Ask PlayGarba must load its curated answers and page index');
if ((js.match(/fetch\(/g) || []).length !== 1) fail('Ask PlayGarba must make no network request beyond its own knowledge files');
if (/localStorage|sendBeacon|XMLHttpRequest|navigator\.sendBeacon/.test(js)) fail('Ask PlayGarba keeps questions in sessionStorage for this tab only and sends nothing');
if (!js.includes("var KEY = 'playgarba:ask:v1', HOUR = 3600e3;")) fail('Ask PlayGarba history must expire after an hour');
// The BookPhysio-style framework: product home state, not a fake message; no autofocus on phones; dialog semantics
for (const m of ["What are you looking for?", 'Find a song or artist', "panel.setAttribute('aria-modal', 'true')", 'if (!coarse.matches) input.focus()', 'New question', 'dragToClose(', "root.GARBA_ASK = { open: open, close: close };", "e.data.type !== 'playgarba:ask'"]) {
  if (!js.includes(m)) fail(`Ask PlayGarba panel is missing ${m}`);
}

// Every answer is short and plain; anything not built says so and offers the form; every control it presses exists
const ids = new Set();
for (const it of intents.intents) {
  if (ids.has(it.id)) fail(`duplicate intent ${it.id}`); ids.add(it.id);
  if (!['live', 'not-yet'].includes(it.status)) fail(`${it.id} has an unknown status`);
  if (!it.phrases?.length || !it.answer) fail(`${it.id} needs phrases and an answer`);
  if (it.status === 'not-yet' && !(it.actions || []).some((a) => a.do === 'ask')) fail(`${it.id} is not built and must offer the request form`);
  for (const a of it.actions || []) {
    if (a.do === 'open') {
      const m = a.target.match(/^#([\w-]+)$|^\[data-proxy="([\w-]+)"\]$/);
      if (!m) fail(`${it.id} targets an unsupported selector ${a.target}`);
      else if (m[1] ? !html.includes(`id="${m[1]}"`) : !html.includes(`data-proxy="${m[2]}"`)) fail(`${it.id} presses ${a.target}, which the player doesn't have`);
    }
    if (a.do === 'genre' && a.id !== 'nonstop' && !html.includes(`data-genre="${a.id}"`)) fail(`${it.id} plays unknown style ${a.id}`);
    if (a.do === 'link') { try { await access(path.join(root, 'public-site', a.href.replace(/^\/|\/$/g, ''), 'index.html')); } catch { fail(`${it.id} links to ${a.href}, which isn't a page`); } }
  }
  if (it.source) { try { await access(path.join(root, 'public-site', it.source.href.replace(/^\/|\/.*$/g, ''), 'index.html')); } catch { fail(`${it.id} cites ${it.source.href}, which isn't a page`); } }
}
if (!/^https:\/\/tally\.so\/r\/\w+$/.test(intents.form) || !html.includes(intents.form)) fail('Ask PlayGarba must hand over to the same request form as More');

if (!process.exitCode) console.log(`✓ Ask PlayGarba opens from More, answers from ${intents.intents.length} curated answers, the catalogue and our pages, and sends nothing anywhere`);
