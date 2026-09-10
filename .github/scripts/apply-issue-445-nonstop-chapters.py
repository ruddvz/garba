from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one anchor, found {count}")
    return text.replace(old, new, 1)


runtime_path = Path("nonstop-browser.js")
source = runtime_path.read_text(encoding="utf-8")

source = replace_once(
    source,
    "    searchCore: null,\n    searchCorePromise: null,\n  };",
    "    searchCore: null,\n    searchCorePromise: null,\n    chapterObserver: null,\n    currentChapterIndex: -1,\n  };",
    "chapter state",
)

recording_anchor = "  function recordingPresentation(set) {"
chapter_helpers = r'''  function elapsedSecondsFromText(value) {
    const parts = String(value || '').trim().split(':').map((part) => Number(part));
    if ((parts.length !== 2 && parts.length !== 3) || parts.some((part) => !Number.isFinite(part) || part < 0)) return null;
    if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    return (parts[0] * 60) + parts[1];
  }

  function verifiedChaptersForSet(set) {
    const segments = Array.isArray(set?.segments) ? set.segments : [];
    if (!segments.length) return [];
    const chapters = segments.map((segment, sourceIndex) => ({
      title: String(segment?.title || '').trim(),
      startSeconds: Number(segment?.startSeconds),
      sourceIndex,
    }));
    const invalid = chapters.some((chapter, index) => !chapter.title
      || !Number.isFinite(chapter.startSeconds)
      || chapter.startSeconds < 0
      || (index > 0 && chapter.startSeconds <= chapters[index - 1].startSeconds));
    return invalid ? [] : chapters;
  }

  function currentChapterIndexFor(chapters, elapsedSeconds) {
    if (!Array.isArray(chapters) || !chapters.length || !Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) return -1;
    let current = -1;
    for (let index = 0; index < chapters.length; index += 1) {
      if (elapsedSeconds < chapters[index].startSeconds) break;
      current = index;
    }
    return current;
  }

  function chapterTimeLabel(seconds) {
    return formatTime(seconds) || '0:00';
  }

'''
source = replace_once(source, recording_anchor, chapter_helpers + recording_anchor, "chapter helpers")

source = replace_once(
    source,
    'display:grid;grid-template-rows:auto auto minmax(0,1fr)}',
    'display:grid;grid-template-rows:auto auto auto minmax(0,1fr)}',
    "browser chapter row",
)

list_css = '      .nonstop-browser-list{overflow:auto;padding:0 24px 18px;display:grid;gap:8px;overscroll-behavior:contain;scrollbar-gutter:stable}'
chapter_css = '''      .nonstop-chapters{padding:0 24px 12px;border-bottom:1px solid rgba(246,236,215,.08)}
      .nonstop-chapters[hidden]{display:none}
      .nonstop-chapters-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:0 0 8px}
      .nonstop-chapters-title{margin:0;font-size:12px;font-weight:650;letter-spacing:.08em;text-transform:uppercase;color:rgba(246,236,215,.76)}
      .nonstop-chapters-status{font-size:11px;line-height:1.2;color:rgba(246,236,215,.5);font-variant-numeric:tabular-nums}
      .nonstop-chapters-list{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;scroll-padding-inline:2px;overscroll-behavior-inline:contain}
      .nonstop-chapters-list::-webkit-scrollbar{display:none}
      .nonstop-chapter{flex:0 0 min(250px,70vw);min-height:54px;display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:9px;align-items:center;text-align:left;border:1px solid rgba(246,236,215,.09);border-radius:15px;background:rgba(255,255,255,.025);color:inherit;padding:9px 11px;cursor:pointer;transition:background .15s ease,border-color .15s ease,transform .15s ease}
      .nonstop-chapter:hover{background:rgba(255,255,255,.06);border-color:rgba(246,236,215,.18)}
      .nonstop-chapter:active{transform:scale(.995)}
      .nonstop-chapter.active{border-color:color-mix(in srgb,var(--accent) 68%,rgba(246,236,215,.18));background:color-mix(in srgb,var(--accent) 11%,rgba(255,255,255,.025))}
      .nonstop-chapter-index,.nonstop-chapter-time{font-size:11px;line-height:1;color:rgba(246,236,215,.58);font-variant-numeric:tabular-nums}
      .nonstop-chapter-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:600;line-height:1.25}
'''
source = replace_once(source, list_css, chapter_css + list_css, "chapter styles")

source = replace_once(
    source,
    "        .nonstop-browser-categories{padding:0 18px 12px;scroll-padding-inline:18px}\n        .nonstop-browser-list{padding:0 18px 18px}",
    "        .nonstop-browser-categories{padding:0 18px 12px;scroll-padding-inline:18px}\n        .nonstop-chapters{padding:0 18px 12px}\n        .nonstop-browser-list{padding:0 18px 18px}",
    "mobile chapter gutter",
)

source = replace_once(
    source,
    "        .nonstop-browser,.nonstop-browser-backdrop,.nonstop-set{transition:none!important}",
    "        .nonstop-browser,.nonstop-browser-backdrop,.nonstop-set,.nonstop-chapter{transition:none!important}",
    "reduced motion chapter",
)

