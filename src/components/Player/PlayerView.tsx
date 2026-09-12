import React, { useState, useEffect } from 'react';
import { Genre, SetChapter } from '../../types';
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

function formatStyleTag(style: string): string {
  const map: Record<string, string> = {
    '3-taali': '3 Taali',
    'tran-taali': 'Tran Taali',
    hinch: 'Hinch',
    'medium-hinch': 'Medium Hinch',
    dakla: 'Dakla',
    'dak-geet': 'Dak Geet',
    sanedo: 'Sanedo',
    dandiya: 'Dandiya Raas',
    dandia: 'Dandiya',
    raas: 'Raas',
    nonstop: 'Nonstop Set',
    live: 'Live Navratri',
    'traditional-repertoire': 'Prachin Garba',
    devotional: 'Aarti & Stuti',
    folk: 'Desi Folk',
  };
  return (
    map[style.toLowerCase()] || style.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
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

  // Decoupled scrubbing state for silky non-stuttering scrubbing
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState(0);

  // Close speed menu and volume popover on outside click
  useEffect(() => {
    if (!showSpeedMenu && !showVolumeSlider) return;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(`.${styles.speedControlWrap}`)) {
        setShowSpeedMenu(false);
      }
      if (!target?.closest(`.${styles.volumeControlWrap}`)) {
        setShowVolumeSlider(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [showSpeedMenu, showVolumeSlider]);

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

  const displayTime = isScrubbing ? scrubTime : state.currentTime;
  const displayPercent = state.duration > 0 ? (displayTime / state.duration) * 100 : 0;

  // Track scrubber handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    setIsScrubbing(true);
    const val = parseFloat(e.currentTarget.value);
    setScrubTime(val);
  };

  const handleSeekInput = (e: React.FormEvent<HTMLInputElement>) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    setScrubTime(val);
  };

  const handleSeekCommit = () => {
    if (isScrubbing) {
      seek(scrubTime);
      setIsScrubbing(false);
    }
  };

  const handleTrackMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const pct = (x / rect.width) * 100;
    setHoverPercent(pct);
    setHoverTime((pct / 100) * (state.duration || 0));
  };

  const handleTrackMouseLeave = () => {
    setHoverPercent(null);
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
    .find((c) => displayTime >= c.startSeconds);

  // Active quadrant for 25% milestone chips
  const currentQuadrant =
    displayPercent < 25 ? 0 : displayPercent < 50 ? 25 : displayPercent < 75 ? 50 : 75;

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
          <span className={styles.transitTime}>{formatTime(displayTime)}</span>
          <div
            className={`${styles.progressBarContainer} ${isScrubbing ? styles.scrubbing : ''}`}
            onMouseMove={handleTrackMouseMove}
            onMouseLeave={handleTrackMouseLeave}
          >
            {/* 25%, 50%, 75% Milestone Notches & Chapter Notches */}
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${Math.min(100, Math.max(0, displayPercent))}%` }}
              />
              <div className={styles.milestoneMarkers} aria-hidden="true">
                {[25, 50, 75].map((pct) => (
                  <span
                    key={pct}
                    className={`${styles.milestoneMarker} ${displayPercent >= pct ? styles.passed : ''}`}
                    style={{ left: `${pct}%` }}
                    title={`${pct}% Milestone`}
                  />
                ))}
                {song?.chapters &&
                  state.duration > 0 &&
                  song.chapters.map((ch, idx) => {
                    if (idx === 0 || ch.startSeconds <= 0) return null;
                    const chPct = (ch.startSeconds / state.duration) * 100;
                    if (chPct >= 99) return null;
                    return (
                      <span
                        key={`ch-${idx}`}
                        className={`${styles.chapterMarker} ${displayPercent >= chPct ? styles.passed : ''}`}
                        style={{ left: `${chPct}%` }}
                        title={`${ch.title} (${formatTime(ch.startSeconds)})`}
                      />
                    );
                  })}
              </div>
            </div>

            {/* Glowing Scrubber Thumb Handle */}
            <div
              className={`${styles.progressThumb} ${isScrubbing ? styles.scrubbing : ''}`}
              style={{ left: `${Math.min(100, Math.max(0, displayPercent))}%` }}
              aria-hidden="true"
            />

            {/* Floating Live Time & Percentage Tooltip */}
            {(hoverPercent !== null || isScrubbing) && (
              <div
                className={styles.seekTooltip}
                style={{
                  left: `${isScrubbing ? displayPercent : (hoverPercent ?? 0)}%`,
                }}
                aria-hidden="true"
              >
                <span className={styles.tooltipTime}>
                  {formatTime(isScrubbing ? scrubTime : hoverTime)}
                </span>
                <span className={styles.tooltipPercent}>
                  {Math.round(isScrubbing ? displayPercent : (hoverPercent ?? 0))}%
                </span>
              </div>
            )}

            <input
              type="range"
              min={0}
              max={state.duration || 100}
              step={0.5}
              value={displayTime || 0}
              onPointerDown={handlePointerDown}
              onInput={handleSeekInput}
              onChange={handleSeekInput}
              onPointerUp={handleSeekCommit}
              onKeyUp={handleSeekCommit}
              className={styles.progressInput}
              aria-label="Playback timeline scrubber"
              aria-valuemin={0}
              aria-valuemax={state.duration || 100}
              aria-valuenow={Math.round(displayTime)}
              aria-valuetext={`${formatTime(displayTime)} of ${formatTime(state.duration)} (${Math.round(displayPercent)}%)`}
            />
          </div>
          <span className={styles.transitTime}>
            {state.duration > 0
              ? `-${formatTime(Math.max(0, state.duration - displayTime))}`
              : '0:00'}
          </span>
        </div>

        {/* 25% Milestone & Quick-Jump Chips Bar */}
        <div className={styles.quickSeekRow} role="group" aria-label="Quick jump milestones">
          <button
            type="button"
            className={`${styles.seekChip} ${currentQuadrant === 0 ? styles.activeChip : ''}`}
            onClick={() => seek(0)}
            title="Jump to start (0%)"
          >
            <span className={styles.seekChipLabel}>0%</span>
          </button>
          <button
            type="button"
            className={`${styles.seekChip} ${currentQuadrant === 25 ? styles.activeChip : ''}`}
            onClick={() => state.duration > 0 && seek(state.duration * 0.25)}
            title="Jump to 25% milestone"
          >
            <span className={styles.seekChipLabel}>25%</span>
          </button>
          <button
            type="button"
            className={`${styles.seekChip} ${currentQuadrant === 50 ? styles.activeChip : ''}`}
            onClick={() => state.duration > 0 && seek(state.duration * 0.5)}
            title="Jump to 50% midpoint"
          >
            <span className={styles.seekChipLabel}>50%</span>
          </button>
          <button
            type="button"
            className={`${styles.seekChip} ${currentQuadrant === 75 ? styles.activeChip : ''}`}
            onClick={() => state.duration > 0 && seek(state.duration * 0.75)}
            title="Jump to 75% milestone"
          >
            <span className={styles.seekChipLabel}>75%</span>
          </button>
          <button
            type="button"
            className={styles.seekChip}
            onClick={() => seek(Math.max(0, state.currentTime - 15))}
            title="Replay 15 seconds"
          >
            <span className={styles.seekChipLabel}>-15s</span>
          </button>
          <button
            type="button"
            className={styles.seekChip}
            onClick={() => seek(Math.min(state.duration || Infinity, state.currentTime + 15))}
            title="Skip ahead 15 seconds"
          >
            <span className={styles.seekChipLabel}>+15s</span>
          </button>
        </div>

        {/* Focal Transport */}
        <div className={styles.controls} role="group" aria-label="Playback controls">
          {/* Shuffle Toggle */}
          <button
            className={`${styles.utilityBtn} ${state.isShuffled ? styles.active : ''}`}
            onClick={toggleShuffle}
            title={state.isShuffled ? 'Shuffle: On (S)' : 'Shuffle: Off (S)'}
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
            title={state.isPlaying ? 'Pause (Space or K)' : 'Play (Space or K)'}
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
            title={`Repeat: ${state.repeatMode} (R)`}
            aria-label={`Repeat mode: ${state.repeatMode}`}
          >
            {state.repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </button>
        </div>

        {/* Audio Utilities Row (Volume & Speed) */}
        <div className={styles.auxiliaryRow}>
          {/* Speed Selector */}
          <div className={styles.speedControlWrap}>
            <button
              className={`${styles.auxBtn} ${state.playbackRate !== 1 ? styles.active : ''}`}
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              title="Practice tempo & playback speed"
              aria-label="Change playback speed"
              aria-expanded={showSpeedMenu}
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
          <div className={styles.chaptersBarSection} aria-label="Set Chapters">
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

        {/* Style & Rhythm Chips (when song has authentic styles and no chapters) */}
        {(!song?.chapters || song.chapters.length === 0) &&
          song?.styles &&
          song.styles.length > 0 && (
            <div className={styles.stylesBarSection} aria-label="Song rhythm and styles">
              <div className={styles.stylesScrollRow}>
                {song.styles.map((style, idx) => (
                  <span key={idx} className={styles.styleChip}>
                    <Sparkles size={11} className={styles.styleChipIcon} />
                    <span>{formatStyleTag(style)}</span>
                  </span>
                ))}
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
