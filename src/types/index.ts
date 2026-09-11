export interface Genre {
  id: string;
  name: string;
  label: string;
  background: string;
  accent: string;
}

export interface SetChapter {
  title: string;
  startSeconds: number;
  endSeconds?: number;
  artist?: string;
}

export interface ContinuousSet {
  id: string;
  title: string;
  artist: string;
  year?: number;
  genre?: string;
  duration?: string;
  youtubeId?: string;
  chapters?: SetChapter[];
}

export type PlaybackProvider = 'direct' | 'youtube' | null;
export type RepeatMode = 'off' | 'all' | 'one';

export interface Song {
  id: string;
  title: string;
  artist: string;
  genre: string;
  category?: string;
  styles?: string[];
  durationSeconds?: number | null;
  releaseId?: string;
  trackNumber?: number;
  audioUrl?: string | null;
  youtubeId?: string | null;
  playbackProvider?: string;
  playbackSourceUrl?: string;
  playbackSourceType?: string;
  youtubeStartSeconds?: number;
  presentationRole?: string;
  chapters?: SetChapter[];
}

export interface Release {
  id: string;
  title: string;
  artist: string;
  releaseDate?: string;
  originalReleaseYear?: number;
  categories?: string[];
  visualGenre?: string;
  songCount?: number | null;
  durationSeconds?: number | null;
  artworkUrl?: string;
}

export interface PlaybackState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  activeGenre: string;
  isBuffering: boolean;
  hasError: boolean;
  queue: Song[];
  queueIndex: number;
  provider: PlaybackProvider;
  showVideoStage: boolean;
  isVideoFullscreen: boolean;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  playbackRate: number;
}

export type AppRoute =
  | 'player'
  | 'explore'
  | 'about'
  | 'faq'
  | 'history'
  | 'navratri'
  | 'garba-vs-dandiya'
  | 'what-is-garba';

export type SheetSnapState = 'closed' | 'medium' | 'full';
