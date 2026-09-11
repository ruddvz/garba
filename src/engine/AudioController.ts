import { Song, PlaybackState, PlaybackProvider, RepeatMode } from '../types';

export type PlaybackListener = (state: PlaybackState) => void;

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}

class AudioController {
  private audioElement: HTMLAudioElement;
  private ytPlayer: any = null;
  private ytReady = false;
  private ytLoading = false;
  private ytReadyCallbacks: Array<() => void> = [];
  private ytContainerId = 'yt-active-player';
  private listeners: Set<PlaybackListener> = new Set();
  private originalQueue: Song[] = [];
  private previousVolume = 1;

  private state: PlaybackState = {
    currentSong: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    activeGenre: 'traditional',
    isBuffering: false,
    hasError: false,
    queue: [],
    queueIndex: -1,
    provider: null,
    showVideoStage: false,
    isVideoFullscreen: false,
    repeatMode: 'all',
    isShuffled: false,
    playbackRate: 1,
  };

  constructor() {
    this.audioElement = new Audio();
    // Restore saved volume
    try {
      const savedVol = localStorage.getItem('playgarba_volume');
      if (savedVol !== null) {
        const v = parseFloat(savedVol);
        if (!isNaN(v) && v >= 0 && v <= 1) {
          this.state.volume = v;
          this.audioElement.volume = v;
        }
      }
    } catch {}

    this.setupAudioListeners();
    this.setupKeyboardShortcuts();
  }

  private setupAudioListeners() {
    this.audioElement.addEventListener('play', () => {
      this.updateState({ isPlaying: true, isBuffering: false, provider: 'direct' });
    });

    this.audioElement.addEventListener('pause', () => {
      this.updateState({ isPlaying: false });
    });

    this.audioElement.addEventListener('timeupdate', () => {
      this.updateState({
        currentTime: this.audioElement.currentTime,
        duration: this.audioElement.duration || this.state.duration,
      });
    });

    this.audioElement.addEventListener('waiting', () => {
      this.updateState({ isBuffering: true });
    });

    this.audioElement.addEventListener('playing', () => {
      this.updateState({ isBuffering: false, isPlaying: true });
    });

    this.audioElement.addEventListener('ended', () => {
      this.handleTrackEnded();
    });

    this.audioElement.addEventListener('error', (e) => {
      console.warn('Direct audio playback error, attempting fallback if available', e);
      if (this.state.currentSong?.youtubeId) {
        this.fallbackToYouTube(this.state.currentSong);
      } else {
        this.updateState({ isPlaying: false, isBuffering: false, hasError: true });
      }
    });
  }

