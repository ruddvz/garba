(() => {
  const $ = (id) => document.getElementById(id);
  const toast = $('toast');
  const playButton = $('playButton');
  const miniPlay = $('miniPlay');
  const shareButton = $('shareButton');
  const audio = $('audio');
  const genreStrip = $('genreStrip');
  let songsPromise = null;

  function announce(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(announce.timer);
    announce.timer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function clearStaleInert() {
    document.querySelectorAll('[inert]').forEach((node) => node.removeAttribute('inert'));
  }

  function loadSongs() {
    if (!songsPromise) {
      songsPromise = fetch('data/songs.json', { cache: 'force-cache' })
        .then((response) => response.ok ? response.json() : [])
        .catch(() => []);
    }
    return songsPromise;
  }

  async function currentSong() {
    const songs = await loadSongs();
    const id = new URL(location.href).searchParams.get('song');
    if (id) {
      const found = songs.find((song) => song.id === id);
      if (found) return found;
    }
    const title = String($('songTitle')?.textContent || '').trim();
    const artist = String($('songArtist')?.textContent || '').trim();
    return songs.find((song) => song.title === title && song.artist === artist) || songs[0] || null;
  }

  async function fallbackPlay() {
    if (audio?.src) return;
    const song = await currentSong();
    if (!song || audio?.src) return;

    const url = song.playbackSourceUrl
      || (song.youtubeId ? `https://www.youtube.com/watch?v=${encodeURIComponent(song.youtubeId)}` : '');
    if (!url) {
      announce('This track does not have a playable source yet.');
      return;
    }

    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) location.href = url;
  }

  function interceptFallbackPlay(event) {
    if (audio?.src) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    fallbackPlay();
  }

  async function shareCurrent(event) {
    event.preventDefault();
    const song = await currentSong();
    const title = song?.title || String($('songTitle')?.textContent || 'GARBA').trim();
    const artist = song?.artist || String($('songArtist')?.textContent || '').trim();
    const url = new URL(location.href);
    url.searchParams.delete('browse');
    url.searchParams.delete('source');
    const text = artist ? `${title} by ${artist}` : title;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} · GARBA`, text, url: url.toString() });
        return;
      }
      await navigator.clipboard.writeText(url.toString());
      announce('Track link copied.');
    } catch (error) {
      if (error?.name !== 'AbortError') announce('Could not share this track.');
    }
  }

  genreStrip?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-static-genre="true"]');
    if (!button) return;
    const url = new URL(location.href);
    url.searchParams.set('genre', button.dataset.genre);
    url.searchParams.delete('song');
    location.assign(url.toString());
  });

  playButton?.addEventListener('click', interceptFallbackPlay, { capture: true });
  miniPlay?.addEventListener('click', interceptFallbackPlay, { capture: true });
  shareButton?.addEventListener('click', shareCurrent);

  window.addEventListener('pageshow', clearStaleInert);
  document.addEventListener('pointerdown', clearStaleInert, { capture: true, once: true });
  clearStaleInert();
})();
