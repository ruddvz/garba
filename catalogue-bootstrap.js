(() => {
  const nativeFetch = window.fetch.bind(window);
  const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };

  const BOOT_GENRES = [
    { id: 'traditional', name: 'Traditional', label: 'Traditional Garba', background: 'assets/backgrounds/traditional.svg', accent: '#d6b06f' },
    { id: 'dandiya', name: 'Dandiya', label: 'Dandiya Raas', background: 'assets/backgrounds/dandiya.svg', accent: '#a77ad6' },
    { id: 'devotional', name: 'Devotional', label: 'Devotional Garba', background: 'assets/backgrounds/devotional.svg', accent: '#c78372' },
    { id: 'folk', name: 'Folk', label: 'Gujarati Folk', background: 'assets/backgrounds/folk.svg', accent: '#9a9fc7' },
    { id: 'sanedo', name: 'Sanedo', label: 'Sanedo', background: 'assets/backgrounds/sanedo.svg', accent: '#c99872' },
    { id: 'fusion', name: 'Fusion', label: 'Modern Fusion Garba', background: 'assets/backgrounds/fusion.svg', accent: '#a78bc4' },
  ];

  // One real catalogue entry per visual genre. This tiny in-memory set exists only
  // so the player can become interactive immediately. The complete generated
  // catalogue replaces it in the background as soon as data/songs.json arrives.
  const BOOT_SONGS = [
    {
      id: 'ochhav-2023-01-ochhav-theme', title: 'Ochhav Theme', artist: 'Aditya Gadhvi', genre: 'traditional', durationSeconds: 79,
      youtubeId: 'V4f5I_xJVoA', youtubeStartSeconds: 0, playbackProvider: 'youtube',
      playbackSourceUrl: 'https://www.youtube.com/watch?v=V4f5I_xJVoA', playbackSourceType: 'official-artist-channel', playbackReady: true,
    },
    {
      id: 'dholida-gangubai-2022', title: 'Dholida',
      artist: 'Janhvi Shrimankar, Shail Hada, Dipti, Pragati, Rucha, Arohi, Archana, Sanjay Leela Bhansali',
      genre: 'dandiya', durationSeconds: 179, youtubeId: 'uv9Dv6fzg9w', youtubeStartSeconds: 0, playbackProvider: 'youtube',
      playbackSourceUrl: 'https://www.youtube.com/watch?v=uv9Dv6fzg9w', playbackSourceType: 'verified-label-channel', playbackReady: true,
    },
    {
      id: 'ramzat-2017-01-sachi-re-mari-chhand-charni-sapakharu', title: 'Sachi Re Mari - Chhand - Charni Sapakharu',
      artist: 'Veera Raval, Osman Mir, Bhoomi Trivedi & Himanshu Chauhan', genre: 'devotional', durationSeconds: 204,
      youtubeId: 'qRBix85kgvI', youtubeStartSeconds: 0, playbackProvider: 'youtube',
      playbackSourceUrl: 'https://www.youtube.com/watch?v=qRBix85kgvI', playbackSourceType: 'verified-release-source', playbackReady: true,
    },
    {
      id: 'charan-kanya-aditya-gadhvi-2022', title: 'Charan Kanya - Swarotsav 2019', artist: 'Aditya Gadhvi', genre: 'folk', durationSeconds: null,
      youtubeId: 'Tu9cLEYEvoc', youtubeStartSeconds: 0, playbackProvider: 'youtube',
      playbackSourceUrl: 'https://www.youtube.com/watch?v=Tu9cLEYEvoc', playbackSourceType: 'official-artist-channel', playbackReady: true,
    },
    {
      id: 'sanedo-sanedo-2007-01-rang-pichkari', title: 'Rang Pichkari',
      artist: 'Achal Maheta, Sargam Vyash, Ansh Maheta, Shilpa Aiyyar, Piyush Parmar & Pratiksha Desai',
      genre: 'sanedo', durationSeconds: null, playbackProvider: 'apple-music',
      playbackSourceUrl: 'https://music.apple.com/us/album/sanedo-sanedo/581651148', playbackSourceType: 'verified-release-source', playbackReady: true,
    },
    {
      id: 'khamma-2-2024-01-khamma-2-hiphop-garba', title: 'Khamma 2 (HipHop Garba)',
      artist: 'Aghori Muzik, Geeta Rabari, Anushka Pandit & Dharmesh Barot', genre: 'fusion', durationSeconds: 3377,
      youtubeId: '0U3i-GuKZoE', youtubeStartSeconds: 0, playbackProvider: 'youtube',
      playbackSourceUrl: 'https://www.youtube.com/watch?v=0U3i-GuKZoE', playbackSourceType: 'verified-release-source', playbackReady: true,
    },
  ];

  let fullSongsText = null;
  let fullLoadPromise = null;
  let catalogueAnnounced = false;

  function requestPath(input) {
    try {
      const raw = typeof input === 'string' ? input : input?.url;
      if (!raw) return '';
      return new URL(raw, location.href).pathname;
    } catch {
      return '';
    }
  }

  const isSongsRequest = (input) => requestPath(input).endsWith('/data/songs.json');
  const isGenresRequest = (input) => requestPath(input).endsWith('/data/genres.json');
  const jsonResponse = (value) => new Response(typeof value === 'string' ? value : JSON.stringify(value), { status: 200, headers: JSON_HEADERS });

  function showReadyShell() {
    const app = document.getElementById('app');
    if (app) {
      app.dataset.loading = 'false';
      app.setAttribute('aria-busy', 'false');
    }

    const eyebrow = document.getElementById('genreEyebrow');
    const title = document.getElementById('songTitle');
    const artist = document.getElementById('songArtist');
    const duration = document.getElementById('durationTime');

    if (eyebrow && /loading catalogue/i.test(eyebrow.textContent || '')) eyebrow.textContent = 'Traditional Garba';
    if (title && /loading garba/i.test(title.textContent || '')) title.textContent = 'Ochhav Theme';
    if (artist && /preparing the collection/i.test(artist.textContent || '')) artist.textContent = 'Aditya Gadhvi';
    if (duration && duration.textContent === '0:00') duration.textContent = '1:19';
  }

  function announceFullCatalogue() {
    if (catalogueAnnounced || !fullSongsText) return;
    catalogueAnnounced = true;
    const fire = () => setTimeout(() => window.dispatchEvent(new Event('online')), 0);
    if (document.readyState === 'complete') fire();
    else window.addEventListener('load', fire, { once: true });
  }

  function startFullCatalogueLoad() {
    if (fullLoadPromise) return fullLoadPromise;

    fullLoadPromise = (async () => {
      try {
        const url = new URL('data/songs.json', location.href);
        url.searchParams.set('full', String(Date.now()));
        const response = await nativeFetch(url.toString(), { cache: 'no-store' });
        if (!response.ok) throw new Error(`Full catalogue failed (${response.status})`);
        const text = await response.text();
        const songs = JSON.parse(text);
        if (!Array.isArray(songs) || songs.length < BOOT_SONGS.length) throw new Error('Full catalogue payload is invalid');
        fullSongsText = text;
        announceFullCatalogue();
        return true;
      } catch (error) {
        console.warn('Full catalogue will retry later; instant player remains available.', error);
        fullLoadPromise = null;
        return false;
      }
    })();

    return fullLoadPromise;
  }

  window.fetch = async (input, init) => {
    if (isGenresRequest(input)) return jsonResponse(BOOT_GENRES);

    if (isSongsRequest(input)) {
      if (fullSongsText) return jsonResponse(fullSongsText);
      startFullCatalogueLoad();
      return jsonResponse(BOOT_SONGS);
    }

    return nativeFetch(input, init);
  };

  // Release the skeleton synchronously, before the module player starts. This
  // makes the first screen deterministic even on a slow iPhone connection.
  showReadyShell();

  // Fetch the 1k+ song catalogue after first paint. It never blocks the player.
  if ('requestIdleCallback' in window) requestIdleCallback(() => startFullCatalogueLoad(), { timeout: 500 });
  else setTimeout(() => startFullCatalogueLoad(), 50);
})();
