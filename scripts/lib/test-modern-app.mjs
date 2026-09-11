import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

test('Production build outputs exist and are non-empty', () => {
  const dist = path.join(root, 'dist');
  assert.ok(existsSync(dist), 'dist directory must exist');
  assert.ok(existsSync(path.join(dist, 'index.html')), 'dist/index.html must exist');
  assert.ok(existsSync(path.join(dist, 'sw.js')), 'dist/sw.js must exist');
  assert.ok(existsSync(path.join(dist, 'manifest.webmanifest')), 'dist/manifest.webmanifest must exist');
  assert.ok(existsSync(path.join(dist, 'offline.html')), 'dist/offline.html must exist');
  assert.ok(existsSync(path.join(dist, 'data', 'genres.json')), 'dist/data/genres.json must exist');
  assert.ok(existsSync(path.join(dist, 'data', 'songs.json')), 'dist/data/songs.json must exist');

  const indexHtml = readFileSync(path.join(dist, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('PlayGarba'), 'dist/index.html must have PlayGarba title');
  assert.ok(indexHtml.includes('<div id="root"></div>'), 'dist/index.html must have root element');
  assert.ok(indexHtml.includes('.webmanifest'), 'dist/index.html must link to webmanifest');
});

test('Catalogue data integrity in dist', () => {
  const genresPath = path.join(root, 'dist', 'data', 'genres.json');
  const songsPath = path.join(root, 'dist', 'data', 'songs.json');

  const genres = JSON.parse(readFileSync(genresPath, 'utf8'));
  const songs = JSON.parse(readFileSync(songsPath, 'utf8'));

  assert.ok(Array.isArray(genres) && genres.length === 6, 'Must have 6 canonical genres');
  assert.ok(Array.isArray(songs) && songs.length > 1500, 'Must have over 1,500 songs in catalogue');

  const genreIds = new Set(genres.map((g) => g.id));
  assert.ok(genreIds.has('traditional'), 'Traditional genre must exist');
  assert.ok(genreIds.has('dandiya'), 'Dandiya genre must exist');
  assert.ok(genreIds.has('devotional'), 'Devotional genre must exist');
  assert.ok(genreIds.has('folk'), 'Folk genre must exist');
  assert.ok(genreIds.has('sanedo'), 'Sanedo genre must exist');
  assert.ok(genreIds.has('fusion'), 'Fusion genre must exist');
});

test('Modern Service Worker includes fallback and proper cache naming', () => {
  const swContent = readFileSync(path.join(root, 'dist', 'sw.js'), 'utf8');
  assert.ok(swContent.includes('Promise.allSettled'), 'sw.js must use resilient Promise.allSettled');
  assert.ok(swContent.includes('CORE_SHELL'), 'sw.js must define CORE_SHELL');
  assert.ok(swContent.includes('offline.html'), 'sw.js must reference offline.html fallback');
});

test('Design Tokens contain all required palette variables', () => {
  const tokens = readFileSync(path.join(root, 'src', 'styles', 'tokens.css'), 'utf8');
  assert.ok(tokens.includes('--bg-base'), 'Tokens must define --bg-base');
  assert.ok(tokens.includes('--text-primary'), 'Tokens must define --text-primary');
  assert.ok(tokens.includes('--accent'), 'Tokens must define --accent');
  assert.ok(tokens.includes('--min-touch-target: 44px'), 'Tokens must enforce 44px minimum touch target');
  assert.ok(tokens.includes('--genre-traditional'), 'Tokens must define traditional accent');
  assert.ok(tokens.includes('--genre-dandiya'), 'Tokens must define dandiya accent');
});

test('Catalogue search and filtering logic', () => {
  const songsPath = path.join(root, 'dist', 'data', 'songs.json');
  const songs = JSON.parse(readFileSync(songsPath, 'utf8'));

  // Search by query
  const query = 'tara vina';
  const matched = songs.filter((s) => s.title.toLowerCase().includes(query) || s.artist.toLowerCase().includes(query));
  assert.ok(matched.length > 0, 'Must match "tara vina" in catalogue');

  // Filter by genre
  const traditional = songs.filter((s) => s.genre?.toLowerCase() === 'traditional');
  assert.ok(traditional.length > 50, 'Must have at least 50 traditional songs');

  const dandiya = songs.filter((s) => s.genre?.toLowerCase() === 'dandiya');
  assert.ok(dandiya.length > 50, 'Must have at least 50 dandiya songs');
});

test('Genre icon assets exist and are accessible', () => {
  const iconDir = path.join(root, 'assets', 'genre-icons');
  assert.ok(existsSync(path.join(iconDir, 'traditional.webp')), 'traditional.webp must exist');
  assert.ok(existsSync(path.join(iconDir, 'dandiya.webp')), 'dandiya.webp must exist');
  assert.ok(existsSync(path.join(iconDir, 'devotional.webp')), 'devotional.webp must exist');
  assert.ok(existsSync(path.join(iconDir, 'folk-dhol.webp')), 'folk-dhol.webp must exist');
  assert.ok(existsSync(path.join(iconDir, 'folk.webp')), 'folk.webp fallback must exist');
  assert.ok(existsSync(path.join(iconDir, 'sanedo.webp')), 'sanedo.webp must exist');
  assert.ok(existsSync(path.join(iconDir, 'fusion.webp')), 'fusion.webp must exist');
});

test('Design Tokens contain Dandiya active marker and transit metrics', () => {
  const tokens = readFileSync(path.join(root, 'src', 'styles', 'tokens.css'), 'utf8');
  assert.ok(tokens.includes('--garba-dandiya-marker'), 'Tokens must define --garba-dandiya-marker');
  assert.ok(tokens.includes('--genre-icon-size'), 'Tokens must define --genre-icon-size');
  assert.ok(tokens.includes('--transit-track-height'), 'Tokens must define --transit-track-height');
});

test('SEO, GEO, AEO, and XEO metadata in index.html', () => {
  const html = readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(html.includes('property="og:title"'), 'Must have og:title');
  assert.ok(html.includes('property="og:image"'), 'Must have og:image');
  assert.ok(html.includes('name="twitter:card" content="summary_large_image"'), 'Must have summary_large_image');
  assert.ok(html.includes('"@type": "WebApplication"'), 'Must have WebApplication schema for GEO');
  assert.ok(html.includes('"@type": "FAQPage"'), 'Must have FAQPage schema for AEO');
  assert.ok(html.includes('name="geo.region"'), 'Must have geo.region meta tag');
});

test('YouTube video stage progressive disclosure & monochromatic floating launcher', () => {
  const launcherPath = path.join(root, 'src', 'components', 'VideoStage', 'YouTubeFloatingLauncher.tsx');
  const launcherCssPath = path.join(root, 'src', 'components', 'VideoStage', 'YouTubeFloatingLauncher.module.css');
  const videoStagePath = path.join(root, 'src', 'components', 'VideoStage', 'VideoStage.tsx');
  const audioControllerPath = path.join(root, 'src', 'engine', 'AudioController.ts');

  assert.ok(existsSync(launcherPath), 'YouTubeFloatingLauncher.tsx must exist');
  assert.ok(existsSync(launcherCssPath), 'YouTubeFloatingLauncher.module.css must exist');

  const launcherContent = readFileSync(launcherPath, 'utf8');
  assert.ok(launcherContent.includes('YouTube Video Launcher'), 'Launcher must have ARIA label');
  assert.ok(launcherContent.includes('toggleVideoStage'), 'Launcher must toggle video stage');

  const launcherCss = readFileSync(launcherCssPath, 'utf8');
  assert.ok(launcherCss.includes('backdrop-filter: blur(20px)'), 'Launcher must have glass blur');
  assert.ok(launcherCss.includes('--min-touch-target'), 'Launcher must respect minimum touch target');

  const videoStageContent = readFileSync(videoStagePath, 'utf8');
  assert.ok(videoStageContent.includes('Maximize2') || videoStageContent.includes('Minimize2'), 'VideoStage must support fullscreen toggle');

  const audioControllerContent = readFileSync(audioControllerPath, 'utf8');
  assert.ok(audioControllerContent.includes('isVideoFullscreen'), 'AudioController must track isVideoFullscreen');
  assert.ok(audioControllerContent.includes('100vw') && audioControllerContent.includes('100vh'), 'AudioController must support 100vw/100vh theater dock styles');
});

