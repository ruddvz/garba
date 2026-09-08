(() => {
  // Preserve every previously shared player deep link after playgarba.com becomes
  // the public site. Marketing/analytics query strings stay on the homepage, while
  // player state moves to the dedicated listening origin unchanged.
  const playerParams = new Set(['song', 'genre', 'browse', 'nonstop', 'queue', 'source']);
  const incoming = new URLSearchParams(window.location.search);
  if ([...playerParams].some((key) => incoming.has(key))) {
    window.location.replace(`https://live.playgarba.com/${window.location.search}${window.location.hash}`);
    return;
  }

  const header = document.querySelector('.site-header');
  const button = document.getElementById('menuButton');
  const nav = document.getElementById('siteNav');
  const year = document.getElementById('year');

  const setHeaderState = () => {
    header?.classList.toggle('scrolled', window.scrollY > 18);
  };

  const closeMenu = () => {
    if (!button || !nav) return;
    button.setAttribute('aria-expanded', 'false');
    nav.classList.remove('open');
    document.body.style.overflow = '';
  };

  button?.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!open));
    nav?.classList.toggle('open', !open);
    document.body.style.overflow = open ? '' : 'hidden';
  });

  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  window.addEventListener('scroll', setHeaderState, { passive: true });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 980) closeMenu();
  });

  // The marketing site ships reviewable SVG fallbacks so first paint never depends
  // on another hostname. Once the player host is available, progressively promote
  // the exact same 2K WebP visual library used by GARBA itself.
  const artBase = 'https://live.playgarba.com/assets/backgrounds/library/';
  const art = [
    ['.hero-art', '11-master-dark-courtyard.webp'],
    ['.world-traditional', '15-traditional-canopy-courtyard.webp'],
    ['.world-dandiya', '07-dandiya-purple-courtyard.webp'],
    ['.world-devotional', '03-devotional-garba-courtyard.webp'],
    ['.world-folk', '14-gujarati-folk-courtyard.webp'],
    ['.world-sanedo', '08-colourful-garba-courtyard-b.webp'],
    ['.world-fusion', '05-fusion-gujarati-neon.webp'],
    ['.nonstop-art', '04-colourful-garba-courtyard-a.webp'],
    ['.player-scene', '11-master-dark-courtyard.webp'],
  ];

  const promoteArtwork = (selector, file) => {
    const element = document.querySelector(selector);
    if (!element) return;
    const url = `${artBase}${file}`;
    const image = new Image();
    image.decoding = 'async';
    image.onload = async () => {
      try { await image.decode?.(); } catch { /* loaded pixels are already usable */ }
      element.style.backgroundImage = `url("${url}")`;
      element.dataset.artworkQuality = '2k-webp';
    };
    image.src = url;
  };

  const promoteAllArtwork = () => {
    for (const [selector, file] of art) promoteArtwork(selector, file);
  };

  if ('requestIdleCallback' in window) requestIdleCallback(promoteAllArtwork, { timeout: 1800 });
  else window.setTimeout(promoteAllArtwork, 350);

  if (year) year.textContent = String(new Date().getFullYear());
  setHeaderState();
})();
