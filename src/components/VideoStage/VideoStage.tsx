import React from 'react';
import { usePlayback } from '../../engine/usePlayback';
import { X, Tv, Maximize2, Minimize2 } from 'lucide-react';
import styles from './VideoStage.module.css';

export const VideoStage: React.FC = () => {
  const { state, toggleVideoStage, toggleVideoFullscreen } = usePlayback();
  const song = state.currentSong;

  if (!state.showVideoStage || !song?.youtubeId) return null;

  const isFullscreen = state.isVideoFullscreen;

  return (
    <aside
      className={isFullscreen ? styles.videoStageFullscreen : styles.videoStageControls}
      aria-label="Live Video Stage Controls"
    >
      <div
        className={isFullscreen ? styles.stageBarFullscreen : styles.stageBar}
        onDoubleClick={toggleVideoFullscreen}
        title="Double-click to toggle full screen"
      >
        <div className={styles.stageBadge}>
          <span className={styles.livePulse} />
          <Tv size={13} />
          <span className={styles.badgeText}>Live Stage</span>
        </div>

        <div className={styles.songMeta} onClick={toggleVideoFullscreen}>
          <span className={styles.songTitle}>{song.title}</span>
          <span className={styles.songArtist}>· {song.artist}</span>
        </div>

        <div className={styles.actionsGroup}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={toggleVideoFullscreen}
            title={isFullscreen ? 'Minimize to mini-player (F)' : 'Open full screen (F)'}
            aria-label={isFullscreen ? 'Exit full screen' : 'Open full screen'}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={14} />}
          </button>

          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => toggleVideoStage(false)}
            title="Return to audio-only"
            aria-label="Close video stage"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
};
