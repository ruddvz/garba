import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const targetDir = path.resolve(process.cwd(), process.argv[2] || '_site');

const social = {
  title: 'GARBA · Gujarati Garba, beautifully played',
  description: 'Gujarati Garba music, Raas and nonstop sets on PlayGarba.',
  image: 'https://playgarba.com/assets/social/playgarba-og.png',
  alt: 'GARBA — Gujarati Garba. Beautifully played.',
};

const socialBlock = [
  `<meta property="og:title" content="${social.title}" />`,
  `<meta property="og:description" content="${social.description}" />`,
  `<meta property="og:image" content="${social.image}" />`,
  `<meta property="og:image:secure_url" content="${social.image}" />`,
  '<meta property="og:image:type" content="image/png" />',
  '<meta property="og:image:width" content="1200" />',
  '<meta property="og:image:height" content="630" />',
  `<meta property="og:image:alt" content="${social.alt}" />`,
  '<meta name="twitter:card" content="summary_large_image" />',
  `<meta name="twitter:title" content="${social.title}" />`,
  `<meta name="twitter:description" content="${social.description}" />`,
  `<meta name="twitter:image" content="${social.image}" />`,
  `<meta name="twitter:image:alt" content="${social.alt}" />`,
].join('\n');

const removableMeta = [
  /[ \t]*<meta\s+property=["']og:(?:title|description|image(?::(?:secure_url|type|width|height|alt))?)["'][^>]*\/?>\s*/gi,
  /[ \t]*<meta\s+name=["']twitter:(?:card|title|description|image(?::alt)?)["'][^>]*\/?>\s*/gi,
];

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(fullPath);
  }
  return files;
}

function applySocialMeta(html, file) {
  if (!/<\/head>/i.test(html)) throw new Error(`Missing </head> in ${file}`);

  let next = html;
  for (const pattern of removableMeta) next = next.replace(pattern, '');
  next = next.replace(/<\/head>/i, `${socialBlock}\n</head>`);

  const required = [
    `property="og:title" content="${social.title}"`,
    `property="og:image" content="${social.image}"`,
    'property="og:image:width" content="1200"',
    'property="og:image:height" content="630"',
    'name="twitter:card" content="summary_large_image"',
    `name="twitter:image" content="${social.image}"`,
  ];
  for (const marker of required) {
    if (!next.includes(marker)) throw new Error(`Social metadata injection failed for ${file}: ${marker}`);
  }
  return next;
}

const files = await htmlFiles(targetDir);
if (!files.length) throw new Error(`No HTML files found under ${targetDir}`);

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const next = applySocialMeta(html, file);
  if (next !== html) await writeFile(file, next);
}

console.log(`Applied universal social metadata to ${files.length} HTML files.`);
