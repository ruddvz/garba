(() => {
  const app = document.getElementById('app');
  if (!app || window.GARBA_LOCAL_BACKGROUND) return;

  const DB_NAME = 'playgarba-local-media';
  const DB_VERSION = 1;
  const STORE_NAME = 'backgrounds';
  const BACKGROUND_KEY = 'player-background';
  const STYLE_ID = 'garbaLocalBackgroundStyles';
  const CONTROL_ID = 'garbaLocalBackgroundControl';
  const LIBRARY_BASE = 'assets/backgrounds/library/';
  const LIBRARY_BACKGROUNDS = [
    ['01-bollywood-garba-courtyard.webp', 'Bollywood courtyard'],
    ['02-rhythmic-drums-courtyard-a.webp', 'Rhythmic drums courtyard'],
    ['03-devotional-garba-courtyard.webp', 'Devotional courtyard'],
    ['04-colourful-garba-courtyard-a.webp', 'Colourful courtyard'],
    ['05-fusion-gujarati-neon.webp', 'Gujarati neon'],
    ['06-fusion-abstract-neon.webp', 'Abstract neon'],
    ['07-dandiya-purple-courtyard.webp', 'Purple dandiya courtyard'],
    ['08-colourful-garba-courtyard-b.webp', 'Colourful garba courtyard'],
    ['09-warm-stage-courtyard.webp', 'Warm stage courtyard'],
    ['10-dandiya-silhouette-courtyard.webp', 'Dandiya silhouette courtyard'],
    ['11-master-dark-courtyard.webp', 'Dark courtyard'],
    ['12-rhythmic-drums-courtyard-b.webp', 'Rhythmic drums courtyard two'],
    ['13-traditional-marigold-courtyard.webp', 'Marigold courtyard'],
    ['14-gujarati-folk-courtyard.webp', 'Gujarati folk courtyard'],
    ['15-traditional-canopy-courtyard.webp', 'Traditional canopy courtyard'],
  ];

  const state = {
    objectUrl: '',
    fileName: '',
    persistent: false,
    picker: null,
    trigger: null,
    menu: null,
    resetButton: null,
    exploreButton: null,
    gallery: null,
    observer: null,
  };

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #app[data-custom-background="true"] .world-layer {
        background-image: var(--garba-custom-background) !important;
        background-size: cover !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
      }
      .atmosphere-local-background {
        display:flex;
        justify-content:flex-end;
        margin-top:14px;
        padding-top:12px;
        border-top:1px solid rgba(246,236,215,.09);
      }
      .atmosphere-local-background-control {
        position:relative;
        display:inline-flex;
      }
      .atmosphere-local-background-trigger,
      .atmosphere-local-background-action {
        min-height:34px;
        border:1px solid rgba(246,236,215,.13);
        border-radius:999px;
        color:#f6ecd7;
        background:rgba(246,236,215,.055);
        font:600 11px/1 var(--sans,system-ui);
        cursor:pointer;
        -webkit-tap-highlight-color:transparent;
      }
      .atmosphere-local-background-trigger {
        min-width:94px;
        padding:0 14px;
      }
      .atmosphere-local-background-trigger:hover,
      .atmosphere-local-background-action:hover {
        background:rgba(246,236,215,.09);
      }
      .atmosphere-local-background-trigger:active,
      .atmosphere-local-background-action:active {
        transform:scale(.98);
      }
      .atmosphere-local-background-trigger:focus-visible,
      .atmosphere-local-background-action:focus-visible,
      .atmosphere-local-background-thumb:focus-visible {
        outline:2px solid var(--accent);
        outline-offset:3px;
      }
      .atmosphere-local-background-menu {
        position:absolute;
        right:0;
        bottom:calc(100% + 8px);
        z-index:12;
        width:min(310px,calc(100vw - 44px));
        padding:7px;
        border:1px solid rgba(246,236,215,.12);
        border-radius:22px;
        background:rgba(17,15,20,.94);
        box-shadow:0 14px 38px rgba(0,0,0,.32);
        backdrop-filter:blur(16px);
        -webkit-backdrop-filter:blur(16px);
      }
      .atmosphere-local-background-menu[hidden],
      .atmosphere-local-background-gallery[hidden] {
        display:none !important;
      }
      .atmosphere-local-background-actions {
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:6px;
      }
      .atmosphere-local-background-action {
        width:100%;
        padding:0 12px;
        white-space:nowrap;
      }
      .atmosphere-local-background-action:disabled {
        opacity:.38;
        cursor:default;
        transform:none;
      }
      .atmosphere-local-background-action[aria-expanded="true"] {
        background:rgba(246,236,215,.12);
      }
      .atmosphere-local-background-gallery {
        display:grid;
        grid-template-columns:repeat(5,minmax(0,1fr));
        gap:6px;
        margin-top:7px;
        padding-top:7px;
        border-top:1px solid rgba(246,236,215,.08);
      }
      .atmosphere-local-background-thumb {
        aspect-ratio:1/.78;
        min-width:0;
        padding:0;
        border:1px solid rgba(246,236,215,.12);
        border-radius:12px;
        background-position:center;
        background-size:cover;
        cursor:pointer;
        -webkit-tap-highlight-color:transparent;
      }
      .atmosphere-local-background-thumb:hover {
        border-color:rgba(246,236,215,.34);
      }
      @media (max-width:390px) {
        .atmosphere-local-background-control,
        .atmosphere-local-background-trigger { width:100%; }
        .atmosphere-local-background-menu {
          left:0;
          right:auto;
          width:100%;
        }
      }
      @media (prefers-reduced-motion:reduce) {
        .atmosphere-local-background-trigger:active,
        .atmosphere-local-background-action:active { transform:none; }
      }
    `;
    document.head.append(style);
  }

  function announce(message) {
    const status = document.querySelector('#atmospherePanel .atmosphere-status');
    if (status) status.textContent = message;
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'));
      let request;
      try {
        request = indexedDB.open(DB_NAME, DB_VERSION);
      } catch (error) {
        return reject(error);
      }
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open local background storage'));
      request.onblocked = () => reject(new Error('Local background storage is blocked'));
    });
  }

  async function withStore(mode, operation) {
    const database = await openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        let request;
        try {
          request = operation(store);
        } catch (error) {
          return reject(error);
        }
        transaction.oncomplete = () => resolve(request?.result);
        transaction.onerror = () => reject(transaction.error || request?.error || new Error('Local background storage failed'));
        transaction.onabort = () => reject(transaction.error || new Error('Local background storage was cancelled'));
      });
    } finally {
      database.close();
    }
  }

  const readStoredBackground = () => withStore('readonly', (store) => store.get(BACKGROUND_KEY));
  const saveStoredBackground = (record) => withStore('readwrite', (store) => store.put(record, BACKGROUND_KEY));
  const deleteStoredBackground = () => withStore('readwrite', (store) => store.delete(BACKGROUND_KEY));

  function releaseObjectUrl() {
    if (!state.objectUrl) return;
    URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = '';
  }

  function syncControls() {
    if (state.resetButton) state.resetButton.disabled = app.dataset.customBackground !== 'true';
  }

  function closeMenu() {
    if (!state.menu) return;
    state.menu.hidden = true;
    state.trigger?.setAttribute('aria-expanded', 'false');
    if (state.gallery) state.gallery.hidden = true;
    state.exploreButton?.setAttribute('aria-expanded', 'false');
  }

  function applyBackground(value, fileName, source, persistent, message) {
    state.fileName = fileName;
    state.persistent = persistent;
    app.style.setProperty('--garba-custom-background', `url("${value}")`);
    app.dataset.customBackground = 'true';
    app.dataset.customBackgroundSource = source;
    syncControls();
    if (message) announce(message);
  }

  function applyBackgroundBlob(blob, fileName = '', { persistent = false, announceChange = true } = {}) {
    if (!(blob instanceof Blob) || !String(blob.type || '').startsWith('image/')) return false;
    releaseObjectUrl();
    state.objectUrl = URL.createObjectURL(blob);
    applyBackground(
      state.objectUrl,
      fileName,
      'upload',
      persistent,
      announceChange ? (persistent ? 'Background saved on this device.' : 'Background added for this session.') : '',
    );
    return true;
  }

  function applyLibraryBackground(fileName, { persistent = false, announceChange = true } = {}) {
    const match = LIBRARY_BACKGROUNDS.find(([file]) => file === fileName);
    if (!match) return false;
    releaseObjectUrl();
    applyBackground(
      `${LIBRARY_BASE}${match[0]}`,
      match[1],
      'library',
      persistent,
      announceChange ? (persistent ? 'Background saved on this device.' : 'Background selected for this session.') : '',
    );
    return true;
  }

  function restoreBuiltInBackground() {
    releaseObjectUrl();
    state.fileName = '';
    state.persistent = false;
    app.style.removeProperty('--garba-custom-background');
    delete app.dataset.customBackground;
    delete app.dataset.customBackgroundSource;
    syncControls();
  }

  async function chooseFile(file) {
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) return announce('Choose an image file.');
    const blob = file.slice(0, file.size, file.type);
    applyBackgroundBlob(blob, file.name, { announceChange: false });
    try {
      await saveStoredBackground({ kind: 'upload', blob, name: file.name || '', type: file.type || blob.type || '', updatedAt: Date.now() });
      state.persistent = true;
      announce('Background saved on this device.');
    } catch {
      state.persistent = false;
      announce('Background added for this session.');
    }
  }

  async function chooseLibraryBackground(fileName) {
    if (!applyLibraryBackground(fileName, { announceChange: false })) return;
    try {
      await saveStoredBackground({ kind: 'library', file: fileName, updatedAt: Date.now() });
      state.persistent = true;
      announce('Background saved on this device.');
    } catch {
      state.persistent = false;
      announce('Background selected for this session.');
    }
  }

  async function clearBackground() {
    restoreBuiltInBackground();
    try {
      await deleteStoredBackground();
      announce('PlayGarba background restored.');
    } catch {
      announce('PlayGarba background restored for this session.');
    }
  }

  async function restoreStoredBackground() {
    try {
      const record = await readStoredBackground();
      if (record?.kind === 'library' && typeof record.file === 'string') {
        applyLibraryBackground(record.file, { persistent: true, announceChange: false });
        return;
      }
      if (!record?.blob || !String(record.blob.type || record.type || '').startsWith('image/')) return;
      applyBackgroundBlob(record.blob, record.name || '', { persistent: true, announceChange: false });
    } catch {
      // Storage-disabled contexts still support session-only uploads and library choices.
    }
  }

  function libraryButtonsMarkup() {
    return LIBRARY_BACKGROUNDS.map(([file, label]) => `
      <button
        class="atmosphere-local-background-thumb"
        type="button"
        data-library-background="${file}"
        aria-label="${label}"
        title="${label}"
        style="background-image:url('${LIBRARY_BASE}${file}')"
      ></button>
    `).join('');
  }

  function mountControls() {
    if (document.getElementById(CONTROL_ID)) return true;
    const panel = document.getElementById('atmospherePanel');
    if (!panel) return false;

    const row = document.createElement('div');
    row.id = CONTROL_ID;
    row.className = 'atmosphere-local-background';
    row.setAttribute('aria-label', 'Background image');
    row.innerHTML = `
      <div class="atmosphere-local-background-control">
        <button class="atmosphere-local-background-trigger" type="button" aria-haspopup="menu" aria-expanded="false" data-action="toggle-background-menu">Background</button>
        <div class="atmosphere-local-background-menu" role="menu" hidden>
          <div class="atmosphere-local-background-actions">
            <button class="atmosphere-local-background-action" type="button" role="menuitem" data-action="upload-background">Upload</button>
            <button class="atmosphere-local-background-action" type="button" role="menuitem" data-action="reset-background" disabled>Reset</button>
            <button class="atmosphere-local-background-action" type="button" role="menuitem" aria-expanded="false" data-action="explore-backgrounds">Explore</button>
          </div>
          <div class="atmosphere-local-background-gallery" aria-label="Explore backgrounds" hidden>${libraryButtonsMarkup()}</div>
        </div>
        <input type="file" accept="image/*" data-local-background-picker hidden />
      </div>
    `;

    const status = panel.querySelector('.atmosphere-status');
    if (status) panel.insertBefore(row, status);
    else panel.append(row);

    state.picker = row.querySelector('[data-local-background-picker]');
    state.trigger = row.querySelector('[data-action="toggle-background-menu"]');
    state.menu = row.querySelector('.atmosphere-local-background-menu');
    state.resetButton = row.querySelector('[data-action="reset-background"]');
    state.exploreButton = row.querySelector('[data-action="explore-backgrounds"]');
    state.gallery = row.querySelector('.atmosphere-local-background-gallery');

    state.trigger.addEventListener('click', () => {
      const opening = state.menu.hidden;
      closeMenu();
      if (opening) {
        state.menu.hidden = false;
        state.trigger.setAttribute('aria-expanded', 'true');
      }
    });
    row.querySelector('[data-action="upload-background"]').addEventListener('click', () => {
      closeMenu();
      state.picker.click();
    });
    state.resetButton.addEventListener('click', () => {
      closeMenu();
      void clearBackground();
    });
    state.exploreButton.addEventListener('click', () => {
      const opening = state.gallery.hidden;
      state.gallery.hidden = !opening;
      state.exploreButton.setAttribute('aria-expanded', String(opening));
    });
    state.gallery.addEventListener('click', (event) => {
      const button = event.target.closest('[data-library-background]');
      if (!button) return;
      closeMenu();
      void chooseLibraryBackground(button.dataset.libraryBackground || '');
    });
    state.picker.addEventListener('change', () => {
      const file = state.picker.files?.[0] || null;
      state.picker.value = '';
      void chooseFile(file);
    });

    document.addEventListener('pointerdown', (event) => {
      if (!row.contains(event.target)) closeMenu();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      closeMenu();
      state.trigger?.focus();
    });

    syncControls();
    return true;
  }

  function watchForAtmospherePanel() {
    if (mountControls()) return;
    state.observer = new MutationObserver(() => {
      if (!mountControls()) return;
      state.observer?.disconnect();
      state.observer = null;
    });
    state.observer.observe(document.body, { childList: true, subtree: true });
  }

  injectStyles();
  watchForAtmospherePanel();
  void restoreStoredBackground();

  window.GARBA_LOCAL_BACKGROUND = {
    get active() { return app.dataset.customBackground === 'true'; },
    get persistent() { return state.persistent; },
    get fileName() { return state.fileName; },
    pick() { state.picker?.click(); },
    clear: clearBackground,
  };
})();
