(() => {
  const app = document.getElementById('app');
  if (!app || window.GARBA_LOCAL_BACKGROUND) return;

  const DB_NAME = 'playgarba-local-media';
  const DB_VERSION = 1;
  const STORE_NAME = 'backgrounds';
  const BACKGROUND_KEY = 'player-background';
  const STYLE_ID = 'garbaLocalBackgroundStyles';
  const CONTROL_ID = 'garbaLocalBackgroundControl';

  const state = {
    objectUrl: '',
    fileName: '',
    persistent: false,
    picker: null,
    addButton: null,
    resetButton: null,
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
        background-position: center center !important;
        background-repeat: no-repeat !important;
      }
      .atmosphere-local-background {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 14px;
        padding-top: 12px;
        border-top: 1px solid rgba(246,236,215,.09);
      }
      .atmosphere-local-background-label {
        flex: 1 1 auto;
        min-width: 0;
        color: rgba(246,236,215,.78);
        font: 600 12px/1.2 var(--sans, system-ui);
      }
      .atmosphere-local-background-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 7px;
        flex: 0 0 auto;
      }
      .atmosphere-local-background-button {
        min-height: 34px;
        padding: 0 11px;
        border: 1px solid rgba(246,236,215,.13);
        border-radius: 999px;
        color: #f6ecd7;
        background: rgba(246,236,215,.055);
        font: 600 11px/1 var(--sans, system-ui);
        cursor: pointer;
      }
      .atmosphere-local-background-button:hover {
        background: rgba(246,236,215,.09);
      }
      .atmosphere-local-background-button:active {
        transform: scale(.98);
      }
      .atmosphere-local-background-button[hidden] {
        display: none !important;
      }
      .atmosphere-local-background-button:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 3px;
      }
      @media (max-width: 390px) {
        .atmosphere-local-background {
          align-items: flex-start;
          flex-direction: column;
          gap: 9px;
        }
        .atmosphere-local-background-actions {
          width: 100%;
          justify-content: flex-start;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .atmosphere-local-background-button:active { transform: none; }
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
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB unavailable'));
        return;
      }

      let request;
      try {
        request = indexedDB.open(DB_NAME, DB_VERSION);
      } catch (error) {
        reject(error);
        return;
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
          reject(error);
          return;
        }
        transaction.oncomplete = () => resolve(request?.result);
        transaction.onerror = () => reject(transaction.error || request?.error || new Error('Local background storage failed'));
        transaction.onabort = () => reject(transaction.error || new Error('Local background storage was cancelled'));
      });
    } finally {
      database.close();
    }
  }

  function readStoredBackground() {
    return withStore('readonly', (store) => store.get(BACKGROUND_KEY));
  }

  function saveStoredBackground(record) {
    return withStore('readwrite', (store) => store.put(record, BACKGROUND_KEY));
  }

  function deleteStoredBackground() {
    return withStore('readwrite', (store) => store.delete(BACKGROUND_KEY));
  }

  function releaseObjectUrl() {
    if (!state.objectUrl) return;
    URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = '';
  }

  function syncControls() {
    const active = app.dataset.customBackground === 'true';
    if (state.addButton) state.addButton.textContent = active ? 'Change image' : 'Add image';
    if (state.resetButton) state.resetButton.hidden = !active;
  }

  function applyBackgroundBlob(blob, fileName = '', { persistent = false, announceChange = true } = {}) {
    if (!(blob instanceof Blob) || !String(blob.type || '').startsWith('image/')) return false;

    releaseObjectUrl();
    const objectUrl = URL.createObjectURL(blob);
    state.objectUrl = objectUrl;
    state.fileName = fileName;
    state.persistent = persistent;
    app.style.setProperty('--garba-custom-background', `url("${objectUrl}")`);
    app.dataset.customBackground = 'true';
    syncControls();

    if (announceChange) {
      announce(persistent ? 'Background saved on this device.' : 'Background added for this session.');
    }
    return true;
  }

  function restoreBuiltInBackground() {
    releaseObjectUrl();
    state.fileName = '';
    state.persistent = false;
    app.style.removeProperty('--garba-custom-background');
    delete app.dataset.customBackground;
    syncControls();
  }

  async function chooseFile(file) {
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) {
      announce('Choose an image file.');
      return;
    }

    const blob = file.slice(0, file.size, file.type);
    applyBackgroundBlob(blob, file.name, { persistent: false, announceChange: false });

    try {
      await saveStoredBackground({
        blob,
        name: file.name || '',
        type: file.type || blob.type || '',
        updatedAt: Date.now(),
      });
      state.persistent = true;
      announce('Background saved on this device.');
    } catch {
      state.persistent = false;
      announce('Background added for this session.');
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
      if (!record?.blob || !String(record.blob.type || record.type || '').startsWith('image/')) return;
      applyBackgroundBlob(record.blob, record.name || '', { persistent: true, announceChange: false });
    } catch {
      // Private browsing and storage-disabled contexts still support a session-only image.
    }
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
      <span class="atmosphere-local-background-label">Background</span>
      <div class="atmosphere-local-background-actions">
        <button class="atmosphere-local-background-button" type="button" data-action="add-background">Add image</button>
        <button class="atmosphere-local-background-button" type="button" data-action="reset-background" hidden>Reset</button>
      </div>
      <input type="file" accept="image/*" data-local-background-picker hidden />
    `;

    const status = panel.querySelector('.atmosphere-status');
    if (status) panel.insertBefore(row, status);
    else panel.append(row);

    state.picker = row.querySelector('[data-local-background-picker]');
    state.addButton = row.querySelector('[data-action="add-background"]');
    state.resetButton = row.querySelector('[data-action="reset-background"]');

    state.addButton.addEventListener('click', () => state.picker.click());
    state.resetButton.addEventListener('click', () => void clearBackground());
    state.picker.addEventListener('change', () => {
      const file = state.picker.files?.[0] || null;
      state.picker.value = '';
      void chooseFile(file);
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
