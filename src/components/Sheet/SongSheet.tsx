import React, { useState, useMemo, useEffect } from 'react';
import { Song, SheetSnapState, ContinuousSet } from '../../types';
import { usePlayback } from '../../engine/usePlayback';
import { GENRE_ICON_MAP } from '../Player/PlayerView';
import {
  X,
  Search,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Plus,
  Heart,
  Trash2,
  Music,
  ListPlus,
  Sparkles,
  Layers,
  Clock,
} from 'lucide-react';
import styles from './SongSheet.module.css';

interface SongSheetProps {
  snapState: SheetSnapState;
  onClose: () => void;
  onSetSnap: (snap: SheetSnapState) => void;
  allSongs: Song[];
  continuousSets?: ContinuousSet[];
}

type SheetTab = 'queue' | 'all' | 'favourites' | 'sets';

function formatDuration(sec?: number | null): string {
  if (!sec || isNaN(sec)) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const SongSheet: React.FC<SongSheetProps> = ({
  snapState,
  onClose,
  onSetSnap,
  allSongs,
  continuousSets = [],
}) => {
  const { state, playSong, togglePlay, addToQueue, removeFromQueue, clearQueue } = usePlayback();
  const [activeTab, setActiveTab] = useState<SheetTab>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [filterQuery, setFilterQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('garba:favourites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(80);

  // Sync favorites to localStorage
  const toggleFavorite = (songId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(songId) ? prev.filter((id) => id !== songId) : [...prev, songId];
      try {
        localStorage.setItem('garba:favourites', JSON.stringify(next));
      } catch (err) {
        console.warn('Failed to save favourites', err);
      }
      return next;
    });
    const isNowFav = !favorites.includes(songId);
    showToast(isNowFav ? 'Saved to My Garba' : 'Removed from My Garba');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2200);
  };

  const handleAddToQueue = (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue(song);
    showToast('Added to Up next.');
  };

  // Reset pagination when tab or filter changes
  useEffect(() => {
    setVisibleCount(80);
  }, [activeTab, filterQuery]);

  // Derived song lists
  const currentList = useMemo(() => {
    if (activeTab === 'queue') {
      return state.queue;
    }
    if (activeTab === 'favourites') {
      const favSet = new Set(favorites);
      return allSongs.filter((s) => favSet.has(s.id));
    }
    return allSongs;
  }, [activeTab, state.queue, favorites, allSongs]);

  const filteredSongs = useMemo(() => {
    let list = currentList;
    if (selectedGenre !== 'all') {
      list = list.filter((s) => s.genre?.toLowerCase() === selectedGenre.toLowerCase());
    }
    if (!filterQuery.trim()) return list;
    const q = filterQuery.toLowerCase();
    return list.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        (s.genre && s.genre.toLowerCase().includes(q)),
    );
  }, [currentList, filterQuery, selectedGenre]);

  const filteredSets = useMemo(() => {
    if (!filterQuery.trim()) return continuousSets;
    const q = filterQuery.toLowerCase();
    return continuousSets.filter(
      (set) =>
        set.title.toLowerCase().includes(q) ||
        set.artist.toLowerCase().includes(q) ||
        (set.genre && set.genre.toLowerCase().includes(q)),
    );
  }, [continuousSets, filterQuery]);

  if (snapState === 'closed') return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <section
        className={styles.sheet}
        data-snap={snapState}
        role="dialog"
        aria-modal="true"
        aria-label="Song browser and queue"
      >
        {/* Top Handle & Drag Zone */}
        <div className={styles.sheetHeader}>
          <div
            className={styles.handleBar}
            onClick={() => onSetSnap(snapState === 'medium' ? 'full' : 'medium')}
            title="Resize sheet"
            aria-label="Toggle half or full height"
          />

          <div className={styles.headerRow}>
            <div className={styles.titleWrap}>
              <h2 className={styles.sheetTitle}>
                {activeTab === 'queue' && 'Up Next / Queue'}
                {activeTab === 'all' && 'Garba Catalogue'}
                {activeTab === 'favourites' && 'My Garba'}
                {activeTab === 'sets' && 'Continuous Sets'}
              </h2>
              <span className={styles.countBadge}>
                {activeTab === 'sets' ? filteredSets.length : filteredSongs.length}
              </span>
            </div>

            <div className={styles.snapButtons}>
              {activeTab === 'queue' && state.queue.length > 0 && (
                <button
                  className={styles.clearBtn}
                  onClick={() => {
                    clearQueue();
                    showToast('Queue cleared');
                  }}
                  title="Clear Queue"
                  aria-label="Clear Queue"
                >
                  <Trash2 size={14} style={{ marginRight: 4 }} />
                  Clear
                </button>
              )}

              <button
                className={styles.headerBtn}
                onClick={() => onSetSnap(snapState === 'full' ? 'medium' : 'full')}
                title={snapState === 'full' ? 'Collapse view' : 'Expand full screen'}
                aria-label={snapState === 'full' ? 'Collapse sheet' : 'Expand sheet'}
              >
                {snapState === 'full' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>

              <button
                className={styles.headerBtn}
                onClick={onClose}
                title="Close sheet"
                aria-label="Close sheet"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className={styles.tabNav} role="tablist" aria-label="Sheet sections">
            <button
              role="tab"
              aria-selected={activeTab === 'queue'}
              className={`${styles.tabBtn} ${activeTab === 'queue' ? styles.active : ''}`}
              onClick={() => setActiveTab('queue')}
            >
              Queue
              {state.queue.length > 0 && (
                <span className={styles.tabCountPill}>{state.queue.length}</span>
              )}
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'all'}
              className={`${styles.tabBtn} ${activeTab === 'all' ? styles.active : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Songs
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'favourites'}
              className={`${styles.tabBtn} ${activeTab === 'favourites' ? styles.active : ''}`}
              onClick={() => setActiveTab('favourites')}
            >
              My Garba
              {favorites.length > 0 && (
                <span className={styles.tabCountPill}>{favorites.length}</span>
              )}
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'sets'}
              className={`${styles.tabBtn} ${activeTab === 'sets' ? styles.active : ''}`}
              onClick={() => setActiveTab('sets')}
            >
              Nonstop Sets
              {continuousSets.length > 0 && (
                <span className={styles.tabCountPill}>{continuousSets.length}</span>
              )}
            </button>
          </nav>

          {/* Search bar */}
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={
                activeTab === 'sets'
                  ? 'Search sets by artist or title...'
                  : 'Search by song, artist, or genre...'
              }
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              aria-label="Search songs or sets"
            />
            {filterQuery && (
              <button
                className={styles.clearSearchBtn}
                onClick={() => setFilterQuery('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Genre selector strip for sheet */}
          {activeTab !== 'sets' && (
            <div
              className={styles.sheetGenreStrip}
              role="tablist"
              aria-label="Filter queue by genre"
            >
              <button
                role="tab"
                aria-selected={selectedGenre === 'all'}
                className={`${styles.sheetGenreChip} ${selectedGenre === 'all' ? styles.activeChip : ''}`}
                onClick={() => setSelectedGenre('all')}
              >
                <span>All Garba</span>
              </button>
              {['traditional', 'dandiya', 'devotional', 'folk', 'sanedo', 'fusion'].map((gid) => {
                const iconSrc = GENRE_ICON_MAP[gid];
                const isActive = selectedGenre === gid;
                return (
                  <button
                    key={gid}
                    role="tab"
                    aria-selected={isActive}
                    className={`${styles.sheetGenreChip} ${isActive ? styles.activeChip : ''}`}
                    onClick={() => setSelectedGenre(isActive ? 'all' : gid)}
                  >
                    {iconSrc && (
                      <img
                        src={iconSrc}
                        alt=""
                        className={styles.sheetGenreIcon}
                        onError={(e) => {
                          if (gid === 'folk' && !e.currentTarget.src.includes('folk.webp')) {
                            e.currentTarget.src = 'assets/genre-icons/folk.webp';
                          }
                        }}
                      />
                    )}
                    <span style={{ textTransform: 'capitalize' }}>{gid}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Tab Content: Continuous Sets */}
        {activeTab === 'sets' && (
          <div className={styles.songList} role="list">
            {filteredSets.length === 0 ? (
              <div className={styles.emptyState}>
                <Layers size={36} className={styles.emptyIcon} />
                <p>No continuous sets matching "{filterQuery}"</p>
              </div>
            ) : (
              filteredSets.map((set, idx) => {
                const isPlayingThis = state.currentSong?.id === set.id;
                return (
                  <div
                    key={set.id || idx}
                    role="listitem"
                    className={`${styles.songRow} ${isPlayingThis ? styles.active : ''}`}
                    onClick={() => {
                      const songFromSet: Song = {
                        id: set.id,
                        title: set.title,
                        artist: set.artist,
                        genre: set.genre || 'traditional',
                        youtubeId: set.youtubeId || null,
                        durationSeconds: null,
                        playbackProvider: 'youtube',
                      };
                      playSong(songFromSet);
                    }}
                  >
                    <div className={styles.songMeta}>
                      <div className={styles.trackIdx}>
                        {isPlayingThis && state.isPlaying ? (
                          <div className={styles.equalizer}>
                            <span className={styles.bar} />
                            <span className={styles.bar} />
                            <span className={styles.bar} />
                          </div>
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </div>
                      <div className={styles.songTexts}>
                        <span className={styles.rowTitle}>{set.title}</span>
                        <span className={styles.rowArtist}>
                          {set.artist}
                          {set.chapters && (
                            <span className={styles.chapterBadge}>
                              • {set.chapters.length} chapters
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
                      <button
                        className={styles.actionBtn}
                        onClick={(e) => {
                          const songFromSet: Song = {
                            id: set.id,
                            title: set.title,
                            artist: set.artist,
                            genre: set.genre || 'traditional',
                            youtubeId: set.youtubeId || null,
                            durationSeconds: null,
                            playbackProvider: 'youtube',
                          };
                          handleAddToQueue(songFromSet, e);
                        }}
                        title="Add to Up next"
                        aria-label="Add set to queue"
                      >
                        <ListPlus size={16} />
                      </button>

                      <div className={styles.playTrigger}>
                        {isPlayingThis && state.isPlaying ? (
                          <Pause size={16} />
                        ) : (
                          <Play size={16} fill={isPlayingThis ? 'currentColor' : 'none'} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab Content: Songs (Queue, All, Favorites) */}
        {activeTab !== 'sets' && (
          <div className={styles.songList} role="list">
            {filteredSongs.length === 0 ? (
              <div className={styles.emptyState}>
                <Music size={36} className={styles.emptyIcon} />
                {activeTab === 'queue' && (
                  <p>Queue is empty. Add songs from All Songs with the "+" button!</p>
                )}
                {activeTab === 'favourites' && (
                  <p>No favorites saved yet. Tap the heart on any song to add it to My Garba.</p>
                )}
                {activeTab === 'all' && <p>No songs found matching "{filterQuery}"</p>}
              </div>
            ) : (
              <>
                {filteredSongs.slice(0, visibleCount).map((s, idx) => {
                  const isPlayingThis = state.currentSong?.id === s.id;
                  const isFav = favorites.includes(s.id);

                  return (
                    <div
                      key={s.id || idx}
                      role="listitem"
                      className={`${styles.songRow} ${isPlayingThis ? styles.active : ''}`}
                      onClick={() => {
                        if (isPlayingThis) togglePlay();
                        else playSong(s);
                      }}
                    >
                      <div className={styles.songMeta}>
                        <div className={styles.trackIdx}>
                          {isPlayingThis && state.isPlaying ? (
                            <div className={styles.equalizer}>
                              <span className={styles.bar} />
                              <span className={styles.bar} />
                              <span className={styles.bar} />
                            </div>
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>
                        <div className={styles.songTexts}>
                          <span className={styles.rowTitle}>{s.title}</span>
                          <span className={styles.rowArtist}>{s.artist}</span>
                        </div>
                      </div>

                      <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
                        <span className={styles.rowDuration}>
                          {formatDuration(s.durationSeconds)}
                        </span>

                        {/* Favorite button */}
                        <button
                          className={`${styles.actionBtn} ${isFav ? styles.favActive : ''}`}
                          onClick={(e) => toggleFavorite(s.id, e)}
                          title={isFav ? 'Remove from My Garba' : 'Add to My Garba'}
                          aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Heart size={15} fill={isFav ? '#e63946' : 'none'} />
                        </button>

                        {/* Add to Queue or Remove from Queue */}
                        {activeTab === 'queue' ? (
                          <button
                            className={styles.actionBtn}
                            onClick={() => removeFromQueue(idx)}
                            title="Remove from queue"
                            aria-label="Remove from queue"
                          >
                            <Trash2 size={15} />
                          </button>
                        ) : (
                          <button
                            className={styles.actionBtn}
                            onClick={(e) => handleAddToQueue(s, e)}
                            title="Add to Up next"
                            aria-label="Add to Up next"
                          >
                            <Plus size={16} />
                          </button>
                        )}

                        {/* Play trigger button */}
                        <div className={styles.playTrigger}>
                          {isPlayingThis && state.isPlaying ? (
                            <Pause size={15} />
                          ) : (
                            <Play size={15} fill={isPlayingThis ? 'currentColor' : 'none'} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Show more button if list is long */}
                {visibleCount < filteredSongs.length && (
                  <div className={styles.loadMoreWrap}>
                    <button
                      className={styles.loadMoreBtn}
                      onClick={() => setVisibleCount((prev) => prev + 100)}
                    >
                      Show More ({filteredSongs.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className={styles.toast} role="status" aria-live="polite">
            <Sparkles size={14} className={styles.toastIcon} />
            <span>{toastMessage}</span>
          </div>
        )}
      </section>
    </>
  );
};
