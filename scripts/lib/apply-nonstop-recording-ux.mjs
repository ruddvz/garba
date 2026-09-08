import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

async function replaceOnce(file, before, after) {
  const full = path.join(root, file);
  const source = await readFile(full, 'utf8');
  if (source.includes(after)) return false;
  if (!source.includes(before)) throw new Error(`Expected marker not found in ${file}: ${before.slice(0, 100)}`);
  await writeFile(full, source.replace(before, after));
  console.log(`Updated ${file}`);
  return true;
}

const browserFile = 'nonstop-browser.js';

await replaceOnce(
  browserFile,
  `  function sourceLabel(set) {\n    if (set.sourceType === 'official-artist-channel') return 'Official artist';\n    if (set.sourceType === 'artist-channel') return 'Artist channel';\n    if (set.sourceType === 'verified-label-channel') return 'Verified label';\n    if (set.sourceType === 'label-channel') return 'Label channel';\n    if (set.sourceType === 'verified-distributor-channel') return 'Verified distributor';\n    if (set.sourceType === 'community-upload') return 'Community source';\n    return 'YouTube';\n  }`,
  `  function sourceLabel(set) {\n    if (set.sourceType === 'official-artist-channel') return 'Official artist';\n    if (set.sourceType === 'artist-channel') return 'Artist channel';\n    if (set.sourceType === 'verified-label-channel') return 'Verified label';\n    if (set.sourceType === 'label-channel') return 'Label channel';\n    if (set.sourceType === 'verified-distributor-channel') return 'Verified distributor';\n    if (set.sourceType === 'community-upload') return 'Community source';\n    return 'YouTube';\n  }\n\n  function recordingPresentation(set) {\n    const chapterCount = Array.isArray(set?.segments) ? set.segments.length : 0;\n    const tracklistCount = Array.isArray(set?.tracklist) ? set.tracklist.length : 0;\n    if (chapterCount > 0) {\n      return {\n        label: 'Chaptered recording',\n        detail: \`One recording · \${chapterCount} chapter\${chapterCount === 1 ? '' : 's'}\`,\n        mediaAlbum: 'Nonstop Garba · Chaptered recording',\n      };\n    }\n    if (tracklistCount > 0) {\n      return {\n        label: 'Full recording',\n        detail: \`One full recording · \${tracklistCount} songs listed · no timestamps\`,\n        mediaAlbum: 'Nonstop Garba · Full recording',\n      };\n    }\n    return {\n      label: 'Full recording',\n      detail: 'One full recording · no chapter map',\n      mediaAlbum: 'Nonstop Garba · Full recording',\n    };\n  }`
);

await replaceOnce(
  browserFile,
  `      .nonstop-set-meta{display:block;margin-top:4px;font-size:12px;line-height:1.4;color:rgba(246,236,215,.57)}\n      .nonstop-set-badges{display:flex;justify-content:flex-end;align-items:center;gap:6px;flex-wrap:wrap;max-width:260px}`,
  `      .nonstop-set-meta{display:block;margin-top:4px;font-size:12px;line-height:1.4;color:rgba(246,236,215,.57)}\n      .nonstop-set-recording{display:block;margin-top:4px;font-size:11px;line-height:1.4;color:rgba(246,236,215,.78)}\n      .nonstop-set-badges{display:flex;justify-content:flex-end;align-items:center;gap:6px;flex-wrap:wrap;max-width:300px}`
);

await replaceOnce(
  browserFile,
  `      .nonstop-set-badge.youtube{color:rgba(246,236,215,.92)}\n      .nonstop-browser-empty`,
  `      .nonstop-set-badge.youtube{color:rgba(246,236,215,.92)}\n      .nonstop-set-badge.recording{background:color-mix(in srgb,var(--accent) 13%,rgba(255,255,255,.055));color:rgba(246,236,215,.92)}\n      .nonstop-browser-empty`
);

await replaceOnce(
  browserFile,
  `        queueButton.title = 'Browse Nonstop Garba';\n        queueButton.setAttribute('aria-label', 'Browse Nonstop Garba sets');`,
  `        queueButton.title = 'Browse Nonstop Garba';\n        queueButton.setAttribute('aria-label', 'Browse Nonstop Garba recordings');`
);

await replaceOnce(
  browserFile,
  `        control.title = 'Choose another Nonstop set';\n        control.setAttribute('aria-label', 'Choose another Nonstop set');`,
  `        control.title = 'Choose another Nonstop recording';\n        control.setAttribute('aria-label', 'Choose another Nonstop recording');`
);

await replaceOnce(
  browserFile,
  `  function setMetadata(set) {\n    if (!state.activeSet || state.activeSet.id !== set.id) return;\n    const app = $('app');`,
  `  function setMetadata(set) {\n    if (!state.activeSet || state.activeSet.id !== set.id) return;\n    const recording = recordingPresentation(set);\n    const app = $('app');`
);

await replaceOnce(
  browserFile,
  `    if (eyebrow && eyebrow.textContent !== 'Nonstop Garba') eyebrow.textContent = 'Nonstop Garba';`,
  `    const eyebrowText = \`Nonstop · \${recording.label}\`;\n    if (eyebrow && eyebrow.textContent !== eyebrowText) eyebrow.textContent = eyebrowText;`
);

await replaceOnce(
  browserFile,
  `          album: 'Nonstop Garba',`,
  `          album: recording.mediaAlbum,`
);

