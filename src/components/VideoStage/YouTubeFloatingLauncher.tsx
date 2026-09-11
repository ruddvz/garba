import React from 'react';
import { usePlayback } from '../../engine/usePlayback';
import styles from './YouTubeFloatingLauncher.module.css';

interface YouTubeFloatingLauncherProps {
  isAboveMiniPlayer?: boolean;
}

export const YouTubeFloatingLauncher: React.FC<YouTubeFloatingLauncherProps> = ({
  isAboveMiniPlayer = false,
}) => {
  const { state, toggleVideoStage } = usePlayback();
  const song = state.currentSong;

  // Only show if the current track has a YouTube source and is not currently in full-screen mode
  if (!song?.youtubeId || state.isVideoFullscreen) {
    return null;
  }

  const isStageOpen = state.showVideoStage;

  return (
    <div
      className={`${styles.launcherWrapper} ${isAboveMiniPlayer ? styles.aboveMiniPlayer : ''}`}
      role="region"
      aria-label="YouTube Video Launcher"
    >
      <button
        type="button"
        className={`${styles.launcherBtn} ${isStageOpen ? styles.active : ''}`}
        onClick={() => toggleVideoStage()}
        title={isStageOpen ? 'Hide video stage (V)' : 'Watch video stage in mini-player (V)'}
        aria-label={isStageOpen ? 'Hide video stage' : 'Watch video stage in mini-player'}
        aria-expanded={isStageOpen}
      >
        <span className={styles.ytIconWrap} aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            className={styles.ytSvg}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
              fill="currentColor"
            />
            <polygon points="9.545 15.568 15.818 12 9.545 8.432" fill="rgba(18, 20, 36, 0.95)" />
          </svg>
        </span>

        <span className={styles.btnLabel}>{isStageOpen ? 'Hide Video' : 'Watch Video'}</span>

        {isStageOpen && <span className={styles.activeDot} aria-hidden="true" />}
        <kbd className={styles.shortcutHint} aria-hidden="true">
          V
        </kbd>
      </button>
    </div>
  );
};
