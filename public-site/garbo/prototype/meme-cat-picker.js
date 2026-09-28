const MAX_CUTOUTS = 10;
const CUTOUTS = Object.freeze(Array.from({ length: MAX_CUTOUTS }, (_, index) => {
  const id = `face-${String(index + 1).padStart(2, '0')}`;
  return { id, image: `singers/meme-cats/${id}.webp` };
}));
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com']);
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const PLAYLIST_ID = /^[A-Za-z0-9_-]{10,64}$/;

const linkForm = document.querySelector('#linkForm');
const linkInput = document.querySelector('#youtubeUrl');
const linkStatus = document.querySelector('#linkStatus');
const cutoutOptions = document.querySelector('#cutoutOptions');
let activeLink = null;
let selectedIds = new Set();
const cutoutSets = new Map();

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
function render() {
  const matchesActive = linkKey(parseYouTubeUrl(linkInput.value)) === linkKey(activeLink);
  for (const button of cutoutOptions.querySelectorAll('[data-cutout-id]')) {
    const selected = selectedIds.has(button.dataset.cutoutId);
    button.setAttribute('aria-pressed', String(selected));
    button.setAttribute('aria-label', `${selected ? 'Remove' : 'Add'} face cutout ${Number(button.dataset.cutoutId.slice(-2))}`);
    button.disabled = !selected && (!activeLink || !matchesActive || selectedIds.size >= MAX_CUTOUTS);
    button.classList.toggle('is-selected', selected);
    button.querySelector('.state-mark').textContent = selected ? '✓' : '+';
  }
}

linkForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const parsed = parseYouTubeUrl(linkInput.value);
  if (!parsed) {
    linkInput.setAttribute('aria-invalid', 'true');
    linkStatus.textContent = 'Enter a valid YouTube video or playlist link.';
    return;
  }
  linkInput.removeAttribute('aria-invalid');
  const previousKey = linkKey(activeLink);
  const nextKey = linkKey(parsed);
  if (previousKey !== nextKey && activeLink) cutoutSets.set(previousKey, new Set(selectedIds));
  activeLink = parsed;
  selectedIds = new Set(cutoutSets.get(nextKey) || []);
  linkStatus.textContent = 'Link added.';
  render();
});
linkInput.addEventListener('input', () => {
  linkInput.removeAttribute('aria-invalid');
  render();
});
cutoutOptions.addEventListener('click', (event) => {
  const button = event.target.closest('[data-cutout-id]');
  if (!button || !activeLink || linkKey(parseYouTubeUrl(linkInput.value)) !== linkKey(activeLink)) return;
  const id = button.dataset.cutoutId;
  if (selectedIds.has(id)) selectedIds.delete(id);
  else if (selectedIds.size < MAX_CUTOUTS) selectedIds.add(id);
  cutoutSets.set(linkKey(activeLink), new Set(selectedIds));
  render();
});

for (const cutout of CUTOUTS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cutout-option';
  button.dataset.cutoutId = cutout.id;
  button.disabled = true;
  const face = document.createElement('img');
  face.src = cutout.image;
  face.alt = '';
  face.setAttribute('aria-hidden', 'true');
  const mark = document.createElement('span');
  mark.className = 'state-mark';
  mark.setAttribute('aria-hidden', 'true');
  button.append(face, mark);
  cutoutOptions.append(button);
}
render();
window.CAT_PICKER_TEST = Object.freeze({ parseYouTubeUrl, maxCutouts: MAX_CUTOUTS, cutoutIds: CUTOUTS.map(({ id }) => id) });
