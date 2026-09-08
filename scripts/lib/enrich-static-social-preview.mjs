import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const outputDir = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (!outputDir) {
  console.error('Usage: node scripts/lib/enrich-static-social-preview.mjs <site-directory>');
  process.exit(2);
}

const legacyImage = 'https://playgarba.com/assets/backgrounds/library/15-traditional-canopy-courtyard.webp';
const socialImage = 'https://playgarba.com/assets/social/garba-og-card.png';
const imageAlt = 'PlayGarba, the open Gujarati Garba music archive';

async function collectIndexFiles(directory) {
  const files = [];
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return files;
    throw error;
  }
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectIndexFiles(fullPath));
    else if (entry.isFile() && entry.name === 'index.html') files.push(fullPath);
  }
  return files;
}

function enrich(html, file) {
  let next = html.replaceAll(legacyImage, socialImage);
  const ogImage = `<meta property="og:image" content="${socialImage}" />`;
  if (!next.includes(ogImage)) throw new Error(`${file}: canonical social image is missing`);

  if (!next.includes('<meta property="og:image:type" content="image/png" />')) {
    next = next.replace(
      ogImage,
      `${ogImage}\n<meta property="og:image:type" content="image/png" />\n<meta property="og:image:width" content="1200" />\n<meta property="og:image:height" content="630" />`,
    );
  }

  next = next.replace(
    '<meta property="og:image:alt" content="PlayGarba Gujarati Garba artwork" />',
    `<meta property="og:image:alt" content="${imageAlt}" />`,
  );

  const twitterImage = `<meta name="twitter:image" content="${socialImage}" />`;
  if (!next.includes(twitterImage)) throw new Error(`${file}: Twitter social image is missing`);
  if (!next.includes('<meta name="twitter:image:alt"')) {
    next = next.replace(twitterImage, `${twitterImage}\n<meta name="twitter:image:alt" content="${imageAlt}" />`);
  }

  for (const marker of [
    '<meta property="og:image:type" content="image/png" />',
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${imageAlt}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:image:alt" content="${imageAlt}" />`,
  ]) {
    if (!next.includes(marker)) throw new Error(`${file}: social metadata is missing ${marker}`);
  }
  if (next.includes(legacyImage)) throw new Error(`${file}: legacy courtyard social image remains`);
  return next;
}

const targets = [
  path.join(outputDir, 'catalogue'),
  path.join(outputDir, 'songs'),
  path.join(outputDir, 'releases'),
];
const files = (await Promise.all(targets.map(collectIndexFiles))).flat();
if (!files.length) throw new Error(`No generated catalogue pages found in ${outputDir}`);

let changed = 0;
for (const file of files) {
  const before = await readFile(file, 'utf8');
  const after = enrich(before, path.relative(outputDir, file));
  if (after !== before) {
    await writeFile(file, after);
    changed += 1;
  }
}

console.log(`✓ enriched ${files.length} PlayGarba catalogue pages with canonical large-image social previews (${changed} updated)`);
