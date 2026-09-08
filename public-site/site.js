(() => {
  const playerParams = new Set(['song', 'genre', 'nonstop', 'queue', 'source']);
  const incoming = new URLSearchParams(window.location.search);

  if (incoming.has('browse')) {
    const target = new URL('https://live.playgarba.com/catalogue/');
    for (const [key, value] of incoming.entries()) {
      if (key !== 'browse') target.searchParams.append(key, value);
    }
    target.hash = window.location.hash;
    window.location.replace(target.toString());
    return;
  }

  if ([...playerParams].some((key) => incoming.has(key))) {
    window.location.replace(`https://live.playgarba.com/${window.location.search}${window.location.hash}`);
    return;
  }

  const header = document.querySelector('.site-header');
  const button = document.getElementById('menuButton');
  const nav = document.getElementById('siteNav');
  const year = document.getElementById('year');

  const setHeaderState = () => {
    header?.classList.toggle('scrolled', window.scrollY > 18 || document.body.classList.contains('interior-page'));
  };

  const closeMenu = () => {
    if (!button || !nav) return;
    button.setAttribute('aria-expanded', 'false');
    nav.classList.remove('open');
    document.body.style.overflow = '';
  };

  button?.addEventListener('click', () => {
    const isOpen = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!isOpen));
    nav?.classList.toggle('open', !isOpen);
    document.body.style.overflow = isOpen ? '' : 'hidden';
  });

  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  window.addEventListener('scroll', setHeaderState, { passive: true });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 980) closeMenu();
  });

  const current = window.location.pathname.replace(/index\.html$/, '');
  document.querySelectorAll('.site-nav a[href^="/"]').forEach((link) => {
    const href = new URL(link.href, window.location.origin).pathname.replace(/index\.html$/, '');
    if (href === current) link.setAttribute('aria-current', 'page');
  });

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
  ];

  const heroArtByPath = [
    ['/how-to-use/', '11-master-dark-courtyard.webp'],
    ['/install/', '07-dandiya-purple-courtyard.webp'],
    ['/faq/', '03-devotional-garba-courtyard.webp'],
    ['/about/', '14-gujarati-folk-courtyard.webp'],
    ['/live/', '05-fusion-gujarati-neon.webp'],
  ];

  const loadArtwork = (url, onReady) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = async () => {
      try { await image.decode?.(); } catch { /* Loaded pixels are already usable. */ }
      onReady(url);
    };
    image.src = url;
  };

  const promoteArtwork = () => {
    for (const [selector, file] of art) {
      const element = document.querySelector(selector);
      if (!element) continue;
      const url = `${artBase}${file}`;
      loadArtwork(url, (readyUrl) => {
        element.style.backgroundImage = `url("${readyUrl}")`;
        element.dataset.artworkQuality = '2k-webp';
      });
    }

    const pageHero = document.querySelector('.page-hero');
    if (pageHero) {
      const match = heroArtByPath.find(([path]) => window.location.pathname.startsWith(path));
      if (match) {
        const url = `${artBase}${match[1]}`;
        loadArtwork(url, (readyUrl) => {
          pageHero.style.setProperty('--page-hero-image', `url("${readyUrl}")`);
          pageHero.dataset.artworkQuality = '2k-webp';
        });
      }
    }
  };

  if ('requestIdleCallback' in window) requestIdleCallback(promoteArtwork, { timeout: 1400 });
  else window.setTimeout(promoteArtwork, 250);

  if (year) year.textContent = String(new Date().getFullYear());
  setHeaderState();
})();
