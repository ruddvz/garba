import { useState, useEffect } from 'react';
import { audioController } from './AudioController';
import { PlaybackState, Song } from '../types';

export function usePlayback(): {
  state: PlaybackState;
  playSong: (song: Song) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seek: (seconds: number) => void;
  playNext: (force?: boolean) => void;
  playPrevious: () => void;
  setQueue: (songs: Song[], startIndex?: number) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  loadSong: (song: Song, autoplay?: boolean) => void;
  setGenre: (genre: string) => void;
  toggleVideoStage: (force?: boolean | unknown) => void;
  setVideoFullscreen: (fullscreen: boolean) => void;
  toggleVideoFullscreen: () => void;
  toggleRepeat: () => void;
  cycleRepeatMode: () => void;
  toggleShuffle: () => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
} {
  const [state, setState] = useState<PlaybackState>(() => audioController.getState());

  useEffect(() => {
    const unsubscribe = audioController.subscribe((nextState) => {
      setState(nextState);
    });
    return unsubscribe;
  }, []);

  return {
    state,
    playSong: (song: Song) => audioController.playSong(song),
    togglePlay: () => audioController.togglePlay(),
    pause: () => audioController.pause(),
    resume: () => audioController.resume(),
    seek: (sec: number) => audioController.seek(sec),
    playNext: (force = false) => audioController.playNext(force),
    playPrevious: () => audioController.playPrevious(),
    setQueue: (songs: Song[], idx = 0) => audioController.setQueue(songs, idx),
    addToQueue: (song: Song) => audioController.addToQueue(song),
    removeFromQueue: (index: number) => audioController.removeFromQueue(index),
    clearQueue: () => audioController.clearQueue(),
    loadSong: (song: Song, autoplay = false) => audioController.loadSong(song, autoplay),
    setGenre: (genre: string) => audioController.setGenre(genre),
    toggleVideoStage: (force?: boolean | unknown) => audioController.toggleVideoStage(force),
    setVideoFullscreen: (fullscreen: boolean) => audioController.setVideoFullscreen(fullscreen),
    toggleVideoFullscreen: () => audioController.toggleVideoFullscreen(),
    toggleRepeat: () => audioController.cycleRepeatMode(),
    cycleRepeatMode: () => audioController.cycleRepeatMode(),
    toggleShuffle: () => audioController.toggleShuffle(),
    setPlaybackRate: (rate: number) => audioController.setPlaybackRate(rate),
    setVolume: (vol: number) => audioController.setVolume(vol),
    toggleMute: () => audioController.toggleMute(),
  };
}