  private loadYouTubeIframeAPI(onReady?: () => void) {
    if (typeof window === 'undefined') return;
    if (window.YT && window.YT.Player) {
      this.ytReady = true;
      this.initYouTubePlayer(onReady);
      return;
    }

    if (onReady) {
      this.ytReadyCallbacks.push(onReady);
    }

    if (this.ytLoading) return;
    this.ytLoading = true;

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      this.ytReady = true;
      this.ytLoading = false;
      this.initYouTubePlayer(() => {
        while (this.ytReadyCallbacks.length > 0) {
          const cb = this.ytReadyCallbacks.shift();
          cb?.();
        }
      });
    };
  }

  private initYouTubePlayer(onReady?: () => void) {
    let container = document.getElementById(this.ytContainerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.ytContainerId;
      // Position fixed with non-zero dimensions so YouTube engine doesn't throttle or freeze
      this.applyDockStyles(container, this.state.showVideoStage, this.state.isVideoFullscreen);
      document.body.appendChild(container);
    }

    try {
      this.ytPlayer = new window.YT.Player(this.ytContainerId, {
        height: '100%',
        width: '100%',
        playerVars: {
          autoplay: 1,
          controls: 1,
          disablekb: 0,
          fs: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: () => {
            this.ytReady = true;
            if (this.ytPlayer) {
              if (this.state.isMuted) this.ytPlayer.mute();
              else this.ytPlayer.setVolume(this.state.volume * 100);
              this.ytPlayer.setPlaybackRate(this.state.playbackRate);
            }
            onReady?.();
          },
          onStateChange: (event: any) => {
            // YT.PlayerState: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 video cued
            if (event.data === 1) {
              this.updateState({ isPlaying: true, isBuffering: false, provider: 'youtube' });
              this.startYouTubeProgressTimer();
            } else if (event.data === 2) {
              this.updateState({ isPlaying: false });
              this.stopYouTubeProgressTimer();
            } else if (event.data === 3) {
              this.updateState({ isBuffering: true });
            } else if (event.data === 0) {
              this.stopYouTubeProgressTimer();
              this.handleTrackEnded();
            }
          },
          onError: (err: any) => {
            console.warn('YouTube Player Error', err);
            this.updateState({ isBuffering: false, hasError: true });
            // Auto skip after 1.5s if current video is embed-restricted or missing
            setTimeout(() => {
              if (this.state.hasError) this.playNext();
            }, 1500);
          },
        },
      });
    } catch (e) {
      console.warn('Failed to initialize YouTube player', e);
    }
  }

  private applyDockStyles(container: HTMLElement, visible: boolean, fullscreen: boolean = false) {
    if (visible && fullscreen) {
      container.style.position = 'fixed';
      container.style.inset = '0px';
      container.style.top = '0px';
      container.style.left = '0px';
      container.style.bottom = 'auto';
      container.style.right = 'auto';
      container.style.width = '100vw';
      container.style.height = '100vh';
      container.style.maxWidth = '100vw';
      container.style.maxHeight = '100vh';
      container.style.opacity = '1';
      container.style.pointerEvents = 'auto';
      container.style.zIndex = '200';
      container.style.borderRadius = '0px';
      container.style.overflow = 'hidden';
      container.style.boxShadow = 'none';
      container.style.background = '#000000';
      container.style.transition = 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)';
    } else if (visible) {
      container.style.position = 'fixed';
      container.style.inset = 'auto';
      container.style.top = 'auto';
      container.style.left = 'auto';
      container.style.bottom = '96px';
      container.style.right = '24px';
      container.style.width = '360px';
      container.style.height = '202px';
      container.style.maxWidth = 'calc(100vw - 48px)';
      container.style.maxHeight = '30vh';
      container.style.opacity = '1';
      container.style.pointerEvents = 'auto';
      container.style.zIndex = '90';
      container.style.borderRadius = '16px';
      container.style.overflow = 'hidden';
      container.style.boxShadow =
        '0 16px 48px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(246, 236, 215, 0.16)';
      container.style.background = 'transparent';
      container.style.transition = 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)';
    } else {
      container.style.position = 'fixed';
      container.style.inset = 'auto';
      container.style.top = 'auto';
      container.style.left = 'auto';
      container.style.bottom = '0px';
      container.style.right = '0px';
      container.style.width = '200px';
      container.style.height = '120px';
      container.style.maxWidth = 'none';
      container.style.maxHeight = 'none';
      container.style.opacity = '0.001';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '-10';
      container.style.borderRadius = '8px';
      container.style.overflow = 'hidden';
      container.style.boxShadow = 'none';
      container.style.background = 'transparent';
      container.style.transition = 'opacity 200ms ease';
    }
  }

  private ytProgressTimer: number | null = null;

  private startYouTubeProgressTimer() {
    this.stopYouTubeProgressTimer();
    this.ytProgressTimer = window.setInterval(() => {
      if (this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
        const time = this.ytPlayer.getCurrentTime() || 0;
        const dur = this.ytPlayer.getDuration() || this.state.duration || 0;
        this.updateState({ currentTime: time, duration: dur });
      }
    }, 400);
  }

  private stopYouTubeProgressTimer() {
    if (this.ytProgressTimer !== null) {
      clearInterval(this.ytProgressTimer);
      this.ytProgressTimer = null;
    }
  }

  private handleTrackEnded() {
    if (this.state.repeatMode === 'one') {
      this.seek(0);
      this.resume();
      return;
    }
    this.playNext();
  }

  public subscribe(listener: PlaybackListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private updateState(partial: Partial<PlaybackState>) {
    this.state = { ...this.state, ...partial };
    this.syncMediaSession();
    this.listeners.forEach((l) => l(this.state));
  }

  public getState(): PlaybackState {
    return this.state;
  }

  public setQueue(songs: Song[], startIndex = 0) {
    this.originalQueue = [...songs];
    let activeList = [...songs];
    if (this.state.isShuffled) {
      const selected = songs[startIndex];
      const rest = songs.filter((_, i) => i !== startIndex);
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      activeList = selected ? [selected, ...rest] : rest;
      startIndex = 0;
    }

    this.updateState({
      queue: activeList,
      queueIndex: startIndex,
    });
    if (activeList[startIndex]) {
      this.playSong(activeList[startIndex]);
    }
  }

  public addToQueue(song: Song) {
    const queue = [...this.state.queue, song];
    this.originalQueue.push(song);
    this.updateState({ queue });
  }

  public removeFromQueue(index: number) {
    const queue = this.state.queue.filter((_, i) => i !== index);
    let queueIndex = this.state.queueIndex;
    if (index < queueIndex) {
      queueIndex--;
    } else if (index === queueIndex && queue.length > 0) {
      this.playSong(queue[Math.min(index, queue.length - 1)]);
    }
    this.updateState({ queue, queueIndex });
  }

  public clearQueue() {
    this.originalQueue = this.state.currentSong ? [this.state.currentSong] : [];
    this.updateState({
      queue: this.originalQueue,
      queueIndex: 0,
    });
  }

  public loadSong(song: Song, autoplay = true) {
    if (autoplay) {
      return this.playSong(song);
    }
    const genre = song.genre?.toLowerCase() || this.state.activeGenre;
    const startSec = song.youtubeStartSeconds || 0;
    let queueIndex = this.state.queue.findIndex((s) => s.id === song.id);
    if (queueIndex === -1) {
      const queue = [song, ...this.state.queue];
      this.updateState({ queue, queueIndex: 0 });
    } else {
      this.updateState({ queueIndex });
    }
    this.updateState({
      currentSong: song,
      activeGenre: genre,
      currentTime: startSec,
      duration: song.durationSeconds || 0,
      isPlaying: false,
      isBuffering: false,
      hasError: false,
    });
  }

  public async playSong(song: Song) {
    const genre = song.genre?.toLowerCase() || this.state.activeGenre;
    const startSec = song.youtubeStartSeconds || 0;

    // Ensure song is in queue
    let queueIndex = this.state.queue.findIndex((s) => s.id === song.id);
    if (queueIndex === -1) {
      const queue = [song, ...this.state.queue];
      this.updateState({ queue, queueIndex: 0 });
    } else {
      this.updateState({ queueIndex });
    }

    this.updateState({
      currentSong: song,
      activeGenre: genre,
      currentTime: startSec,
      duration: song.durationSeconds || 0,
      isBuffering: true,
      hasError: false,
    });

    // Strategy 1: Direct Audio URL if available
    if (song.audioUrl) {
      try {
        this.stopYouTube();
        this.audioElement.src = song.audioUrl;
        this.audioElement.currentTime = startSec;
        this.audioElement.playbackRate = this.state.playbackRate;
        await this.audioElement.play();
        this.updateState({ provider: 'direct', isPlaying: true, isBuffering: false });
        return;
      } catch (err) {
        console.warn('Direct audio failed, trying YouTube fallback', err);
      }
    }

    // Strategy 2: YouTube provider
    if (song.youtubeId) {
      this.fallbackToYouTube(song);
      return;
    }

    // If neither exists
    this.updateState({ isBuffering: false, hasError: true });
  }

  private fallbackToYouTube(song: Song) {
    if (!song.youtubeId) return;
    this.audioElement.pause();
    this.audioElement.src = '';

    if (!this.ytReady || !this.ytPlayer) {
      this.loadYouTubeIframeAPI(() => {
        this.fallbackToYouTube(song);
      });
      return;
    }

    const startSec = song.youtubeStartSeconds || 0;

    if (this.ytPlayer && typeof this.ytPlayer.loadVideoById === 'function') {
      try {
        this.ytPlayer.loadVideoById({
          videoId: song.youtubeId,
          startSeconds: startSec,
        });
        this.ytPlayer.setPlaybackRate(this.state.playbackRate);
        if (this.state.isMuted) this.ytPlayer.mute();
        else this.ytPlayer.setVolume(this.state.volume * 100);
        this.updateState({ provider: 'youtube', isPlaying: true });
        return;
      } catch (err) {
        console.warn('YouTube loadVideoById error', err);
      }
    }
  }

  private stopYouTube() {
    this.stopYouTubeProgressTimer();
    if (this.ytPlayer && typeof this.ytPlayer.stopVideo === 'function') {
      try {
        this.ytPlayer.stopVideo();
      } catch {}
    }
  }

  public togglePlay() {
    if (!this.state.currentSong) {
      if (this.state.queue.length > 0) {
        this.playSong(this.state.queue[0]);
      }
      return;
    }

    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.resume();
    }
  }

  public pause() {
    if (this.state.provider === 'direct') {
      this.audioElement.pause();
    } else if (this.state.provider === 'youtube' && this.ytPlayer?.pauseVideo) {
      this.ytPlayer.pauseVideo();
    }
    this.updateState({ isPlaying: false });
  }

  public resume() {
    if (this.state.provider === 'direct') {
      this.audioElement.play().catch(console.warn);
    } else if (this.state.provider === 'youtube' && this.ytPlayer?.playVideo) {
      this.ytPlayer.playVideo();
    }
    this.updateState({ isPlaying: true });
  }

  public seek(seconds: number) {
    if (this.state.provider === 'direct') {
      this.audioElement.currentTime = seconds;
    } else if (this.state.provider === 'youtube' && this.ytPlayer?.seekTo) {
      this.ytPlayer.seekTo(seconds, true);
    }
    this.updateState({ currentTime: seconds });
  }

  public playNext(force = false) {
    const { queue, queueIndex, repeatMode } = this.state;
    if (queue.length === 0) return;

    if (queueIndex === queue.length - 1 && repeatMode === 'off' && !force) {
      this.pause();
      return;
    }

    const nextIndex = (queueIndex + 1) % queue.length;
    this.updateState({ queueIndex: nextIndex });
    this.playSong(queue[nextIndex]);
  }

  public playPrevious() {
    const { queue, queueIndex, currentTime } = this.state;
    if (queue.length === 0) return;

    // If played more than 3 seconds, replay track from beginning
    if (currentTime > 3) {
      this.seek(0);
      return;
    }

    const prevIndex = (queueIndex - 1 + queue.length) % queue.length;
    this.updateState({ queueIndex: prevIndex });
    this.playSong(queue[prevIndex]);
  }

  public setVolume(volume: number) {
    const v = Math.max(0, Math.min(1, volume));
    this.audioElement.volume = v;
    if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
      this.ytPlayer.setVolume(v * 100);
      if (v > 0 && this.ytPlayer.isMuted?.()) {
        this.ytPlayer.unMute();
      }
    }
    try {
      localStorage.setItem('playgarba_volume', String(v));
    } catch {}
    this.updateState({ volume: v, isMuted: v === 0 });
  }

  public toggleMute() {
    if (this.state.isMuted) {
      const restore = this.previousVolume > 0 ? this.previousVolume : 0.8;
      this.setVolume(restore);
    } else {
      this.previousVolume = this.state.volume;
      this.setVolume(0);
    }
  }

  public setPlaybackRate(rate: number) {
    this.audioElement.playbackRate = rate;
    if (this.ytPlayer && typeof this.ytPlayer.setPlaybackRate === 'function') {
      this.ytPlayer.setPlaybackRate(rate);
    }
    this.updateState({ playbackRate: rate });
  }

  public cycleRepeatMode() {
    const modes: RepeatMode[] = ['all', 'one', 'off'];
    const next = modes[(modes.indexOf(this.state.repeatMode) + 1) % modes.length];
    this.updateState({ repeatMode: next });
  }

  public toggleShuffle() {
    const nextShuffled = !this.state.isShuffled;
    if (nextShuffled) {
      const current = this.state.currentSong;
      const pool = [...this.state.queue].filter((s) => s.id !== current?.id);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const newQueue = current ? [current, ...pool] : pool;
      this.updateState({ isShuffled: true, queue: newQueue, queueIndex: 0 });
    } else {
      this.updateState({
        isShuffled: false,
        queue: [...this.originalQueue],
        queueIndex: this.originalQueue.findIndex((s) => s.id === this.state.currentSong?.id),
      });
    }
  }

  public setGenre(genreId: string) {
    this.updateState({ activeGenre: genreId });
  }

  public toggleVideoStage(forceState?: boolean | unknown) {
    const show = typeof forceState === 'boolean' ? forceState : !this.state.showVideoStage;
    const fullscreen = show ? this.state.isVideoFullscreen : false;
    this.updateState({ showVideoStage: show, isVideoFullscreen: fullscreen });
    const container = document.getElementById(this.ytContainerId);
    if (container) {
      this.applyDockStyles(container, show, fullscreen);
    }
  }

  public setVideoFullscreen(fullscreen: boolean) {
    const show = fullscreen ? true : this.state.showVideoStage;
    this.updateState({ isVideoFullscreen: fullscreen, showVideoStage: show });
    const container = document.getElementById(this.ytContainerId);
    if (container) {
      this.applyDockStyles(container, show, fullscreen);
    }
  }

  public toggleVideoFullscreen() {
    this.setVideoFullscreen(!this.state.isVideoFullscreen);
  }

  private setupKeyboardShortcuts() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (e) => {
      // Don't intercept when user is typing in search or input fields
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.seek(this.state.currentTime + 5);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.seek(Math.max(0, this.state.currentTime - 5));
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.setVolume(Math.min(1, this.state.volume + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.setVolume(Math.max(0, this.state.volume - 0.05));
          break;
        case 'KeyM':
          e.preventDefault();
          this.toggleMute();
          break;
        case 'KeyN':
          e.preventDefault();
          this.playNext();
          break;
        case 'KeyP':
          e.preventDefault();
          this.playPrevious();
          break;
        case 'KeyS':
          e.preventDefault();
          this.toggleShuffle();
          break;
        case 'KeyR':
          e.preventDefault();
          this.cycleRepeatMode();
          break;
        case 'KeyV':
          if (this.state.currentSong?.youtubeId) {
            e.preventDefault();
            this.toggleVideoStage();
          }
          break;
        case 'KeyF':
          if (this.state.showVideoStage) {
            e.preventDefault();
            this.toggleVideoFullscreen();
          }
          break;
        case 'Escape':
          if (this.state.isVideoFullscreen) {
            e.preventDefault();
            this.setVideoFullscreen(false);
          } else if (this.state.showVideoStage) {
            e.preventDefault();
            this.toggleVideoStage(false);
          }
          break;
      }
    });
  }

  private syncMediaSession() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const song = this.state.currentSong;
    if (!song) {
      navigator.mediaSession.metadata = null;
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist,
      album: 'PlayGarba · Gujarati Folk & Raas',
      artwork: [
        { src: 'assets/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'assets/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    });

    navigator.mediaSession.setActionHandler('play', () => this.resume());
    navigator.mediaSession.setActionHandler('pause', () => this.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrevious());
    navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) this.seek(details.seekTime);
    });
  }
}

export const audioController = new AudioController();
