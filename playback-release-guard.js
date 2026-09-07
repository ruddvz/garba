(() => {
  const audio = document.getElementById('audio');
  const playButton = document.getElementById('playButton');
  const songTitle = document.getElementById('songTitle');
  const songSheet = document.getElementById('songSheet');
  const toast = document.getElementById('toast');

  const providerNames = {
    youtube: 'YouTube',
    spotify: 'Spotify',
    'apple-music': 'Apple Music',
    'amazon-music': 'Amazon Music',
    qobuz: 'Qobuz',
    bandcamp: 'Bandcamp',
    soundcloud: 'SoundCloud',
    external: 'provider',
  };

  const state = {
    sources: {},
    ready: false,
    loading: null,
    active: false,
  };

  async function fetchJson(path) {
    try {
      const response = await fetch(path, { cache: 'no-store' });
      return response.ok ? await response.json() : null;
    } catch {
      return null;
    }
  }

  function currentSongId() {
    return new URLSearchParams(location.search).get('song');
  }

  function isReleaseFallback(source) {
    return String(source?.sourceType || '').toLowerCase() === 'verified-release-source';
  }

  function providerName(provider = '') {
    const key = String(provider).toLowerCase();
    return providerNames[key] || key.replace(/(^|-)([a-z])/g, (_, prefix, letter) => `${prefix ? ' ' : ''}${letter.toUpperCase()}`) || 'provider';
  }

  function announce(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(announce.timer);
    announce.timer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function ensureStage() {
    let stage = document.getElementById('providerStage');
    if (stage) return stage;

    stage = document.createElement('section');
    stage.id = 'providerStage';
    stage.className = 'provider-dock';
    stage.setAttribute('aria-label', 'Verified provider source');
    stage.setAttribute('aria-hidden', 'true');
    stage.innerHTML = `
      <div class="provider-media" id="providerMedia"></div>
      <div class="provider-dock-bar">
        <span id="providerDockNote">Verified release</span>
        <button type="button" id="providerDockStop" aria-label="Close provider source">Close</button>
      </div>`;
    document.body.append(stage);
    stage.querySelector('#providerDockStop')?.addEventListener('click', closeRelease);
    return stage;
  }

  function releaseEmbed(source) {
    const provider = String(source?.provider || '').toLowerCase();
    const sourceUrl = String(source?.sourceUrl || '');

    try {
      if (provider === 'spotify' && sourceUrl) {
        const url = new URL(sourceUrl);
        const parts = url.pathname.split('/').filter(Boolean).filter((part) => !part.startsWith('intl-'));
        const index = parts.findIndex((part) => ['track', 'album', 'playlist', 'episode', 'show'].includes(part));
        if (index >= 0 && parts[index + 1]) {
          return {
            src: `https://open.spotify.com/embed/${parts[index]}/${parts[index + 1]}?utm_source=generator&theme=0`,
            title: 'Spotify verified release',
            className: 'is-spotify',
            allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',
          };
        }
      }

      if (provider === 'apple-music' && sourceUrl) {
        const url = new URL(sourceUrl);
        if (url.hostname === 'music.apple.com' || url.hostname.endsWith('.music.apple.com')) {
          url.hostname = 'embed.music.apple.com';
          return {
            src: url.toString(),
            title: 'Apple Music verified release',
            className: 'is-apple',
            allow: 'autoplay *; encrypted-media *; fullscreen *',
          };
        }
      }

      if (provider === 'youtube' && source?.videoId) {
        const params = new URLSearchParams({ playsinline: '1', controls: '1', rel: '0' });
        return {
          src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(source.videoId)}?${params.toString()}`,
          title: 'YouTube verified release',
          className: 'is-youtube-release',
          allow: 'autoplay; encrypted-media; picture-in-picture',
        };
      }
    } catch {
      return null;
    }

    return null;
  }

  function closeRelease() {
    if (!state.active) return;
    const stage = document.getElementById('providerStage');
    const media = document.getElementById('providerMedia');
    stage?.classList.remove('open', 'is-release', 'is-spotify', 'is-apple', 'is-youtube-release', 'is-external');
    stage?.setAttribute('aria-hidden', 'true');
    media?.replaceChildren();
    state.active = false;
  }

  function openRelease(source) {
    if (!navigator.onLine) {
      announce('You are offline. Verified release sources need an internet connection.');
      return;
    }

    audio?.pause();
    const stage = ensureStage();
    const media = stage.querySelector('#providerMedia');
    const note = stage.querySelector('#providerDockNote');
    const name = providerName(source.provider);
    const title = String(songTitle?.textContent || 'this track').trim();

    stage.classList.remove('is-spotify', 'is-apple', 'is-youtube-release', 'is-external');
    stage.classList.add('open', 'is-release');
    stage.setAttribute('aria-hidden', 'false');
    if (note) note.textContent = `Verified release on ${name} · select “${title}”`;

    const embed = releaseEmbed(source);
    if (embed) {
      stage.classList.add(embed.className);
      const iframe = document.createElement('iframe');
      iframe.title = embed.title;
      iframe.src = embed.src;
      iframe.allow = embed.allow;
      iframe.loading = 'eager';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      if (String(source.provider).toLowerCase() === 'youtube') iframe.setAttribute('allowfullscreen', '');
      media.replaceChildren(iframe);
    } else {
      stage.classList.add('is-external');
      const card = document.createElement('div');
      card.className = 'provider-external';
      const heading = document.createElement('strong');
      heading.textContent = `Verified release on ${name}`;
      const copy = document.createElement('span');
      copy.textContent = `GARBA has verified the release containing “${title}”, but not a song-specific stream. Open the provider and select the track there.`;
      card.append(heading, copy);
      if (source.sourceUrl) {
        const action = document.createElement('a');
        action.className = 'provider-external-action';
        action.href = source.sourceUrl;
        action.target = '_blank';
        action.rel = 'noopener';
        action.textContent = `Open ${name}`;
        card.append(action);
      }
      media.replaceChildren(card);
    }

    state.active = true;
  }

  async function routeRelease(button) {
    await state.loading;
    if (audio?.getAttribute('src')) return false;
    const source = state.sources[currentSongId()] || null;
    if (!isReleaseFallback(source)) return false;
    openRelease(source);
    return true;
  }

  function interceptPlay(event) {
    const button = event.target.closest?.('#playButton, #miniPlay');
    if (!button || audio?.getAttribute('src')) return;
    const source = state.sources[currentSongId()] || null;
    if (state.ready && !isReleaseFallback(source)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    routeRelease(button).then((handled) => {
      if (!handled) {
        button.dataset.garbaReleaseGuardBypass = '1';
        button.click();
      }
    });
  }

  function interceptBypass(event) {
    const button = event.target.closest?.('#playButton, #miniPlay');
    if (!button || button.dataset.garbaReleaseGuardBypass !== '1') return false;
    delete button.dataset.garbaReleaseGuardBypass;
    return true;
  }

  function captureClick(event) {
    if (interceptBypass(event)) return;
    interceptPlay(event);
  }

  function interceptSpace(event) {
    if (event.code !== 'Space' || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target?.isContentEditable) return;
    if (audio?.getAttribute('src')) return;
    const source = state.sources[currentSongId()] || null;
    if (state.ready && !isReleaseFallback(source)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    routeRelease(playButton).then((handled) => {
      if (!handled) {
        playButton.dataset.garbaReleaseGuardBypass = '1';
        playButton.click();
      }
    });
  }

  async function loadSources() {
    const index = await fetchJson('data/catalogue/index.json');
    const configured = index?.playbackSources || [
      'data/playback-sources-generated.json',
      'data/playback-sources.json',
      'data/playback-sources-current.json',
    ];
    const paths = Array.isArray(configured) ? configured : [configured];
    const manifests = await Promise.all(paths.filter(Boolean).map(fetchJson));
    state.sources = Object.assign({}, ...manifests.map((manifest) => manifest?.songSources || {}));
    state.ready = true;
  }

  window.addEventListener('click', captureClick, true);
  window.addEventListener('keydown', interceptSpace, true);

  if (songTitle) {
    new MutationObserver(closeRelease).observe(songTitle, { childList: true, characterData: true, subtree: true });
  }
  if (songSheet) {
    new MutationObserver(() => {
      if (songSheet.getAttribute('aria-hidden') === 'false' && matchMedia('(max-width: 700px)').matches) closeRelease();
    }).observe(songSheet, { attributes: true, attributeFilter: ['aria-hidden'] });
  }
  window.addEventListener('offline', closeRelease);

  state.loading = loadSources().catch(() => { state.ready = true; });
  window.GARBA_RELEASE_GUARD = {
    get ready() { return state.ready; },
    sourceFor(songId) { return state.sources[songId] || null; },
    isReleaseFallback,
  };
})();
