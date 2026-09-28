const MAX_CUTOUTS = 10;
const CUTOUTS = Object.freeze([
  { id: 'open-mouth-cat', label: 'Open mouth', image: 'singers/meme-cats/open-mouth-cat.webp' },
  { id: 'patched-meme-cat', label: 'Patched smile', image: 'singers/meme-cats/patched-meme-cat.webp' },
  { id: 'side-eye-cat', label: 'Side eye', image: 'singers/meme-cats/side-eye-cat.webp' },
  { id: 'tongue-cat', label: 'Tongue out', image: 'singers/meme-cats/tongue-cat.webp' },
  { id: 'checkerboard-tongue-cat', label: 'Sleepy tongue', image: 'singers/meme-cats/checkerboard-tongue-cat.webp' },
  { id: 'shocked-tabby-cat', label: 'Shocked tabby', image: 'singers/meme-cats/shocked-tabby-cat.webp' },
  { id: 'ginger-wide-eyed-cat', label: 'Wide-eyed ginger', image: 'singers/meme-cats/ginger-wide-eyed-cat.webp' },
  { id: 'speaking-gray-cat', label: 'Talking tabby', image: 'singers/meme-cats/speaking-gray-cat.webp' },
  { id: 'sleepy-orange-profile-cat', label: 'Sleepy orange', image: 'singers/meme-cats/sleepy-orange-profile-cat.webp' },
  { id: 'sleepy-white-cat', label: 'Sleepy white', image: 'singers/meme-cats/sleepy-white-cat.webp' },
]);
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com']);
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const PLAYLIST_ID = /^[A-Za-z0-9_-]{10,64}$/;

const linkForm = document.querySelector('#linkForm');
const linkInput = document.querySelector('#youtubeUrl');
const linkStatus = document.querySelector('#linkStatus');
const clearCutouts = document.querySelector('#clearCutouts');
const count = document.querySelector('#cutoutCount');
const limitNote = document.querySelector('#limitNote');
const cutoutOptions = document.querySelector('#cutoutOptions');
const cutoutList = document.querySelector('#cutoutList');
const cutoutEmpty = document.querySelector('#cutoutEmpty');
const scene = document.querySelector('#scene');
const sceneCutouts = document.querySelector('#sceneCutouts');
const sceneEmpty = document.querySelector('#sceneEmpty');
const sceneCaption = document.querySelector('#sceneCaption');

let activeLink = null;
let stickers = [];
const stickerSets = new Map();

function parseYouTubeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  let url;
  try { url = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { return null; }
  if (!/^https?:$/.test(url.protocol) || !YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null;
  const path = url.pathname.split('/').filter(Boolean);
  const videoId = url.hostname.toLowerCase().endsWith('youtu.be')
    ? path[0]
    : (url.searchParams.get('v') || (['shorts', 'embed', 'live', 'v'].includes(path[0]) ? path[1] : ''));
  const listId = url.searchParams.get('list') || '';
  if (PLAYLIST_ID.test(listId) && !/^(RD|UL|LL|WL)/.test(listId)) return { type: 'playlist', id: listId };
  if (VIDEO_ID.test(String(videoId || ''))) return { type: 'video', id: videoId };
  return null;
}
function linkKey(link) { return link ? `${link.type}:${link.id}` : ''; }
function currentInputMatchesActiveLink() { return linkKey(parseYouTubeUrl(linkInput.value)) === linkKey(activeLink); }
function renderStickers() {
  count.textContent = `${stickers.length} / ${MAX_CUTOUTS}`;
  const matchesActive = currentInputMatchesActiveLink();
  cutoutOptions.querySelectorAll('[data-add-cutout]').forEach((button) => {
    const alreadyAdded = stickers.some((sticker) => sticker.id === button.dataset.addCutout);
    button.disabled = !activeLink || !matchesActive || stickers.length >= MAX_CUTOUTS || alreadyAdded;
    button.textContent = alreadyAdded ? 'Added' : 'Add';
  });
  clearCutouts.disabled = stickers.length === 0;
  cutoutList.hidden = stickers.length === 0;
  cutoutEmpty.hidden = stickers.length > 0;
  cutoutList.replaceChildren();
  sceneCutouts.replaceChildren();
  for (const sticker of stickers) {
    const cutout = CUTOUTS.find((item) => item.id === sticker.id);
    if (!cutout) continue;
    const card = document.createElement('article');
    card.className = 'sticker-card';
    const face = document.createElement('img'); face.src = cutout.image; face.alt = ''; face.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span'); label.textContent = cutout.label;
    const remove = document.createElement('button'); remove.className = 'remove-sticker'; remove.type = 'button';
    remove.setAttribute('aria-label', `Remove ${cutout.label}`); remove.textContent = '×';
    remove.addEventListener('click', () => removeSticker(sticker.id));
    card.append(face, label, remove); cutoutList.append(card);
    const sceneFace = document.createElement('img'); sceneFace.className = 'scene-cat'; sceneFace.src = cutout.image; sceneFace.alt = ''; sceneFace.setAttribute('aria-hidden', 'true'); sceneCutouts.append(sceneFace);
  }
  sceneEmpty.hidden = stickers.length > 0;
  scene.dataset.hasCutouts = String(stickers.length > 0);
  sceneCaption.textContent = !activeLink ? 'Example singer portraits stay exactly as they are.'
    : stickers.length ? `${stickers.length} extra ${stickers.length === 1 ? 'face cutout is' : 'face cutouts are'} on this ${activeLink.type}. Artist portraits stay unchanged.`
      : `This ${activeLink.type} has no extra cutouts yet. Artist portraits stay unchanged.`;
  if (!activeLink) limitNote.textContent = 'Add a video or playlist to enable cutouts.';
  else if (!matchesActive) limitNote.textContent = 'Preview the new link to give it a fresh cutout set.';
  else if (stickers.length >= MAX_CUTOUTS) limitNote.textContent = 'That’s ten. Remove a cutout to add another.';
  else limitNote.textContent = 'Choose up to ten different face cutouts for this link.';
}
function removeSticker(id) {
  stickers = stickers.filter((sticker) => sticker.id !== id);
  if (activeLink) stickerSets.set(linkKey(activeLink), stickers);
  renderStickers();
  const option = cutoutOptions.querySelector(`[data-add-cutout="${CSS.escape(id)}"]`);
  (cutoutList.querySelector('.remove-sticker') || option || clearCutouts).focus();
}
linkForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const parsed = parseYouTubeUrl(linkInput.value);
  if (!parsed) {
    linkStatus.dataset.state = 'error'; linkStatus.textContent = 'Paste a YouTube video or public playlist link.';
    linkInput.setAttribute('aria-invalid', 'true'); renderStickers(); return;
  }
  linkInput.removeAttribute('aria-invalid');
  const changed = linkKey(parsed) !== linkKey(activeLink);
  if (changed && activeLink) stickerSets.set(linkKey(activeLink), stickers);
  activeLink = parsed;
  if (changed) stickers = stickerSets.get(linkKey(activeLink)) || [];
  linkStatus.dataset.state = 'ready';
  linkStatus.textContent = changed ? `New ${parsed.type} ready. Its cutout set starts fresh; singers stay unchanged.` : `This ${parsed.type} is ready. Its cutouts stay separate from the singers.`;
  renderStickers();
});
linkInput.addEventListener('input', () => {
  linkInput.removeAttribute('aria-invalid');
  if (linkStatus.dataset.state === 'error') {
    linkStatus.textContent = activeLink ? `Current preview: ${activeLink.type}. Preview another link to start a fresh cutout set.` : 'Add a link to enable cutouts.';
    delete linkStatus.dataset.state;
  } else if (activeLink && !currentInputMatchesActiveLink()) {
    linkStatus.dataset.state = 'pending'; linkStatus.textContent = `Current ${activeLink.type} preview stays active. Preview this link to start its own fresh set.`;
  } else if (activeLink) {
    linkStatus.dataset.state = 'ready'; linkStatus.textContent = `This ${activeLink.type} remains selected. Its cutouts stay separate from the singers.`;
  }
  renderStickers();
});
cutoutOptions.addEventListener('click', (event) => {
  const button = event.target.closest('[data-add-cutout]');
  if (!button || !activeLink || !currentInputMatchesActiveLink() || stickers.length >= MAX_CUTOUTS) return;
  const id = button.dataset.addCutout;
  if (stickers.some((sticker) => sticker.id === id)) return;
  stickers.push({ id }); stickerSets.set(linkKey(activeLink), stickers); renderStickers();
  cutoutOptions.querySelector(`[data-add-cutout="${CSS.escape(id)}"]`)?.focus();
});
clearCutouts.addEventListener('click', () => {
  stickers = []; if (activeLink) stickerSets.set(linkKey(activeLink), stickers); renderStickers();
  cutoutOptions.querySelector('[data-add-cutout]:not(:disabled)')?.focus();
});
window.CAT_PICKER_TEST = Object.freeze({ parseYouTubeUrl, maxCutouts: MAX_CUTOUTS, cutoutIds: CUTOUTS.map(({ id }) => id) });
for (const cutout of CUTOUTS) {
  const card = document.createElement('article'); card.className = 'cutout-option';
  const art = document.createElement('span'); art.className = 'cutout-art';
  const face = document.createElement('img'); face.src = cutout.image; face.alt = ''; face.setAttribute('aria-hidden', 'true'); art.append(face);
  const description = document.createElement('span'); description.className = 'cutout-description';
  const title = document.createElement('strong'); title.textContent = cutout.label;
  const note = document.createElement('small'); note.textContent = 'Face cutout'; description.append(title, note);
  const button = document.createElement('button'); button.className = 'button button-add'; button.type = 'button';
  button.dataset.addCutout = cutout.id; button.disabled = true; button.textContent = 'Add'; button.setAttribute('aria-label', `Add ${cutout.label}`);
  card.append(art, description, button); cutoutOptions.append(card);
}
renderStickers();
