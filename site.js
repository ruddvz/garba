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

  const ensurePolishStyles = () => {
    if (document.querySelector('link[data-playgarba-polish]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/polish.css';
    link.dataset.playgarbaPolish = 'true';
    document.head.appendChild(link);
  };

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

  const markCurrentRoute = () => {
    const current = window.location.pathname.replace(/index\.html$/, '');
    document.querySelectorAll('.site-nav a[href^="/"]').forEach((link) => {
      const href = new URL(link.href, window.location.origin).pathname.replace(/index\.html$/, '');
      if (href === current) link.setAttribute('aria-current', 'page');
    });
  };

  const ensureFaqNavigation = () => {
    if (nav && !nav.querySelector('a[href="/faq/"]')) {
      const about = nav.querySelector('a[href="/about/"]');
      const faq = document.createElement('a');
      faq.href = '/faq/';
      faq.textContent = 'FAQ';
      if (about) nav.insertBefore(faq, about);
      else nav.insertBefore(faq, nav.querySelector('.nav-cta'));
      faq.addEventListener('click', closeMenu);
    }

    document.querySelectorAll('.footer-links').forEach((footer) => {
      if (footer.querySelector('a[href="/faq/"]') || footer.querySelector('a[href="faq/"]')) return;
      const about = footer.querySelector('a[href="/about/"], a[href="about/"]');
      const faq = document.createElement('a');
      faq.href = '/faq/';
      faq.textContent = 'FAQ';
      if (about) footer.insertBefore(faq, about);
      else footer.prepend(faq);
    });
  };

  const addMobileActionDock = () => {
    if (!document.body.classList.contains('interior-page') || document.querySelector('.mobile-action-dock')) return;
    const path = window.location.pathname;
    const secondary = path.startsWith('/install/')
      ? { href: '/how-to-use/', label: 'How to use' }
      : path.startsWith('/how-to-use/') || path.startsWith('/faq/') || path.startsWith('/about/')
        ? { href: '/install/', label: 'Install' }
        : { href: '/how-to-use/', label: 'Guide' };

    const dock = document.createElement('nav');
    dock.className = 'mobile-action-dock';
    dock.setAttribute('aria-label', 'Quick actions');
    dock.innerHTML = `
      <a class="dock-primary" href="https://live.playgarba.com/">Open player</a>
      <a class="dock-secondary" href="${secondary.href}">${secondary.label}</a>
    `;
    document.body.appendChild(dock);
  };

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

  ensurePolishStyles();
  ensureFaqNavigation();
  markCurrentRoute();
  addMobileActionDock();

  if ('requestIdleCallback' in window) requestIdleCallback(promoteAllArtwork, { timeout: 1800 });
  else window.setTimeout(promoteAllArtwork, 350);

  if (year) year.textContent = String(new Date().getFullYear());
  setHeaderState();
})();
