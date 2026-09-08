(() => {
  if (document.body?.dataset.page !== 'install') return;

  const ua = navigator.userAgent || '';
  const isIPadDesktopMode = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const platform = /iPhone|iPad|iPod/i.test(ua) || isIPadDesktopMode
    ? 'ios'
    : /Android/i.test(ua)
      ? 'android'
      : 'desktop';

  document.documentElement.dataset.platform = platform;

  const readout = document.getElementById('platformReadout');
  const title = document.getElementById('platformTitle');
  const copy = document.getElementById('platformCopy');
  const badge = document.getElementById('platformBadge');

  const guidance = {
    ios: {
      title: 'iPhone or iPad detected',
      copy: 'Open the live player in Safari, then use Share → Add to Home Screen → Open as Web App.',
      badge: 'Safari route',
    },
    android: {
      title: 'Android detected',
      copy: 'Open the live player in Chrome, then use the browser menu to install the PlayGarba web app.',
      badge: 'Chrome route',
    },
    desktop: {
      title: 'Desktop browser detected',
      copy: 'Open the live player in Chrome or Edge and use the browser install command for an app-style window.',
      badge: 'Desktop route',
    },
  };

  const selected = guidance[platform];
  if (readout && title && copy && badge && selected) {
    title.textContent = selected.title;
    copy.textContent = selected.copy;
    badge.textContent = selected.badge;
    readout.hidden = false;
  }
})();
