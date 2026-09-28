const MAX_CUTOUTS = 10;
const CAT_IMAGE = 'singers/cat-face-cutout.webp';
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com']);
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const PLAYLIST_ID = /^[A-Za-z0-9_-]{10,64}$/;

const linkForm = document.querySelector('#linkForm');
const linkInput = document.querySelector('#youtubeUrl');
const linkStatus = document.querySelector('#linkStatus');
const addCat = document.querySelector('#addCat');
const clearCutouts = document.querySelector('#clearCutouts');
const count = document.querySelector('#cutoutCount');
const limitNote = document.querySelector('#limitNote');
const cutoutList = document.querySelector('#cutoutList');
const cutoutEmpty = document.querySelector('#cutoutEmpty');
const scene = document.querySelector('#scene');
const sceneCutouts = document.querySelector('#sceneCutouts');
const sceneEmpty = document.querySelector('#sceneEmpty');
const sceneCaption = document.querySelector('#sceneCaption');

let activeLink = null;
let stickers = [];
let nextStickerId = 0;
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
  addCat.disabled = !activeLink || !matchesActive || stickers.length >= MAX_CUTOUTS;
  clearCutouts.disabled = stickers.length === 0;
  cutoutList.hidden = stickers.length === 0;
  cutoutEmpty.hidden = stickers.length > 0;
  cutoutList.replaceChildren();
  sceneCutouts.replaceChildren();
  for (const [index, sticker] of stickers.entries()) {
    const card = document.createElement('article');
    card.className = 'sticker-card';
    const face = document.createElement('img');
    face.src = CAT_IMAGE;
    face.alt = '';
    face.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.textContent = `Surprised cat ${index + 1}`;
    const remove = document.createElement('button');
    remove.className = 'remove-sticker';
    remove.type = 'button';
    remove.setAttribute('aria-label', `Remove surprised cat ${index + 1}`);
    remove.textContent = '×';
    remove.addEventListener('click', () => removeSticker(sticker.id));
    card.append(face, label, remove);
    cutoutList.append(card);

    const sceneFace = document.createElement('img');
    sceneFace.className = 'scene-cat';
    sceneFace.src = CAT_IMAGE;
    sceneFace.alt = '';
    sceneFace.setAttribute('aria-hidden', 'true');
    sceneCutouts.append(sceneFace);
  }
  sceneEmpty.hidden = stickers.length > 0;
  scene.dataset.hasCutouts = String(stickers.length > 0);
  sceneCaption.textContent = !activeLink
    ? 'Example singer portraits stay exactly as they are.'
    : stickers.length
      ? `${stickers.length} extra ${stickers.length === 1 ? 'face cutout is' : 'face cutouts are'} on this ${activeLink.type}. Artist portraits stay unchanged.`
      : `This ${activeLink.type} has no extra cutouts yet. Artist portraits stay unchanged.`;
  if (!activeLink) limitNote.textContent = 'Add a video or playlist to enable this cutout.';
  else if (!matchesActive) limitNote.textContent = 'Preview the new link to give it a fresh cutout set.';
  else if (stickers.length >= MAX_CUTOUTS) limitNote.textContent = 'That’s ten. Remove a cutout to add another.';
  else limitNote.textContent = 'Up to ten face cutouts on this link.';
}

function removeSticker(id) {
  stickers = stickers.filter((sticker) => sticker.id !== id);
  if (activeLink) stickerSets.set(linkKey(activeLink), stickers);
  renderStickers();
  (cutoutList.querySelector('.remove-sticker') || addCat).focus();
}

linkForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const parsed = parseYouTubeUrl(linkInput.value);
  if (!parsed) {
    linkStatus.dataset.state = 'error';
    linkStatus.textContent = 'Paste a YouTube video or public playlist link.';
    linkInput.setAttribute('aria-invalid', 'true');
    renderStickers();
    return;
  }
  linkInput.removeAttribute('aria-invalid');
  const changed = linkKey(parsed) !== linkKey(activeLink);
  if (changed && activeLink) stickerSets.set(linkKey(activeLink), stickers);
  activeLink = parsed;
  if (changed) stickers = stickerSets.get(linkKey(activeLink)) || [];
  linkStatus.dataset.state = 'ready';
  linkStatus.textContent = changed
    ? `New ${parsed.type} ready. Its cutout set starts fresh; singers stay unchanged.`
    : `This ${parsed.type} is ready. Its cutouts stay separate from the singers.`;
  renderStickers();
});

linkInput.addEventListener('input', () => {
  linkInput.removeAttribute('aria-invalid');
  if (linkStatus.dataset.state === 'error') {
    linkStatus.textContent = activeLink ? `Current preview: ${activeLink.type}. Preview another link to start a fresh cutout set.` : 'Add a link to enable cutouts.';
    delete linkStatus.dataset.state;
  } else if (activeLink && !currentInputMatchesActiveLink()) {
    linkStatus.dataset.state = 'pending';
    linkStatus.textContent = `Current ${activeLink.type} preview stays active. Preview this link to start its own fresh set.`;
  } else if (activeLink) {
    linkStatus.dataset.state = 'ready';
    linkStatus.textContent = `This ${activeLink.type} remains selected. Its cutouts stay separate from the singers.`;
  }
  renderStickers();
});

addCat.addEventListener('click', () => {
  if (!activeLink || !currentInputMatchesActiveLink() || stickers.length >= MAX_CUTOUTS) return;
  stickers.push({ id: ++nextStickerId });
  stickerSets.set(linkKey(activeLink), stickers);
  renderStickers();
  addCat.focus();
});

clearCutouts.addEventListener('click', () => {
  stickers = [];
  if (activeLink) stickerSets.set(linkKey(activeLink), stickers);
  renderStickers();
  addCat.focus();
});

window.CAT_PICKER_TEST = Object.freeze({ parseYouTubeUrl, maxCutouts: MAX_CUTOUTS });
renderStickers();
