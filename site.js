(() => {
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

  if (year) year.textContent = String(new Date().getFullYear());
  setHeaderState();
})();