await replaceOnce(
  browserFile,
  `      if (!quiet) announce(\`Playing \${set.title}\`);`,
  `      if (!quiet) announce(\`Playing \${set.title} as one recording\`);`
);

await replaceOnce(
  browserFile,
  `<p class="nonstop-browser-kicker">YouTube-first catalogue</p>`,
  `<p class="nonstop-browser-kicker">Continuous YouTube listening</p>`
);

await replaceOnce(
  browserFile,
  `<span class="nonstop-browser-summary" id="nonstopBrowserSummary" aria-live="polite">Loading verified sets…</span>`,
  `<span class="nonstop-browser-summary" id="nonstopBrowserSummary" aria-live="polite">Loading verified recordings…</span>`
);

await replaceOnce(
  browserFile,
  `placeholder="Search sets, artists or songs"`,
  `placeholder="Search recordings, artists or songs"`
);

await replaceOnce(
  browserFile,
  `      list.innerHTML = '<div class="nonstop-browser-empty">Loading verified YouTube sets…</div>';`,
  `      list.innerHTML = '<div class="nonstop-browser-empty">Loading verified YouTube recordings…</div>';`
);

await replaceOnce(
  browserFile,
  `        list.innerHTML = '<div class="nonstop-browser-empty">The YouTube non-stop catalogue could not load. Check your connection and try again.</div>';`,
  `        list.innerHTML = '<div class="nonstop-browser-empty">The YouTube Nonstop recordings could not load. Check your connection and try again.</div>';`
);

await replaceOnce(
  browserFile,
  `      const shown = filtered.length === sets.length ? \`\${sets.length} playable YouTube sets\` : \`\${filtered.length} of \${sets.length} playable YouTube sets\`;\n      summary.textContent = \`\${shown} · official and verified sources ranked first\${partial}\`;`,
  `      const shown = filtered.length === sets.length ? \`\${sets.length} playable YouTube recordings\` : \`\${filtered.length} of \${sets.length} playable YouTube recordings\`;\n      summary.textContent = \`\${shown} · one choice = one recording · chapters stay inside the recording\${partial}\`;`
);

await replaceOnce(
  browserFile,
  `      list.innerHTML = \`<div class="nonstop-browser-empty">No playable YouTube sets match this view.<br>\${action}</div>\`;`,
  `      list.innerHTML = \`<div class="nonstop-browser-empty">No playable YouTube recordings match this view.<br>\${action}</div>\`;`
);

await replaceOnce(
  browserFile,
  `      const active = state.activeSet?.id === set.id;\n      const starting = state.startingSetId === set.id;`,
  `      const active = state.activeSet?.id === set.id;\n      const starting = state.startingSetId === set.id;\n      const recording = recordingPresentation(set);`
);

await replaceOnce(
  browserFile,
  `      button.setAttribute('aria-label', \`\${active ? 'Currently playing' : 'Play'} \${set.title} by \${set.artistsText}\`);`,
  `      button.setAttribute('aria-label', \`\${active ? 'Currently playing' : 'Play'} \${set.title} by \${set.artistsText}. \${recording.detail}\`);`
);

await replaceOnce(
  browserFile,
  `          <span class="nonstop-set-title"></span>\n          <span class="nonstop-set-meta"></span>\n        </span>\n        <span class="nonstop-set-badges">\n          <span class="nonstop-set-badge youtube">YouTube</span>`,
  `          <span class="nonstop-set-title"></span>\n          <span class="nonstop-set-meta"></span>\n          <span class="nonstop-set-recording"></span>\n        </span>\n        <span class="nonstop-set-badges">\n          <span class="nonstop-set-badge recording"></span>\n          <span class="nonstop-set-badge youtube">YouTube</span>`
);

await replaceOnce(
  browserFile,
  `      button.querySelector('.nonstop-set-meta').textContent = [set.artistsText, set.year || null].filter(Boolean).join(' · ');\n      button.querySelector('.nonstop-set-badge.source').textContent = sourceLabel(set);`,
  `      button.querySelector('.nonstop-set-meta').textContent = [set.artistsText, set.year || null].filter(Boolean).join(' · ');\n      button.querySelector('.nonstop-set-recording').textContent = recording.detail;\n      button.querySelector('.nonstop-set-badge.recording').textContent = recording.label;\n      button.querySelector('.nonstop-set-badge.source').textContent = sourceLabel(set);`
);

const smokeFile = '.github/browser/browser-smoke.spec.mjs';
await replaceOnce(
  smokeFile,
  `  const sets = page.locator('#nonstopBrowserList .nonstop-set');\n  await expect(sets.first()).toBeVisible();\n  expect(await sets.count()).toBeGreaterThan(0);\n  await expectNoDocumentOverflow(page);`,
  `  const sets = page.locator('#nonstopBrowserList .nonstop-set');\n  await expect(sets.first()).toBeVisible();\n  expect(await sets.count()).toBeGreaterThan(0);\n  await expect(sets.first().locator('.nonstop-set-recording')).toContainText(/One (?:full )?recording/);\n  await expect(sets.first().locator('.nonstop-set-badge.recording')).toHaveText(/^(?:Chaptered|Full) recording$/);\n  await expect(page.locator('#nonstopBrowserSummary')).toContainText('one choice = one recording');\n  await expectNoDocumentOverflow(page);`
);

console.log('Applied Nonstop one-recording UX and browser regression checks.');
