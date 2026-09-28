#!/usr/bin/env node
// Ask PlayGarba answers from our own pages. This splits each public help and culture page into its sections (a
// heading and the words under it) and writes them to assets/runtime/ask-pages.json, which the panel loads when it
// opens. Nothing is summarised or rewritten: an answer quotes the section and links to it.
//
//   node scripts/lib/build-ask-pages.mjs          write the index
//   node scripts/lib/build-ask-pages.mjs --check  fail if the committed index is out of date
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const OUT = 'assets/runtime/ask-pages.json';
// The pages people read for help and for the tradition itself. The player, its handoff and catalogue routes are left
// out: their words are controls, not answers.
export const ASK_PAGES = [
  'how-to-use', 'faq', 'install', 'about', 'what-is-garba', 'history-of-garba', 'garba-music', 'dandiya-raas',
  'garba-vs-dandiya', 'navratri-and-garba', 'garba-attire-and-craft', 'learn', 'navratri-2026',
];
const MAX_TEXT = 700;

const decode = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;|&rsquo;|&lsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"')
  .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&hellip;/g, '…').replace(/&middot;/g, '·')
  .replace(/&rarr;/g, '→').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
const clean = (s) => decode(s.replace(/<[^>]+>/g, ' ')).replace(/[↗→]/g, '').replace(/\s+/g, ' ').trim();

export function sectionsOf(html, route) {
  const title = clean((html.match(/<title>([\s\S]*?)<\/title>/) || [, route])[1]).replace(/\s*[·|].*$/, '');
  let main = (html.match(/<main[\s\S]*?<\/main>/) || [html])[0];
  main = main.replace(/<(script|style|svg|nav|form|button)[^>]*>[\s\S]*?<\/\1>/g, ' ');
  const out = [];
  // Split at each h1–h3; the words up to the next heading belong to it
  const parts = main.split(/(?=<h[1-3][\s>])/);
  for (const part of parts) {
    const h = part.match(/^<h([1-3])([^>]*)>([\s\S]*?)<\/h\1>/);
    if (!h) continue;
    const heading = clean(h[3]);
    // Link to the section only where its own heading carries an anchor
    const id = (h[2].match(/\sid="([^"]+)"/) || [])[1] || '';
    const body = part.slice(h[0].length);
    // Keep sentences, not the chips and labels between them
    const paras = [...body.matchAll(/<(p|li|dd|dt|summary|blockquote)[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => clean(m[2])).filter((t) => t.length > 2);
    // Numbered kickers ("01 · PLAYER") label the next section; they aren't part of this one's words
    let text = paras.join(' ').replace(/\s+(?:\d{2} · )?[A-Z][A-Z &]{2,}$/, '').replace(/\s+([.,;:!?])/g, '$1').replace(/\s+/g, ' ').trim();
    if (!heading || text.length < 30) continue;
    if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT).replace(/\s+\S*$/, '') + '…';
    out.push({ page: title, href: `/${route}/${id ? '#' + id : ''}`, heading, text });
  }
  return out;
}

export async function buildAskPages() {
  const sections = [];
  for (const route of ASK_PAGES) {
    const html = await readFile(path.join(root, 'public-site', route, 'index.html'), 'utf8');
    sections.push(...sectionsOf(html, route));
  }
  return JSON.stringify({ version: 1, sections }, null, 0).replace(/},{/g, '},\n{') + '\n';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const next = await buildAskPages();
  if (process.argv.includes('--check')) {
    const current = await readFile(path.join(root, OUT), 'utf8').catch(() => '');
    if (current !== next) { console.error(`${OUT} is out of date. Run: node scripts/lib/build-ask-pages.mjs`); process.exit(1); }
    console.log(`✓ ${OUT} matches the ${ASK_PAGES.length} help and culture pages`);
  } else {
    await writeFile(path.join(root, OUT), next);
    console.log(`Wrote ${OUT}: ${JSON.parse(next).sections.length} sections from ${ASK_PAGES.length} pages`);
  }
}
