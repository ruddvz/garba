import React, { useState } from 'react';
import { Genre, Song, SetChapter } from '../../types';
import { usePlayback } from '../../engine/usePlayback';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  ListMusic,
  Compass,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Gauge,
  Layers,
  Sparkles,
} from 'lucide-react';
import styles from './PlayerView.module.css';

interface PlayerViewProps {
  genres: Genre[];
  onOpenSheet: () => void;
  onNavigateExplore: () => void;
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

const SPEED_OPTIONS = [0.8, 1, 1.25, 1.5];

export const GENRE_ICON_MAP: Record<string, string> = {
  traditional: 'assets/genre-icons/traditional.webp',
  dandiya: 'assets/genre-icons/dandiya.webp',
  devotional: 'assets/genre-icons/devotional.webp',
  folk: 'assets/genre-icons/folk-dhol.webp',
  sanedo: 'assets/genre-icons/sanedo.webp',
  fusion: 'assets/genre-icons/fusion.webp',
};

export const PlayerView: React.FC<PlayerViewProps> = ({
  genres,
  onOpenSheet,
  onNavigateExplore,
}) => {
  const {
    state,
    togglePlay,
    playNext,
    playPrevious,
    seek,
    setGenre,
    setVolume,
    toggleMute,
    setPlaybackRate,
    cycleRepeatMode,
    toggleShuffle,
  } = usePlayback();

  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('garba:favourites');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const song = state.currentSong;
  const isFavorite = song ? favorites.has(song.id) : false;

  const toggleFavorite = () => {
    if (!song) return;
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(song.id)) next.delete(song.id);
      else next.add(song.id);
      try {
        localStorage.setItem('garba:favourites', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const progressPercent = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    seek(val);
  };

  const handleChapterClick = (chapter: SetChapter) => {
    seek(chapter.startSeconds);
  };

  const currentGenreObj = genres.find(
    (g) => g.id.toLowerCase() === state.activeGenre.toLowerCase(),
  );
  const genreLabel = currentGenreObj ? currentGenreObj.label : 'Traditional Garba';

  // Check current chapter if song has chapters
  const currentChapter = song?.chapters
    ?.slice()
    .reverse()
    .find((c) => state.currentTime >= c.startSeconds);

  return (
    <main className={styles.playerContainer}>
      {/* Background Ambient Glow */}
      <div className={styles.artworkStage} aria-hidden="true">
        <div className={`${styles.ambientGlow} ${state.isPlaying ? styles.glowing : ''}`} />
      </div>

      <div className={styles.playerShell}>
        {/* Disc Visual Deck with Live Equalizer */}
        <div className={styles.deckVisualWrap}>
          <div className={`${styles.discRecord} ${state.isPlaying ? styles.spinning : ''}`}>
            <div className={styles.discGrooves} />
            <div className={styles.discLabel}>
              <div className={styles.discCenterSpindle} />
              <Sparkles size={16} className={styles.discSparkle} />
            </div>
          </div>

          {state.isPlaying && (
            <div className={styles.liveWaveform} aria-hidden="true">
              <span className={styles.bar} style={{ animationDelay: '0ms' }} />
              <span className={styles.bar} style={{ animationDelay: '180ms' }} />
              <span className={styles.bar} style={{ animationDelay: '90ms' }} />
              <span className={styles.bar} style={{ animationDelay: '270ms' }} />
              <span className={styles.bar} style={{ animationDelay: '140ms' }} />
            </div>
          )}
        </div>

        {/* Track Info Block */}
        <div className={styles.trackBlock}>
          <div className={styles.genreEyebrow}>
            <span>{genreLabel}</span>
            {song?.chapters && song.chapters.length > 0 && (
              <span className={styles.chapterCountBadge}>
                <Layers size={12} /> {song.chapters.length} Chapters
              </span>
            )}
          </div>

          <h1 className={styles.songTitle}>{song ? song.title : 'PlayGarba'}</h1>

          <div className={styles.artistRow}>
            <span className={styles.songArtist}>
              {song ? song.artist : 'Select a song or continuous set to begin'}
            </span>
            {song && (
              <button
                className={`${styles.favoriteBtn} ${isFavorite ? styles.active : ''}`}
                onClick={toggleFavorite}
                title={isFavorite ? 'Saved in My Garba' : 'Add to My Garba'}
                aria-label="Toggle favorite"
              >
                <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
              </button>
            )}
          </div>

          {/* If there's an active chapter name */}
          {currentChapter && (
            <div className={styles.activeChapterIndicator}>
              <span className={styles.chapterLabel}>Part:</span>
              <strong className={styles.chapterName}>{currentChapter.title}</strong>
              {currentChapter.artist && (
                <span className={styles.chapterArtist}>· {currentChapter.artist}</span>
              )}
            </div>
          )}
        </div>

        {/* Unified Transit Line (Playback Timeline Scrubber) */}
        <div className={styles.transitLine} role="group" aria-label="Playback timeline scrubber">
          <span className={styles.transitTime}>{formatTime(state.currentTime)}</span>
          <div className={styles.progressBarContainer}>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={state.duration || 100}
              step={0.5}
              value={state.currentTime || 0}
              onChange={handleSeekChange}
              className={styles.progressInput}
              aria-label="Playback timeline scrubber"
            />
          </div>
          <span className={styles.transitTime}>
            {state.duration > 0
              ? `-${formatTime(Math.max(0, state.duration - state.currentTime))}`
              : '0:00'}
          </span>
        </div>

        {/* Focal Transport */}
        <div className={styles.controls} role="group" aria-label="Playback controls">
          {/* Shuffle Toggle */}
          <button
            className={`${styles.utilityBtn} ${state.isShuffled ? styles.active : ''}`}
            onClick={toggleShuffle}
            title={state.isShuffled ? 'Shuffle: On' : 'Shuffle: Off'}
            aria-label="Toggle shuffle"
          >
            <Shuffle size={18} />
          </button>

          {/* Previous Track */}
          <button
            className={styles.transportBtn}
            onClick={playPrevious}
            title="Previous song (P or Left Arrow)"
            aria-label="Previous song"
          >
            <SkipBack size={24} />
          </button>

          {/* Main Play / Pause Button */}
          <button
            className={`${styles.playBtn} ${state.isPlaying ? styles.playing : ''}`}
            onClick={togglePlay}
            title={state.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={state.isPlaying ? 'Pause' : 'Play'}
          >
            {state.isPlaying ? <Pause size={34} /> : <Play size={34} style={{ marginLeft: 3 }} />}
          </button>

          {/* Next Track */}
          <button
            className={styles.transportBtn}
            onClick={() => playNext()}
            title="Next song (N or Right Arrow)"
            aria-label="Next song"
          >
            <SkipForward size={24} />
          </button>

          {/* Repeat Mode Cycle */}
          <button
            className={`${styles.utilityBtn} ${state.repeatMode !== 'off' ? styles.active : ''}`}
            onClick={cycleRepeatMode}
            title={`Repeat: ${state.repeatMode}`}
            aria-label={`Repeat mode: ${state.repeatMode}`}
          >
            {state.repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </button>
        </div>

        {/* Audio Utilities Row (Volume & Speed & Video Stage) */}
        <div className={styles.auxiliaryRow}>
          {/* Speed Selector */}
          <div className={styles.speedControlWrap}>
            <button
              className={`${styles.auxBtn} ${state.playbackRate !== 1 ? styles.active : ''}`}
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              title="Practice tempo & playback speed"
              aria-label="Change playback speed"
            >
              <Gauge size={15} />
              <span>{state.playbackRate}x</span>
            </button>
            {showSpeedMenu && (
              <div className={styles.speedDropdown}>
                {SPEED_OPTIONS.map((rate) => (
                  <button
                    key={rate}
                    className={`${styles.speedOption} ${state.playbackRate === rate ? styles.activeOption : ''}`}
                    onClick={() => {
                      setPlaybackRate(rate);
                      setShowSpeedMenu(false);
                    }}
                  >
                    {rate}x {rate === 1 ? '(Normal)' : rate > 1 ? '(Fast)' : '(Slow)'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Volume Control */}
          <div className={styles.volumeControlWrap}>
            <button
              className={styles.auxBtn}
              onClick={toggleMute}
              onMouseEnter={() => setShowVolumeSlider(true)}
              title={state.isMuted ? 'Unmute (M)' : 'Mute (M)'}
              aria-label="Toggle mute"
            >
              {state.isMuted || state.volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <div
              className={`${styles.volumeSliderPopover} ${showVolumeSlider ? styles.show : ''}`}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={state.isMuted ? 0 : state.volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className={styles.volumeSlider}
                aria-label="Volume slider"
              />
            </div>
          </div>
        </div>

        {/* Set Chapters Bar (if chapters exist) */}
        {song?.chapters && song.chapters.length > 0 && (
          <div className={styles.chaptersBarSection}>
            <div className={styles.chaptersHeader}>
              <span>Jump to Section:</span>
            </div>
            <div className={styles.chaptersScrollRow}>
              {song.chapters.map((chap, idx) => {
                const isCurrent = currentChapter?.title === chap.title;
                return (
                  <button
                    key={idx}
                    className={`${styles.chapterPill} ${isCurrent ? styles.activeChapter : ''}`}
                    onClick={() => handleChapterClick(chap)}
                    title={`Jump to ${chap.title} (${formatTime(chap.startSeconds)})`}
                  >
                    <span className={styles.chapIndex}>{idx + 1}.</span>
                    <span className={styles.chapTitle}>{chap.title}</span>
                    <span className={styles.chapTime}>{formatTime(chap.startSeconds)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Genre Selector Strip with Perfectly Aligned Icons & Labels */}
        <div className={styles.genreStrip} role="tablist" aria-label="Music genres">
          {genres.map((genre) => {
            const isActive = state.activeGenre.toLowerCase() === genre.id.toLowerCase();
            const iconSrc =
              GENRE_ICON_MAP[genre.id.toLowerCase()] || 'assets/genre-icons/traditional.webp';
            return (
              <button
                key={genre.id}
                role="tab"
                aria-selected={isActive}
                className={`${styles.genreOption} ${isActive ? styles.activeOption : ''}`}
                onClick={() => setGenre(genre.id)}
                title={`Switch to ${genre.name} (${genre.label})`}
              >
                <span className={styles.genreIconSlot}>
                  <img
                    src={iconSrc}
                    alt=""
                    className={styles.genreIconImage}
                    loading="eager"
                    decoding="async"
                    onError={(e) => {
                      // Fallback for folk if folk-dhol isn't matched
                      if (
                        genre.id.toLowerCase() === 'folk' &&
                        !e.currentTarget.src.includes('folk.webp')
                      ) {
                        e.currentTarget.src = 'assets/genre-icons/folk.webp';
                      }
                    }}
                  />
                </span>
                <span className={styles.genreOptionLabel}>{genre.name}</span>
                <span className={styles.dandiyaMarker} aria-hidden="true" />
              </button>
            );
          })}
        </div>

        {/* Quick Action Navigation Pills */}
        <div className={styles.browseActions}>
          <button className={styles.actionPill} onClick={onOpenSheet}>
            <ListMusic size={16} />
            <span>Browse Queue</span>
          </button>
          <button className={styles.actionPill} onClick={onNavigateExplore}>
            <Compass size={16} />
            <span>Explore Catalogue</span>
          </button>
        </div>
      </div>
    </main>
  );
};
