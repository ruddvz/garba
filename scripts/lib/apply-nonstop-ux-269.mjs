import { readFile, writeFile } from 'node:fs/promises';

const file = 'nonstop-browser.js';
let source = await readFile(file, 'utf8');

function replaceOnce(before, after, label) {
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`Could not find ${label} marker`);
  source = source.replace(before, after);
}

replaceOnce(
`  function trackForSet(set) {\n    return {`,
`  function visualGenreForSet(set) {\n    const aliases = new Map([\n      ['traditional', 'traditional'],\n      ['traditional-garba', 'traditional'],\n      ['dandiya', 'dandiya'],\n      ['raas-dandiya', 'dandiya'],\n      ['devotional', 'devotional'],\n      ['mataji-devotional', 'devotional'],\n      ['folk', 'folk'],\n      ['folk-lokgeet', 'folk'],\n      ['sanedo', 'sanedo'],\n      ['fusion', 'fusion'],\n      ['electronic-fusion', 'fusion'],\n    ]);\n    for (const category of Array.isArray(set?.categories) ? set.categories : []) {\n      const visual = aliases.get(String(category).toLowerCase().trim());\n      if (visual) return visual;\n    }\n    const inferred = categoriesFor(set);\n    for (const visual of ['sanedo', 'dandiya', 'devotional', 'folk', 'fusion', 'traditional']) {\n      if (inferred.has(visual)) return visual;\n    }\n    return 'traditional';\n  }\n\n  function trackForSet(set) {\n    return {`,
  'trackForSet helper'
);

replaceOnce(
`      genre: 'traditional',`,
`      genre: visualGenreForSet(set),`,
  'hard-coded nonstop genre'
);

replaceOnce(
`  function syncButton() {\n    const button = $('nonstopButton');\n    if (!button) return;\n    const active = Boolean(state.activeSet);`,
`  function syncMainTransport(active) {\n    const queueButton = $('queueButton');\n    const queueBadge = $('queueBadge');\n    if (queueButton) {\n      if (active) {\n        queueButton.dataset.nonstopContext = 'true';\n        queueButton.title = 'Browse Nonstop Garba';\n        queueButton.setAttribute('aria-label', 'Browse Nonstop Garba sets');\n      } else if (queueButton.dataset.nonstopContext === 'true') {\n        delete queueButton.dataset.nonstopContext;\n        queueButton.title = 'Up next';\n        queueButton.setAttribute('aria-label', 'Show queue');\n      }\n    }\n    if (active) queueBadge?.classList.remove('show');\n\n    for (const id of ['prevButton', 'nextButton', 'miniPrev', 'miniNext']) {\n      const control = $(id);\n      if (!control) continue;\n      const previous = id === 'prevButton' || id === 'miniPrev';\n      if (active) {\n        control.dataset.nonstopContext = 'true';\n        control.title = 'Choose another Nonstop set';\n        control.setAttribute('aria-label', 'Choose another Nonstop set');\n      } else if (control.dataset.nonstopContext === 'true') {\n        delete control.dataset.nonstopContext;\n        control.removeAttribute('title');\n        control.setAttribute('aria-label', previous ? 'Previous song' : 'Next song');\n      }\n    }\n  }\n\n  function syncButton() {\n    const button = $('nonstopButton');\n    if (!button) return;\n    const active = Boolean(state.activeSet);\n    syncMainTransport(active);`,
  'syncButton transport hook'
);

replaceOnce(
`    if (target.closest('#prevButton, #nextButton, #miniPrev, #miniNext')) {\n      event.preventDefault();\n      event.stopImmediatePropagation();\n      announce('Nonstop Garba plays continuously. Pick another set from Nonstop to switch.');\n      return;\n    }`,
`    if (target.closest('#queueButton, #prevButton, #nextButton, #miniPrev, #miniNext')) {\n      event.preventDefault();\n      event.stopImmediatePropagation();\n      openBrowser();\n      return;\n    }`,
  'main navigation guard'
);

replaceOnce(
`  function init() {\n    injectStyles();`,
`  function captureNonstopKeyboard(event) {\n    if (!state.activeSet) return;\n    const target = event.target;\n    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;\n    if (event.code !== 'ArrowLeft' && event.code !== 'ArrowRight') return;\n    event.preventDefault();\n    event.stopImmediatePropagation();\n    openBrowser();\n  }\n\n  function init() {\n    injectStyles();`,
  'keyboard guard helper'
);

replaceOnce(
`    document.addEventListener('click', captureMainNavigation, { capture: true });\n    $('progress')?.addEventListener('input', captureSeek, { capture: true });`,
`    document.addEventListener('click', captureMainNavigation, { capture: true });\n    document.addEventListener('keydown', captureNonstopKeyboard, { capture: true });\n    $('progress')?.addEventListener('input', captureSeek, { capture: true });`,
  'keyboard listener'
);

await writeFile(file, source);
console.log('Applied issue #269 Nonstop transport and primary-genre UX patch.');
