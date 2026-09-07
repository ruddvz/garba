(() => {
  let playback = { songSources: {} };
  let nonstop = [];

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const sourceRank = { 'official-artist-channel': 6, 'artist-channel': 5, 'verified-label-channel': 4, 'verified-distributor-channel': 3, 'official-streaming-catalogue': 3, 'community-upload': 1 };

  async function fetchJson(path) {
    try {
      const response = await fetch(path, { cache: 'no-store' });
      return response.ok ? await response.json() : null;
    } catch {
      return null;
    }
  }

  function normaliseDiscoverySet(set) {
    const source = set.source || {};
    const lastKnownEnd = [...(set.segments || [])].reverse().find((segment) => Number.isFinite(segment.endSeconds))?.endSeconds || null;
    return {
      id: set.id,
      title: set.title,
      artist: Array.isArray(set.artists) ? set.artists.join(' & ') : (set.artist || ''),
      year: set.year,
      provider: source.provider,
      videoId: source.videoId,
      sourceUrl: source.url,
      sourceType: set.officiality || set.setType || source.provider,
      durationSeconds: set.durationSeconds || lastKnownEnd,
      genres: set.genres || [],
      featured: String(set.officiality || '').includes('official'),
      verified: set.officiality !== 'community-upload',
      segments: set.segments || [],
      linkedReleaseId: set.linkedReleaseId || null,
      notes: set.notes || '',
    };
  }

  async function loadData() {
    const [basePlayback, currentPlayback, legacyNonstop, setIndex] = await Promise.all([
      fetchJson('data/playback-sources.json'),
      fetchJson('data/playback-sources-current.json'),
      fetchJson('data/nonstop.json'),
      fetchJson('data/discovery/sets/index.json'),
    ]);

    playback = {
      songSources: {
        ...(basePlayback?.songSources || {}),
        ...(currentPlayback?.songSources || {}),
      },
    };

    const mergedSets = new Map();
    for (const set of legacyNonstop || []) mergedSets.set(set.id, { ...set, segments: set.segments || [] });

    if (setIndex?.chunks?.length) {
      const chunks = await Promise.all(setIndex.chunks.map((chunk) => fetchJson(`data/discovery/sets/${chunk}`)));
      for (const chunk of chunks) {
        for (const set of chunk?.sets || []) {
          const normalised = normaliseDiscoverySet(set);
          mergedSets.set(normalised.id, normalised);
        }
      }
    }
    nonstop = [...mergedSets.values()];
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .provider-overlay{position:fixed;inset:0;z-index:10000;background:rgba(8,9,16,.82);backdrop-filter:blur(18px);display:none;align-items:center;justify-content:center;padding:20px;color:#fff}
      .provider-overlay.open{display:flex}.provider-panel{width:min(920px,100%);max-height:min(860px,92vh);overflow:auto;background:rgba(19,21,35,.96);border:1px solid rgba(255,255,255,.14);border-radius:24px;box-shadow:0 30px 90px rgba(0,0,0,.55)}
      .provider-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.1);position:sticky;top:0;background:rgba(19,21,35,.96);z-index:2}.provider-head h2{margin:0;font:600 20px/1.2 system-ui}.provider-close{border:0;background:rgba(255,255,255,.08);color:#fff;width:38px;height:38px;border-radius:50%;font-size:22px;cursor:pointer}
      .provider-body{padding:18px 20px 22px}.provider-frame{aspect-ratio:16/9;width:100%;border:0;border-radius:18px;background:#000}.provider-frame.spotify{aspect-ratio:auto;height:352px}.provider-copy{margin:12px 0 0;color:rgba(255,255,255,.7);font:14px/1.5 system-ui}.provider-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}.provider-action{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 16px;border-radius:999px;background:#fff;color:#111;text-decoration:none;font:600 14px system-ui;border:0;cursor:pointer}.provider-action.secondary{background:rgba(255,255,255,.09);color:#fff}
      .nonstop-list{display:grid;gap:10px}.nonstop-item{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center;padding:14px 16px;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(255,255,255,.035)}.nonstop-item strong{display:block;font:600 15px/1.3 system-ui}.nonstop-item span{display:block;margin-top:4px;color:rgba(255,255,255,.6);font:13px/1.35 system-ui}.nonstop-play{border:0;border-radius:999px;min-height:38px;padding:0 14px;background:var(--accent,#d6b06f);color:#10111a;font:700 13px system-ui;cursor:pointer}
      .nonstop-nav-button{font:700 18px/1 system-ui}.provider-source-note{display:inline-block;margin-top:10px;padding:5px 9px;border-radius:999px;background:rgba(255,255,255,.07);color:rgba(255,255,255,.65);font:12px/1 system-ui}.provider-chapters{margin-top:18px}.provider-chapters h3{margin:0 0 10px;font:600 14px/1.3 system-ui;color:rgba(255,255,255,.82)}.provider-chapter-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.provider-chapter{display:flex;gap:10px;align-items:center;text-align:left;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.035);color:#fff;border-radius:12px;padding:9px 11px;cursor:pointer;font:13px/1.3 system-ui}.provider-chapter:hover,.provider-chapter:focus-visible{background:rgba(255,255,255,.09)}.provider-chapter-time{flex:0 0 auto;color:rgba(255,255,255,.5);font-variant-numeric:tabular-nums}.provider-chapter-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      @media(max-width:700px){.provider-overlay{padding:0;align-items:flex-end}.provider-panel{border-radius:24px 24px 0 0;max-height:88vh}.nonstop-item{grid-template-columns:1fr}.nonstop-play{width:100%}.provider-chapter-list{grid-template-columns:1fr}.provider-frame.spotify{height:352px}}
    `;
    document.head.append(style);
  }

  function ensureOverlay() {
    let overlay = document.getElementById('providerOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'providerOverlay';
    overlay.className = 'provider-overlay';
    overlay.innerHTML = `<section class="provider-panel" role="dialog" aria-modal="true" aria-labelledby="providerTitle"><header class="provider-head"><h2 id="providerTitle">Playback</h2><button class="provider-close" type="button" aria-label="Close">×</button></header><div class="provider-body" id="providerBody"></div></section>`;
    overlay.addEventListener('click', (event) => { if (event.target === overlay) closeOverlay(); });
    overlay.querySelector('.provider-close').addEventListener('click', closeOverlay);
    document.body.append(overlay);
    return overlay;
  }

  function closeOverlay() {
    const overlay = document.getElementById('providerOverlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    const body = document.getElementById('providerBody');
    if (body) body.innerHTML = '';
  }

  const formatTime = (seconds = 0) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

  function openYouTube({ videoId, startSeconds = 0, title = 'Garba', artist = '', sourceUrl, sourceType, segments = [], notes = '' }) {
    const overlay = ensureOverlay();
    const body = document.getElementById('providerBody');
    document.getElementById('providerTitle').textContent = title;
    const start = Math.max(0, Number(startSeconds) || 0);
    const baseWatchUrl = sourceUrl || `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    const joiner = baseWatchUrl.includes('?') ? '&' : '?';
    const watchUrl = `${baseWatchUrl}${start ? `${joiner}t=${start}s` : ''}`;
    const chapters = segments.length ? `<section class="provider-chapters"><h3>Jump to a song</h3><div class="provider-chapter-list">${segments.map((segment) => `<button class="provider-chapter" type="button" data-start="${Number(segment.startSeconds) || 0}"><span class="provider-chapter-time">${formatTime(Number(segment.startSeconds) || 0)}</span><span class="provider-chapter-title">${escapeHtml(segment.title)}</span></button>`).join('')}</div></section>` : '';
    body.innerHTML = `<iframe class="provider-frame" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&playsinline=1&rel=0${start ? `&start=${start}` : ''}" title="${escapeHtml(title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe><p class="provider-copy">${escapeHtml(artist)}${artist ? ' · ' : ''}Played from the cited YouTube source.${notes ? ` ${escapeHtml(notes)}` : ''}</p><span class="provider-source-note">${escapeHtml(sourceType || 'YouTube source')}</span>${chapters}<div class="provider-actions"><a class="provider-action" href="${escapeHtml(watchUrl)}" target="_blank" rel="noopener">Open on YouTube</a></div>`;
    body.querySelectorAll('.provider-chapter').forEach((button) => button.addEventListener('click', () => openYouTube({ videoId, startSeconds: Number(button.dataset.start) || 0, title, artist, sourceUrl, sourceType, segments, notes })));
    overlay.classList.add('open');
    document.getElementById('audio')?.pause();
  }

  function spotifyEmbedUrl(sourceUrl = '') {
    try {
      const url = new URL(sourceUrl);
      const parts = url.pathname.split('/').filter(Boolean).filter((part) => !part.startsWith('intl-'));
      const typeIndex = parts.findIndex((part) => ['track','album','playlist','episode','show'].includes(part));
      if (typeIndex < 0 || !parts[typeIndex + 1]) return null;
      return `https://open.spotify.com/embed/${parts[typeIndex]}/${parts[typeIndex + 1]}`;
    } catch {
      return null;
    }
  }

  function openSpotify({ sourceUrl, title = 'Garba', artist = '', sourceType, alternate }) {
    const embedUrl = spotifyEmbedUrl(sourceUrl);
    if (!embedUrl) return openExternalSource({ sourceUrl, title, artist, sourceType });
    const overlay = ensureOverlay();
    const body = document.getElementById('providerBody');
    document.getElementById('providerTitle').textContent = title;
    const alternateAction = alternate?.sourceUrl ? `<a class="provider-action secondary" href="${escapeHtml(alternate.sourceUrl)}" target="_blank" rel="noopener">Official alternate source</a>` : '';
    body.innerHTML = `<iframe class="provider-frame spotify" src="${escapeHtml(embedUrl)}" title="${escapeHtml(title)}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="eager"></iframe><p class="provider-copy">${escapeHtml(artist)}${artist ? ' · ' : ''}Played with the provider's official embedded player. Availability depends on the provider and listener account.</p><span class="provider-source-note">${escapeHtml(sourceType || 'Spotify catalogue')}</span><div class="provider-actions"><a class="provider-action" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">Open on Spotify</a>${alternateAction}</div>`;
    overlay.classList.add('open');
    document.getElementById('audio')?.pause();
  }

  function openExternalSource({ sourceUrl, title = 'Garba', artist = '', sourceType }) {
    const overlay = ensureOverlay();
    const body = document.getElementById('providerBody');
    document.getElementById('providerTitle').textContent = title;
    body.innerHTML = `<p class="provider-copy">${escapeHtml(artist)}${artist ? ' · ' : ''}This verified catalogue item uses an external provider that is not embedded here.</p><span class="provider-source-note">${escapeHtml(sourceType || 'External source')}</span><div class="provider-actions"><a class="provider-action" href="${escapeHtml(sourceUrl || '#')}" target="_blank" rel="noopener">Open source</a></div>`;
    overlay.classList.add('open');
  }

  function currentSongIdentity() {
    const params = new URLSearchParams(location.search);
    return { id: params.get('song'), title: document.getElementById('songTitle')?.textContent?.trim() || 'Garba song', artist: document.getElementById('songArtist')?.textContent?.trim() || '' };
  }

  function openProviderSearch(song) {
    const overlay = ensureOverlay();
    const body = document.getElementById('providerBody');
    document.getElementById('providerTitle').textContent = song.title;
    const query = encodeURIComponent(`${song.title} ${song.artist}`.trim());
    body.innerHTML = `<p class="provider-copy">A verified direct playable source has not been attached to this catalogue record yet. Search a provider rather than presenting an unverified stream.</p><div class="provider-actions"><a class="provider-action" href="https://www.youtube.com/results?search_query=${query}" target="_blank" rel="noopener">Find on YouTube</a><a class="provider-action secondary" href="https://open.spotify.com/search/${query}" target="_blank" rel="noopener">Find on Spotify</a><a class="provider-action secondary" href="https://music.apple.com/us/search?term=${query}" target="_blank" rel="noopener">Find on Apple Music</a></div>`;
    overlay.classList.add('open');
  }

  function playProvider(source, song) {
    if (source?.provider === 'youtube' && source.videoId) return openYouTube({ ...source, title: song.title, artist: song.artist });
    if (source?.provider === 'spotify' && source.sourceUrl) return openSpotify({ ...source, title: song.title, artist: song.artist });
    if (source?.sourceUrl) return openExternalSource({ ...source, title: song.title, artist: song.artist });
    return openProviderSearch(song);
  }

  function openNonstop() {
    const overlay = ensureOverlay();
    const body = document.getElementById('providerBody');
    document.getElementById('providerTitle').textContent = 'Nonstop Garba';
    const ordered = [...nonstop].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || (sourceRank[b.sourceType] || 0) - (sourceRank[a.sourceType] || 0) || (b.year || 0) - (a.year || 0));
    body.innerHTML = `<div class="nonstop-list">${ordered.map((set) => `<article class="nonstop-item"><div><strong>${escapeHtml(set.title)}</strong><span>${escapeHtml(set.artist)} · ${escapeHtml(set.year || '')}${set.durationSeconds ? ` · ${Math.round(set.durationSeconds / 60)} min` : ''}${set.segments?.length ? ` · ${set.segments.length} chapters` : ''}</span><span class="provider-source-note">${escapeHtml(set.sourceType || set.provider)}</span></div><button class="nonstop-play" type="button" data-nonstop-id="${escapeHtml(set.id)}">${set.provider === 'youtube' ? 'Play nonstop' : 'Open source'}</button></article>`).join('')}</div>`;
    body.querySelectorAll('[data-nonstop-id]').forEach((button) => button.addEventListener('click', () => {
      const set = nonstop.find((item) => item.id === button.dataset.nonstopId);
      if (!set) return;
      if (set.provider === 'youtube' && set.videoId) return openYouTube({ ...set, startSeconds: 0, segments: set.segments || [] });
      if (set.provider === 'spotify' && set.sourceUrl) return openSpotify(set);
      if (set.sourceUrl) window.open(set.sourceUrl, '_blank', 'noopener');
    }));
    overlay.classList.add('open');
  }

  function addNonstopButton() {
    const utilities = document.querySelector('.utilities');
    if (!utilities || document.getElementById('nonstopButton')) return;
    const button = document.createElement('button');
    button.id = 'nonstopButton';
    button.className = 'icon-button nonstop-nav-button';
    button.type = 'button';
    button.title = 'Nonstop Garba';
    button.setAttribute('aria-label', 'Browse nonstop Garba');
    button.textContent = '∞';
    button.addEventListener('click', openNonstop);
    utilities.prepend(button);
  }

  function interceptPlay(event) {
    const button = event.target.closest?.('#playButton, #miniPlay');
    if (!button) return;
    const audio = document.getElementById('audio');
    if (audio?.getAttribute('src')) return;
    const song = currentSongIdentity();
    const source = song.id ? playback.songSources?.[song.id] : null;
    event.preventDefault();
    event.stopImmediatePropagation();
    playProvider(source, song);
  }

  document.addEventListener('click', interceptPlay, true);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.getElementById('providerOverlay')?.classList.contains('open')) {
      event.stopImmediatePropagation();
      closeOverlay();
    }
  }, true);

  injectStyles();
  loadData().finally(() => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addNonstopButton, { once: true });
    else addNonstopButton();
  });
})();
