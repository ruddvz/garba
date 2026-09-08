import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';

const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/lib/inject-social-preview.mjs <html-file>');
  process.exit(2);
}

const imageUrl = 'https://playgarba.com/assets/social/garba-og-card.png';
const imageAlt = 'PlayGarba, the open Gujarati Garba music archive';
let html = await readFile(target, 'utf8');

const ogAnchor = '    <meta property="og:site_name" content="PlayGarba" />';
const ogBlock = `${ogAnchor}\n    <meta property="og:image" content="${imageUrl}" />\n    <meta property="og:image:secure_url" content="${imageUrl}" />\n    <meta property="og:image:type" content="image/png" />\n    <meta property="og:image:width" content="1200" />\n    <meta property="og:image:height" content="630" />\n    <meta property="og:image:alt" content="${imageAlt}" />`;

if (!html.includes(ogAnchor)) throw new Error('Open Graph site-name anchor is missing');
html = html.replace(ogAnchor, ogBlock);

const twitterCard = '    <meta name="twitter:card" content="summary" />';
if (!html.includes(twitterCard)) throw new Error('Twitter card anchor is missing');
html = html.replace(twitterCard, '    <meta name="twitter:card" content="summary_large_image" />');

const twitterDescription = '    <meta name="twitter:description" content="Discover Garba songs, artists, releases, live performances and nonstop sets in one open community-built catalogue." />';
if (!html.includes(twitterDescription)) throw new Error('Twitter description anchor is missing');
html = html.replace(
  twitterDescription,
  `${twitterDescription}\n    <meta name="twitter:image" content="${imageUrl}" />\n    <meta name="twitter:image:alt" content="${imageAlt}" />`,
);

const structuredUrl = '        "url": "https://playgarba.com/",';
if (!html.includes(structuredUrl)) throw new Error('Structured-data URL anchor is missing');
html = html.replace(structuredUrl, `${structuredUrl}\n        "image": "${imageUrl}",`);

await writeFile(target, html);
console.log(`Injected PlayGarba social-preview metadata into ${target}`);