source = replace_once(
    source,
    '      <nav class="nonstop-browser-categories" id="nonstopBrowserCategories" aria-label="Nonstop Garba categories"></nav>\n      <div class="nonstop-browser-list" id="nonstopBrowserList" aria-live="polite"></div>`;',
    '      <nav class="nonstop-browser-categories" id="nonstopBrowserCategories" aria-label="Nonstop Garba categories"></nav>\n      <section class="nonstop-chapters" id="nonstopBrowserChapters" hidden aria-labelledby="nonstopBrowserChaptersTitle"></section>\n      <div class="nonstop-browser-list" id="nonstopBrowserList" aria-live="polite"></div>`;',
    "chapter section markup",
)

background_anchor = "  function setBackgroundInert(inert) {"
chapter_runtime = r'''  function seekNonstopChapter(chapter, chapterIndex) {
    if (!state.activeSet || !chapter || !Number.isFinite(chapter.startSeconds)) return false;
    const chapters = verifiedChaptersForSet(state.activeSet);
    const current = chapters[chapterIndex];
    if (!current || current.startSeconds !== chapter.startSeconds || current.title !== chapter.title) return false;
    const sought = window.GARBA_YOUTUBE_PLAYER?.seekTo?.(current.startSeconds);
    if (!sought) {
      announce('This chapter could not be opened right now.');
      return false;
    }
    syncChapterState(current.startSeconds);
    announce(`Chapter ${chapterIndex + 1}: ${current.title}`);
    return true;
  }

  function syncChapterState(elapsedOverride = null) {
    const section = $('nonstopBrowserChapters');
    if (!section || section.hidden || !state.activeSet) return;
    const chapters = verifiedChaptersForSet(state.activeSet);
    if (!chapters.length) return;
    const observed = Number.isFinite(elapsedOverride)
      ? elapsedOverride
      : elapsedSecondsFromText($('elapsedTime')?.textContent);
    if (!Number.isFinite(observed)) return;
    const nextIndex = currentChapterIndexFor(chapters, observed);
    const alreadyCurrent = state.currentChapterIndex === nextIndex
      && section.querySelector(`[data-nonstop-chapter-index="${nextIndex}"][aria-current="true"]`);
    if (alreadyCurrent) return;
    state.currentChapterIndex = nextIndex;
    let activeButton = null;
    section.querySelectorAll('[data-nonstop-chapter-index]').forEach((button) => {
      const active = Number(button.dataset.nonstopChapterIndex) === nextIndex;
      button.classList.toggle('active', active);
      if (active) {
        button.setAttribute('aria-current', 'true');
        activeButton = button;
      } else {
        button.removeAttribute('aria-current');
      }
    });
    const status = $('nonstopBrowserChaptersStatus');
    if (status) status.textContent = nextIndex >= 0 ? `Chapter ${nextIndex + 1} of ${chapters.length}` : `${chapters.length} chapters`;
    activeButton?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  function renderChapterNavigation() {
    const section = $('nonstopBrowserChapters');
    if (!section) return;
    const chapters = state.activeSet ? verifiedChaptersForSet(state.activeSet) : [];
    state.currentChapterIndex = -1;
    if (!chapters.length) {
      section.hidden = true;
      section.replaceChildren();
      return;
    }

    const head = document.createElement('div');
    head.className = 'nonstop-chapters-head';
    const title = document.createElement('h3');
    title.id = 'nonstopBrowserChaptersTitle';
    title.className = 'nonstop-chapters-title';
    title.textContent = 'Chapters';
    const status = document.createElement('span');
    status.id = 'nonstopBrowserChaptersStatus';
    status.className = 'nonstop-chapters-status';
    status.textContent = `${chapters.length} chapters`;
    head.append(title, status);

    const list = document.createElement('div');
    list.className = 'nonstop-chapters-list';
    chapters.forEach((chapter, chapterIndex) => {
      const button = document.createElement('button');
      const time = chapterTimeLabel(chapter.startSeconds);
      button.type = 'button';
      button.className = 'nonstop-chapter';
      button.dataset.nonstopChapterIndex = String(chapterIndex);
      button.setAttribute('aria-label', `Jump to chapter ${chapterIndex + 1}, ${chapter.title}, at ${time}`);
      button.innerHTML = '<span class="nonstop-chapter-index"></span><span class="nonstop-chapter-title"></span><span class="nonstop-chapter-time"></span>';
      button.querySelector('.nonstop-chapter-index').textContent = String(chapterIndex + 1).padStart(2, '0');
      button.querySelector('.nonstop-chapter-title').textContent = chapter.title;
      button.querySelector('.nonstop-chapter-time').textContent = time;
      button.addEventListener('click', () => seekNonstopChapter(chapter, chapterIndex));
      list.append(button);
    });
    section.replaceChildren(head, list);
    section.hidden = false;
    syncChapterState();
  }

  function watchChapterTime() {
    const elapsed = $('elapsedTime');
    if (!elapsed || state.chapterObserver) return;
    state.chapterObserver = new MutationObserver(() => {
      if (state.activeSet && state.browserOpen) syncChapterState();
    });
    state.chapterObserver.observe(elapsed, { childList: true, characterData: true, subtree: true });
  }

'''
source = replace_once(source, background_anchor, chapter_runtime + background_anchor, "chapter runtime")

