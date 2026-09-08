(() => {
  const $ = (id) => document.getElementById(id);
  const songTitle = $('songTitle');
  const playButton = $('playButton');

  let playAfterSelection = false;
  let continueProviderAfterNavigation = false;

  function providerIsOpen() {
    return Boolean(document.querySelector('#providerStage.open[aria-hidden="false"]'));
  }

  function rememberPlaybackIntent(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (target.closest('.song-copy')) {
      playAfterSelection = true;
      continueProviderAfterNavigation = false;
      return;
    }

    if (providerIsOpen() && target.closest('#prevButton, #nextButton, #miniPrev, #miniNext')) {
      continueProviderAfterNavigation = true;
      playAfterSelection = false;
    }
  }

  function resumeSelectedProviderIfNeeded() {
    const shouldStartSelectedSong = playAfterSelection;
    const shouldContinueProvider = continueProviderAfterNavigation;
    playAfterSelection = false;
    continueProviderAfterNavigation = false;

    if (!shouldStartSelectedSong && !shouldContinueProvider) return;

    queueMicrotask(() => {
      if (!playButton?.isConnected) return;
      playButton.click();
    });
  }

  document.addEventListener('click', rememberPlaybackIntent, { capture: true });

  if (songTitle) {
    new MutationObserver(resumeSelectedProviderIfNeeded)
      .observe(songTitle, { childList: true, characterData: true, subtree: true });
  }
})();
