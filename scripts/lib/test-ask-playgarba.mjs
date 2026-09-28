#!/usr/bin/env node
// Ask PlayGarba gold set. Each question below is a real answer from the "Help us make PlayGarba better" form (26–28
// Sep 2026), with what Ask PlayGarba must do with it. The catalogue here is built from the canonical song files the
// way the player builds its lists, so an artist the player lists is an artist the test finds.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '../..');
const read = (f) => readFile(path.join(root, f), 'utf8');
const sandbox = {}; sandbox.globalThis = sandbox;
vm.runInNewContext(await read('assets/runtime/ask-playgarba.js'), sandbox);
const { route } = sandbox.GARBA_ASK_ENGINE;
const intents = JSON.parse(await read('assets/runtime/ask-intents.json'));
const pages = JSON.parse(await read('assets/runtime/ask-pages.json'));

// A stand-in for the player's snapshot: songs with a YouTube route can play, and an artist with three or more
// playable songs gets a list, as playCollections() does in app.js
const songs = [];
for (const f of (await readdir(path.join(root, 'data/catalogue/songs'))).filter((f) => f.endsWith('.json')).sort()) {
  for (const s of JSON.parse(await read(`data/catalogue/songs/${f}`))) songs.push({ id: s.id, title: s.title, artist: s.artist, genre: s.genre, playable: Boolean(s.youtubeId) });
}
const byArtist = {};
for (const s of songs) for (let n of String(s.artist || '').split(/\s*(?:,|&|\/|;|\band\b)\s*/i)) { n = n.trim(); if (n && !/^various artists?$/i.test(n)) (byArtist[n] ||= []).push(s); }
const collections = Object.entries(byArtist).filter(([, l]) => l.filter((s) => s.playable).length >= 3)
  .map(([n, l]) => ({ id: `artist:${n.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, kind: 'artist', title: n, ids: l.map((s) => s.id), playable: l.filter((s) => s.playable).length }));
const playing = songs.find((s) => s.playable && /aditya gadhvi/i.test(s.artist));
const snapshot = { song: playing, playing: true, genreId: playing.genre, genres: [{ id: playing.genre, label: 'Traditional' }], songs, collections };
const ctx = { intents, pages, snapshot };

const GOLD = [
  // Features people asked for that are already there
  ['I am not able to fast forward the garba song. Please add that feature', { id: 'seek' }],
  ['forward and backward option has to be there', { id: 'seek' }],
  ['Changing the name of partner', { id: 'names-faces' }],
  ['Plz add the feature is cuatomise name of you and your', { id: 'names-faces' }],
  ['Characters named to our own names that we can customise the way we want or put our face with them', { id: 'names-faces' }],
  ['Add gender selection', { id: 'man-woman' }],
  ["Give people an option to choose their gender, male/female/ even neutral if you want.", { id: 'man-woman' }],
  ['Make the people dance in a circle!', { id: 'dance-circle' }],
  ['Couple garba', { id: 'couple' }],
  ['Sheri garba', { id: 'venue-place' }],
  ['Allow Background music in phones', { id: 'background' }],
  ["I'm facing an issue where the website is playing, and it stops if I switch tabs.", { id: 'background' }],
  ['Can we add feature where you can play song while menimzing the browser for mobile?', { id: 'background' }],
  ['it will be great if this can play in background', { id: 'background' }],
  ['Add a feature like spotify in which we can create our private group of friends and listen to same garba in that group.', { id: 'friends' }],
  ['Freinds', { id: 'friends' }],
  ['3 taal', { id: 'tran-taali' }],
  ['3 taali', { id: 'tran-taali' }],
  ['3rali', { id: 'tran-taali' }],
  ['2 taali', { id: 'be-taali' }],
  ['One taali', { id: 'taali' }],
  ['You can add Dakla also.', { id: 'dakla' }],
  ['Step of dodhiya', { id: 'dodhiyu' }],
  ['dothiyu', { id: 'dodhiyu' }],
  ['play dandiya', { id: 'dandiya' }],
  ['A dadiya for beginners', { id: 'dandiya' }],
  ['Is there a oyoutube playlist for the same we can save', { id: 'youtube-playlist' }],
  ['Add clap button when button got press audiance clapped', { id: 'sound' }],
  ['adding Equalizer', { id: 'sound' }],
  ['Some songs are not playing', { id: 'not-playing' }],
  ['Can you add artist\'s image on their playlist? Like profile pic of the artist', { id: 'artist-photo' }],
  // Not built yet: said plainly, with the request form
  ['Popatiyi', { id: 'dance-steps', status: 'not-yet' }],
  ['Titodo', { id: 'dance-steps', status: 'not-yet' }],
  ['Two step back 2 step ahead', { id: 'dance-steps', status: 'not-yet' }],
  ['Mandli step', { id: 'dance-steps', status: 'not-yet' }],
  ['Add arti animation', { id: 'aarti', status: 'not-yet' }],
  ['play garba with mataji aarti', { id: 'aarti', status: 'not-yet' }],
  ['how i change text from english to gujrati', { id: 'gujarati-ui', status: 'not-yet' }],
  ['DJ light of an on', { id: 'lights', status: 'not-yet' }],
  ['more light', { id: 'lights', status: 'not-yet' }],
  ['idea is to build a "Garba Near Me" feature, starting with Ahmedabad and Surat', { id: 'near-me', status: 'not-yet' }],
  ['Need some partnership like ads Zomato district something', { id: 'partnership' }],
  // Artists and songs come from the catalogue
  ['Atul purohit famous garba add please', { artist: 'Atul Purohit' }],
  ['Aditya ghadvi', { artist: 'Aditya Gadhvi' }],
  ['Jobaniyu Aditya Gadhvi', { artist: 'Aditya Gadhvi' }],
  // The song that's playing
  ['What music are we playing?', { kind: 'now' }],
  ['what song is this', { kind: 'now' }],
  // Our pages answer culture and help questions
  ['What is Nonstop?', { id: 'nonstop' }],
  ['Why is Garba danced during Navratri?', { kind: 'page' }],
  ['What is the difference between garba and dandiya', { kind: 'page' }],
  ['Do I need an account?', { id: 'account' }],
  // A song that isn't here is never invented
  ['neele neele ambar song by kishor kumar', { kind: 'missing' }],
  ['Dance like jetha lal and daya from tmkoc', { kind: 'fallback' }],
];

let failed = 0;
for (const [q, want] of GOLD) {
  const a = route(q, ctx);
  try {
    if (want.id) assert.equal(a.id, want.id);
    if (want.status) assert.equal(a.status, want.status);
    if (want.kind) assert.equal(a.kind, want.kind);
    if (want.artist) { assert.equal(a.kind, 'catalogue'); assert.ok(a.items.some((i) => i.title === want.artist), `no ${want.artist} in ${a.items.map((i) => i.title)}`); }
    // Every answer offers a way on: a control, a page, a play button or the form
    if (a.kind !== 'page') assert.ok((a.actions || []).length || (a.items || []).length || a.source || a.kind === 'now', 'answer offers nothing to do');
  } catch (e) {
    failed++;
    console.error(`✗ "${q}" → ${JSON.stringify({ kind: a.kind, id: a.id, status: a.status, text: (a.text || '').slice(0, 80) })}\n  ${e.message.split('\n')[0]}`);
  }
}
// Answers never claim a feature through words the form has taught us to avoid, and every live action names a real target
for (const it of intents.intents) {
  assert.ok(it.answer.length <= 320, `${it.id} answer is too long for the panel`);
  assert.ok(!/\b(best|ultimate|immerse yourself|vibrant|unforgettable)\b/i.test(it.answer), `${it.id} uses marketing language`);
  if (it.status === 'not-yet') assert.ok((it.actions || []).some((a) => a.do === 'ask'), `${it.id} is not built yet and must offer the request form`);
}
if (failed) { console.error(`${failed} of ${GOLD.length} gold-set questions answered wrongly`); process.exit(1); }
console.log(`✓ Ask PlayGarba answers all ${GOLD.length} gold-set form questions as expected (${intents.intents.length} curated answers, ${pages.sections.length} page sections)`);