source = replace_once(
    source,
    "      state.activeSet = set;\n      state.activeTrack = track;\n      setMetadata(set);",
    "      state.activeSet = set;\n      state.activeTrack = track;\n      state.currentChapterIndex = -1;\n      setMetadata(set);",
    "chapter reset on start",
)

source = replace_once(
    source,
    "    state.activeSet = null;\n    state.activeTrack = null;\n    state.previousSession = null;",
    "    state.activeSet = null;\n    state.activeTrack = null;\n    state.previousSession = null;\n    state.currentChapterIndex = -1;",
    "chapter reset on exit",
)

source = replace_once(
    source,
    "    const list = $('nonstopBrowserList');\n    if (!list) return;\n    list.removeAttribute('aria-busy');",
    "    renderChapterNavigation();\n\n    const list = $('nonstopBrowserList');\n    if (!list) return;\n    list.removeAttribute('aria-busy');",
    "chapter render hook",
)

source = replace_once(
    source,
    "    watchGenreStrip();\n    watchMetadata();\n    document.addEventListener('click', captureMainNavigation, { capture: true });",
    "    watchGenreStrip();\n    watchMetadata();\n    watchChapterTime();\n    document.addEventListener('click', captureMainNavigation, { capture: true });",
    "chapter observer init",
)

runtime_path.write_text(source, encoding="utf-8")

validator_path = Path("scripts/lib/validate-nonstop-transport-ux.mjs")
validator = validator_path.read_text(encoding="utf-8")

marker_anchor = "  'album: recording.mediaAlbum',\n]) {"
marker_insert = """  'album: recording.mediaAlbum',
  'function verifiedChaptersForSet(set)',
  'segment?.startSeconds',
  'function currentChapterIndexFor(chapters, elapsedSeconds)',
  'function seekNonstopChapter(chapter, chapterIndex)',
  'window.GARBA_YOUTUBE_PLAYER?.seekTo?.(current.startSeconds)',
  'function renderChapterNavigation()',
  'id=\"nonstopBrowserChapters\" hidden',
  'data-nonstop-chapter-index',
  \"button.setAttribute('aria-current', 'true')\",
  'function watchChapterTime()',
  'state.chapterObserver.observe(elapsed, { childList: true, characterData: true, subtree: true })',
  'watchChapterTime();',
]) {"""
validator = replace_once(validator, marker_anchor, marker_insert, "validator chapter markers")

track_anchor = "const trackForSetStart = source.indexOf('function trackForSet(set)');"
chapter_guards = r'''const chapterBuilderStart = source.indexOf('function verifiedChaptersForSet(set)');
const chapterBuilderEnd = source.indexOf('\n  function ', chapterBuilderStart + 1);
const chapterBuilder = chapterBuilderStart >= 0
  ? source.slice(chapterBuilderStart, chapterBuilderEnd > chapterBuilderStart ? chapterBuilderEnd : undefined)
  : '';
if (!chapterBuilder) fail('Verified Nonstop chapter builder is missing');
if (!chapterBuilder.includes('segment?.startSeconds')) fail('Nonstop chapters must use published segment startSeconds');
if (!chapterBuilder.includes('segment?.title')) fail('Nonstop chapters must preserve published segment titles');
if (!chapterBuilder.includes('return invalid ? [] : chapters')) fail('Incomplete or non-monotonic chapter maps must fail closed');
for (const inferredBoundary of ['endSeconds', 'durationSeconds', 'tracklist']) {
  if (chapterBuilder.includes(inferredBoundary)) fail(`Nonstop chapter navigation must not infer boundaries from ${inferredBoundary}`);
}

const chapterSeekStart = source.indexOf('function seekNonstopChapter(chapter, chapterIndex)');
const chapterSeekEnd = source.indexOf('\n  function ', chapterSeekStart + 1);
const chapterSeek = chapterSeekStart >= 0
  ? source.slice(chapterSeekStart, chapterSeekEnd > chapterSeekStart ? chapterSeekEnd : undefined)
  : '';
if (!chapterSeek.includes('GARBA_YOUTUBE_PLAYER?.seekTo?.(current.startSeconds)')) fail('Chapter jumps must use the existing public YouTube seek contract');
for (const transport of ['#prevButton', '#nextButton', '#miniPrev', '#miniNext']) {
  if (chapterSeek.includes(transport)) fail(`Chapter jumps must not repurpose ordinary transport: ${transport}`);
}

'''
validator = replace_once(validator, track_anchor, chapter_guards + track_anchor, "validator chapter guards")

log_anchor = "console.log('✓ Nonstop queue accessibility state is reasserted when ordinary queue metadata changes');"
validator = replace_once(
    validator,
    log_anchor,
    log_anchor + "\nconsole.log('✓ verified Nonstop chapters fail closed on incomplete timestamps, track elapsed playback, and jump through the existing seek contract');",
    "validator chapter log",
)

validator_path.write_text(validator, encoding="utf-8")
