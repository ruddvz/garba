import assert from 'node:assert/strict';
import { performanceArtistIdentity } from './artist-identity.mjs';

const sameArtist = performanceArtistIdentity(
  { artist: 'Geeta Rabari' },
  { artists: ['Geeta Rabari'] },
);
assert.equal(sameArtist.compatible, true);
assert.equal(sameArtist.status, 'same-artist');

const differentArtist = performanceArtistIdentity(
  { artist: 'Rutvi Pandya' },
  { artists: ['Geeta Rabari'] },
);
assert.equal(differentArtist.compatible, false);
assert.equal(differentArtist.status, 'conflict');

const collaboration = performanceArtistIdentity(
  { artist: 'Geeta Rabari, Maulik Mehta' },
  { artists: ['Geeta Rabari'] },
);
assert.equal(collaboration.compatible, true);
assert.equal(collaboration.status, 'collaboration-compatible');

const alias = performanceArtistIdentity(
  { artist: 'Aditya Gadvi' },
  { artists: ['Aditya Gadhvi'] },
);
assert.equal(alias.compatible, true);
assert.deepEqual(alias.shared, ['aditya gadhvi']);

const stageAlias = performanceArtistIdentity(
  { artist: 'Jigardan Gadhavi' },
  { artists: ['Jigrra'] },
);
assert.equal(stageAlias.compatible, true);
assert.deepEqual(stageAlias.shared, ['jigardan gadhavi']);

const segmentCredit = performanceArtistIdentity(
  { artist: 'Himali Vyas Naik' },
  { artists: ['Geeta Rabari', 'Aditya Gadhvi'] },
  { artists: ['Himali Vyas Naik'] },
);
assert.equal(segmentCredit.compatible, true);
assert.equal(segmentCredit.status, 'same-artist');

const explicitWrongSegmentPerformer = performanceArtistIdentity(
  { artist: 'Geeta Rabari' },
  { artists: ['Geeta Rabari', 'Aditya Gadhvi'] },
  { artists: ['Aditya Gadhvi'] },
);
assert.equal(explicitWrongSegmentPerformer.compatible, false);
assert.equal(explicitWrongSegmentPerformer.status, 'conflict');

const ambiguousMultiArtistSet = performanceArtistIdentity(
  { artist: 'Geeta Rabari' },
  { artists: ['Geeta Rabari', 'Aditya Gadhvi'] },
);
assert.equal(ambiguousMultiArtistSet.compatible, false);
assert.equal(ambiguousMultiArtistSet.status, 'unknown');

const fullSetCollaboration = performanceArtistIdentity(
  { artist: 'Geeta Rabari, Aditya Gadhvi' },
  { artists: ['Geeta Rabari', 'Aditya Gadhvi'] },
);
assert.equal(fullSetCollaboration.compatible, true);
assert.equal(fullSetCollaboration.status, 'collaboration-compatible');

const metadataOnlyChapter = performanceArtistIdentity(
  { artist: 'Geeta Rabari, Aditya Gadhvi' },
  { artists: ['Geeta Rabari', 'Aditya Gadhvi'] },
  { title: 'Published chapter', startSeconds: 120, routingEligible: false },
);
assert.equal(metadataOnlyChapter.compatible, false);
assert.equal(metadataOnlyChapter.status, 'metadata-only');

const metadataOnlyEvenWithCredit = performanceArtistIdentity(
  { artist: 'Geeta Rabari' },
  { artists: ['Geeta Rabari'] },
  { title: 'Published chapter', startSeconds: 120, artists: ['Geeta Rabari'], routingEligible: false },
);
assert.equal(metadataOnlyEvenWithCredit.compatible, false);
assert.equal(metadataOnlyEvenWithCredit.status, 'metadata-only');

const unknown = performanceArtistIdentity(
  { artist: 'Hemant Chauhan' },
  { artists: [] },
);
assert.equal(unknown.compatible, false);
assert.equal(unknown.status, 'unknown');

const linkedButConflicting = performanceArtistIdentity(
  { artist: 'Rutvi Pandya', releaseId: 'release-a' },
  { artists: ['Geeta Rabari'], linkedReleaseId: 'release-a' },
);
assert.equal(linkedButConflicting.releaseMatch, true);
assert.equal(linkedButConflicting.compatible, false);

console.log('✓ performance chapter identity accepts same-artist and credited collaborations');
console.log('✓ chapter-level performer credits override the broader set roster');
console.log('✓ multi-artist sets without chapter credits fail closed unless the song credits the full collaboration');
console.log('✓ metadata-only chapters remain in discovery data but are never eligible for generated exact playback');
console.log('✓ known artist/stage-name aliases resolve deterministically');
console.log('✓ different-artist and unknown-performer matches fail closed, even on a linked release');
