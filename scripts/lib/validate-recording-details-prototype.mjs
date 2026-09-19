#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const readText = async (path) => readFile(new URL(path, root), 'utf8');

const contract = await readJson('docs/product/prototypes/recording-details-contract.json');
const html = await readText('docs/product/prototypes/recording-details.html');
const songs = await readJson('data/catalogue/songs/songs-18.json');
const playbackSources = await readJson('data/playback-sources.json');

assert.equal(contract.version, 1);
assert.equal(contract.prototype, 'recording-details');
assert.equal(contract.productionReady, false);
assert.equal(contract.policy.canonicalIdentityRequired, true);
assert.equal(contract.policy.sourceAttributionRequiredForFacts, true);
assert.equal(contract.policy.verifiedGujaratiRequiresHumanReview, true);
assert.equal(contract.policy.culturalNotesRequireHumanReview, true);
assert.equal(contract.policy.autoTransliterationAllowed, false);
assert.equal(contract.policy.autoTranslationAllowed, false);
assert.equal(contract.policy.lyricsAllowed, false);
assert.equal(contract.policy.biographyInferenceAllowed, false);

const fixture = contract.fixture;
assert.ok(fixture?.canonicalId, 'fixture canonicalId is required');
const song = songs.find(({ id }) => id === fixture.canonicalId);
assert.ok(song, `canonical fixture ${fixture.canonicalId} must exist in catalogue`);

assert.equal(fixture.title, song.title);
assert.equal(fixture.artist, song.artist);
assert.equal(fixture.release.id, song.releaseId);
assert.equal(fixture.release.trackNumber, song.trackNumber);
assert.equal(fixture.release.durationSeconds, song.durationSeconds);
assert.equal(fixture.classification.category, song.category);
assert.equal(fixture.classification.genre, song.genre);
assert.equal(fixture.catalogueNote.text, song.description);
assert.equal(fixture.catalogueNote.status, 'verified');
assert.equal(fixture.catalogueNote.contentKind, 'metadata-summary');
assert.ok(Array.isArray(fixture.catalogueNote.sources) && fixture.catalogueNote.sources.length >= 2);
assert.ok(
  fixture.catalogueNote.sources.some(({ path }) => path === 'data/catalogue/songs/songs-18.json'),
  'catalogue note must point back to its repository record',
);

const source = playbackSources.songSources?.[fixture.canonicalId];
assert.ok(source, 'fixture must have an explicit playback source record');
assert.equal(fixture.playbackSource.status, 'verified');
assert.equal(fixture.playbackSource.provider, source.provider);
assert.equal(fixture.playbackSource.sourceType, source.sourceType);
assert.equal(fixture.playbackSource.url, source.sourceUrl);
assert.equal(fixture.playbackSource.startSeconds, source.startSeconds);
assert.equal(fixture.playbackSource.repositoryPath, 'data/playback-sources.json');
assert.ok(
  fixture.catalogueNote.sources.some(({ url }) => url === source.sourceUrl),
  'catalogue note source list must include the exact official playback source used by the fixture',
);

function assertSourceGatedTextField(field, name) {
  assert.ok(field && typeof field === 'object', `${name} field is required`);
  if (field.status === 'verified') {
    assert.equal(typeof field.value, 'string', `${name} verified value must be text`);
    assert.ok(field.value.trim(), `${name} verified value must not be empty`);
    assert.ok(Array.isArray(field.sources) && field.sources.length > 0, `${name} requires evidence`);
    assert.equal(field.humanReview?.required, true, `${name} requires human review`);
    assert.equal(field.humanReview?.status, 'approved', `${name} review must be approved before rendering`);
    return;
  }
  assert.equal(field.value, null, `${name} must stay null until verified`);
}

assertSourceGatedTextField(fixture.gujaratiTitle, 'Gujarati title');
assert.equal(fixture.gujaratiTitle.status, 'unavailable');
assert.deepEqual(fixture.gujaratiTitle.sources, []);
assert.equal(fixture.gujaratiTitle.humanReview.status, 'not-reviewed');

assert.equal(fixture.latinDisplay.status, 'verified');
assert.equal(fixture.latinDisplay.value, song.title);
assert.equal(fixture.latinDisplay.source, 'canonical-title');
assert.equal(fixture.latinDisplay.autoTransliterated, false);

assert.equal(fixture.culturalStory.status, 'pending-review');
assert.deepEqual(fixture.culturalStory.blocks, []);
assert.equal(fixture.culturalStory.humanReview.required, true);
assert.equal(fixture.culturalStory.humanReview.status, 'not-reviewed');

const gujaratiCodePoints = /[\u0A80-\u0AFF]/u;
assert.equal(
  gujaratiCodePoints.test(JSON.stringify(contract)),
  false,
  'prototype contract must not introduce unreviewed Gujarati text',
);
assert.equal(
  gujaratiCodePoints.test(html),
  false,
  'prototype markup must not hard-code unreviewed Gujarati text',
);

assert.match(html, /fetch\(CONTRACT_URL/);
assert.match(html, /<dialog id="detailsDialog" aria-labelledby="detailsHeading">/);
assert.match(html, /aria-label="Close recording details"/);
assert.match(html, /gujarati\.lang = 'gu'/);
assert.match(html, /dialog\.addEventListener\('close', \(\) => openButton\.focus\(\)\)/);
assert.match(html, /No reviewed Gujarati title is stored for this fixture\./);
assert.match(html, /No cultural story is published for this fixture\./);
assert.match(html, /does not transliterate or translate it automatically/);
assert.match(html, /rel="noopener noreferrer"/);
assert.doesNotMatch(html, /lyrics?\s*:/i, 'prototype must not embed lyric content');

console.log('recording-details prototype contract and source gates passed');
