import React, { useState, useEffect } from 'react';
import { AppRoute, SheetSnapState, Genre, Song, ContinuousSet } from '../../types';
import { catalogueService } from '../../engine/catalogueService';
import { usePlayback } from '../../engine/usePlayback';
import { TopBar } from '../Navigation/TopBar';
import { PlayerView } from '../Player/PlayerView';
import { ExploreView } from '../Explore/ExploreView';
import { EditorialView } from '../Editorial/EditorialView';
import { SongSheet } from '../Sheet/SongSheet';
import { MiniPlayer } from '../MiniPlayer/MiniPlayer';
import { VideoStage } from '../VideoStage/VideoStage';
import { YouTubeFloatingLauncher } from '../VideoStage/YouTubeFloatingLauncher';
import styles from './AppShell.module.css';

export const AppShell: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('player');
  const [sheetSnap, setSheetSnap] = useState<SheetSnapState>('closed');
  const [genres, setGenres] = useState<Genre[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [continuousSets, setContinuousSets] = useState<ContinuousSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    state,
    playSong,
    togglePlay,
    playNext,
    playPrevious,
    toggleVideoStage,
    setVideoFullscreen,
  } = usePlayback();

  // Load initial catalogue
  useEffect(() => {
    let mounted = true;
    catalogueService.load().then((data) => {
      if (!mounted) return;
      setGenres(data.genres);
      setSongs(data.songs);
      setContinuousSets(data.continuousSets);
      setIsLoading(false);

      // Auto-populate queue and set default track if none playing
      if (data.songs.length > 0 && !state.currentSong) {
        // Pick first verified song
        const firstSong = data.songs.find((s) => s.youtubeId || s.audioUrl) || data.songs[0];
        if (firstSong) {
          playSong(firstSong);
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Update root accent CSS property and document title when song/genre changes
  useEffect(() => {
    const genreObj = genres.find((g) => g.id.toLowerCase() === state.activeGenre.toLowerCase());
    if (genreObj) {
      document.documentElement.style.setProperty('--accent', genreObj.accent);
    }
    if (state.currentSong) {
      document.title = `${state.currentSong.title} · ${state.currentSong.artist} | PlayGarba`;
    } else {
      document.title = 'PlayGarba · Gujarati Garba music, Raas and nonstop sets';
    }
  }, [state.activeGenre, state.currentSong, genres]);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Escape') {
        if (state.isVideoFullscreen) {
          e.preventDefault();
          setVideoFullscreen(false);
        } else if (state.showVideoStage) {
          e.preventDefault();
          toggleVideoStage(false);
        } else if (sheetSnap !== 'closed') {
          e.preventDefault();
          setSheetSnap('closed');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sheetSnap, state.showVideoStage, state.isVideoFullscreen, toggleVideoStage, setVideoFullscreen]);

  // Determine current active background image
  const currentGenreObj = genres.find(
    (g) => g.id.toLowerCase() === state.activeGenre.toLowerCase(),
  );
  const backgroundUrl = currentGenreObj
    ? currentGenreObj.background
    : 'assets/backgrounds/traditional.svg';

  const handleSelectSongFromExplore = (song: Song) => {
    playSong(song);
    // Smooth transition back to player view for immersive listening
    setCurrentRoute('player');
  };

  return (
    <div className={styles.appShell}>
      {/* Background world artwork */}
      <div className={styles.worldStage} aria-hidden="true">
        <div className={styles.worldLayer} style={{ backgroundImage: `url("${backgroundUrl}")` }} />
        <div className={styles.vignetteOverlay} />
      </div>

      {/* TopBar */}
      <TopBar
        currentRoute={currentRoute}
        onNavigate={setCurrentRoute}
        onToggleSheet={() => setSheetSnap(sheetSnap === 'closed' ? 'medium' : 'closed')}
        isSheetOpen={sheetSnap !== 'closed'}
      />

      {/* Main Viewport */}
      <div className={styles.contentViewport}>
        {currentRoute === 'player' && (
          <PlayerView
            genres={genres}
            onOpenSheet={() => setSheetSnap('medium')}
            onNavigateExplore={() => setCurrentRoute('explore')}
          />
        )}

        {currentRoute === 'explore' && (
          <ExploreView
            songs={songs}
            genres={genres}
            continuousSets={continuousSets}
            onSelectSong={handleSelectSongFromExplore}
          />
        )}

        {['history', 'navratri', 'garba-vs-dandiya', 'sound-guide', 'about', 'faq'].includes(
          currentRoute,
        ) && (
          <EditorialView
            initialTopic={currentRoute as any}
            onNavigate={setCurrentRoute}
            allSongs={songs}
          />
        )}
      </div>

      {/* Persistent MiniPlayer when viewing Explore or Editorial guides */}
      {currentRoute !== 'player' && <MiniPlayer onExpand={() => setCurrentRoute('player')} />}

      {/* Bottom Sheet for Song Queue and Browser */}
      <SongSheet
        snapState={sheetSnap}
        onClose={() => setSheetSnap('closed')}
        onSetSnap={setSheetSnap}
        allSongs={songs}
        continuousSets={continuousSets}
      />

      {/* Floating Monochromatic YouTube Video Launcher */}
      <YouTubeFloatingLauncher isAboveMiniPlayer={currentRoute !== 'player'} />

      {/* Video Stage Dock */}
      <VideoStage />
    </div>
  );
};
