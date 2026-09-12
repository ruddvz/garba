import React from 'react';
import { usePlayback } from '../../engine/usePlayback';
import { Play, Pause, SkipForward, SkipBack, Disc3, ChevronUp } from 'lucide-react';
import styles from './MiniPlayer.module.css';

interface MiniPlayerProps {
  onExpand: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onExpand }) => {
  const { state, togglePlay, playNext, playPrevious } = usePlayback();
  const song = state.currentSong;

  if (!song) return null;

  const progressPercent =
    state.duration && state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  return (
    <aside
      className={styles.miniPlayer}
      onClick={onExpand}
      role="region"
      aria-label="Now playing mini player"
    >
      {/* Top progress line with 25% milestones */}
      <div className={styles.progressBarTrack} aria-hidden="true">
        <div className={styles.progressBarFill} style={{ width: `${progressPercent}%` }} />
        <div className={styles.milestoneMarkers}>
          {[25, 50, 75].map((pct) => (
            <span
              key={pct}
              className={`${styles.milestoneMarker} ${progressPercent >= pct ? styles.passed : ''}`}
              style={{ left: `${pct}%` }}
            />
          ))}
        </div>
      </div>

      <div className={styles.innerContent}>
        <div className={styles.leftBlock}>
          <div className={`${styles.artworkIndicator} ${state.isPlaying ? styles.spinning : ''}`}>
            <Disc3 size={22} className={styles.discIcon} />
          </div>

          <div className={styles.songInfo}>
            <span className={styles.songTitle}>{song.title}</span>
            <span className={styles.songArtist}>{song.artist}</span>
          </div>
        </div>

        <div
          className={styles.rightControls}
          onClick={(e) => e.stopPropagation()}
          role="group"
          aria-label="Mini player controls"
        >
          <button
            className={styles.controlBtn}
            onClick={() => playPrevious()}
            title="Previous song"
            aria-label="Previous song"
          >
            <SkipBack size={16} />
          </button>

          <button
            className={styles.playPauseBtn}
            onClick={togglePlay}
            title={state.isPlaying ? 'Pause' : 'Play'}
            aria-label={state.isPlaying ? 'Pause' : 'Play'}
          >
            {state.isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
          </button>

          <button
            className={styles.controlBtn}
            onClick={() => playNext()}
            title="Next song"
            aria-label="Next song"
          >
            <SkipForward size={16} />
          </button>

          <button
            className={styles.expandBtn}
            onClick={onExpand}
            title="Open full player"
            aria-label="Open full player"
          >
            <ChevronUp size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};
