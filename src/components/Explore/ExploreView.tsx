import React, { useState, useMemo } from 'react';
import { Song, Genre, ContinuousSet } from '../../types';
import { usePlayback } from '../../engine/usePlayback';
import { GENRE_ICON_MAP } from '../Player/PlayerView';
import {
  Search,
  Play,
  Pause,
  Disc3,
  Clock,
  Sparkles,
  Plus,
  Heart,
  User,
  Flame,
  Music,
  Layers,
  Check,
} from 'lucide-react';
import styles from './ExploreView.module.css';

interface ExploreViewProps {
  songs: Song[];
  genres: Genre[];
  continuousSets: ContinuousSet[];
  onSelectSong: (song: Song) => void;
}

interface FeaturedArtist {
  name: string;
  tagline: string;
  searchKey: string;
  accent: string;
  signature: string;
}

const FEATURED_ARTISTS: FeaturedArtist[] = [
  {
    name: 'Atul Purohit',
    tagline: 'King of United Way Baroda & Prachin Garba',
    searchKey: 'Atul Purohit',
    accent: '#d6b06f',
    signature: 'Tara Vina Shyam, Chundadi Re',
  },
  {
    name: 'Falguni Pathak',
    tagline: 'The Dandiya Queen of Navratri',
    searchKey: 'Falguni Pathak',
    accent: '#e63946',
    signature: 'Kesariyo Rang, Odhani Odhu',
  },
  {
    name: 'Aditya Gadhvi',
    tagline: 'Folk Powerhouse & Modern Folk Voice',
    searchKey: 'Aditya Gadhvi',
    accent: '#2a9d8f',
    signature: 'Ochhav, Khalasi, Amber Gaje',
  },
  {
    name: 'Geeta Rabari',
    tagline: 'Kutch Ni Koyal & Global Performer',
    searchKey: 'Geeta Rabari',
    accent: '#f4a261',
    signature: 'Zankaar, Rona Serma, Taal',
  },
  {
    name: 'Kirtidan Gadhvi',
    tagline: 'Dandiya Dynamo & Dayro Legend',
    searchKey: 'Kirtidan Gadhvi',
    accent: '#e76f51',
    signature: 'Tahukar, Norta Ni Raat',
  },
  {
    name: 'Hemant Chauhan',
    tagline: 'Bhajan Samrat & Devotional Master',
    searchKey: 'Hemant Chauhan',
    accent: '#457b9d',
    signature: 'Maa Na Norta, Ghammar Ghammar',
  },
];

function formatDuration(sec?: number | null): string {
  if (!sec || isNaN(sec)) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  songs,
  genres,
  continuousSets,
  onSelectSong,
}) => {
  const { state, playSong, togglePlay, addToQueue } = usePlayback();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [activeArtistFilter, setActiveArtistFilter] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(60);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('garba:favourites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((c) => (c === msg ? null : c));
    }, 2200);
  };

  const toggleFavorite = (songId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(songId) ? prev.filter((id) => id !== songId) : [...prev, songId];
      try {
        localStorage.setItem('garba:favourites', JSON.stringify(next));
      } catch (err) {
        console.warn('Could not save favourites', err);
      }
      return next;
    });
    const isNowFav = !favorites.includes(songId);
    showToast(isNowFav ? 'Saved to My Garba' : 'Removed from My Garba');
  };

  const handleAddToQueue = (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue(song);
    showToast('Added to Up next.');
  };

  const handlePlaySet = (set: ContinuousSet) => {
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
  };

  const handleArtistClick = (artistKey: string) => {
    if (activeArtistFilter === artistKey) {
      setActiveArtistFilter(null);
      setSearchQuery('');
    } else {
      setActiveArtistFilter(artistKey);
      setSearchQuery(artistKey);
    }
  };

  // Filter songs
  const filteredSongs = useMemo(() => {
    let list = songs;
    if (selectedGenre !== 'all') {
      list = list.filter((s) => s.genre?.toLowerCase() === selectedGenre.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          (s.genre && s.genre.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [songs, selectedGenre, searchQuery]);

  return (
    <div className={styles.exploreContainer}>
      <div className={styles.exploreContent}>
        {/* Hero Header */}
        <header className={styles.heroHeader}>
          <div className={styles.eyebrow}>
            <Sparkles size={14} className={styles.eyebrowIcon} />
            <span>Open Gujarati Garba Catalogue · 1,673 Tracks</span>
          </div>
          <h1 className={styles.heroTitle}>Explore & Discover Garba</h1>
          <p className={styles.heroSubtitle}>
            Uninterrupted nonstop sets, traditional devotional aartis, iconic Dandiya Raas, and
            timeless Gujarati heritage performances.
          </p>
        </header>

        {/* Featured Garba Legends Shelf */}
        <section className={styles.artistSection} aria-label="Featured Garba Legends">
          <div className={styles.sectionHeader}>
            <div className={styles.titleWithIcon}>
              <Flame size={18} className={styles.flameIcon} />
              <h2 className={styles.sectionTitle}>Featured Garba Legends</h2>
            </div>
            <span className={styles.sectionBadge}>Top Masters</span>
          </div>

          <div className={styles.artistRow}>
            {FEATURED_ARTISTS.map((artist) => {
              const isSelected = activeArtistFilter === artist.searchKey;
              return (
                <div
                  key={artist.name}
                  className={`${styles.artistCard} ${isSelected ? styles.artistSelected : ''}`}
                  onClick={() => handleArtistClick(artist.searchKey)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                >
                  <div
                    className={styles.artistAvatar}
                    style={{
                      background: `radial-gradient(circle at 30% 30%, ${artist.accent}33, #15182d)`,
                      borderColor: isSelected ? artist.accent : 'rgba(246, 236, 215, 0.12)',
                    }}
                  >
                    <User size={24} style={{ color: artist.accent }} />
                  </div>
                  <div className={styles.artistInfo}>
                    <h3 className={styles.artistName}>{artist.name}</h3>
                    <p className={styles.artistTagline}>{artist.tagline}</p>
                    <span className={styles.artistSignature}>{artist.signature}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Filter & Search Bar */}
        <div className={styles.filterBar}>
          <div className={styles.searchBox}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search across 1,600+ songs, artists, and live sets..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeArtistFilter && !e.target.value) {
                  setActiveArtistFilter(null);
                }
              }}
              aria-label="Search catalogue"
            />
            {searchQuery && (
              <button
                className={styles.clearSearch}
                onClick={() => {
                  setSearchQuery('');
                  setActiveArtistFilter(null);
                }}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className={styles.genrePills} role="tablist" aria-label="Genre filters">
            <button
              role="tab"
              aria-selected={selectedGenre === 'all'}
              className={`${styles.genrePill} ${selectedGenre === 'all' ? styles.active : ''}`}
              onClick={() => setSelectedGenre('all')}
            >
              <Disc3 size={15} className={styles.filterPillIcon} />
              <span>All Garba</span>
            </button>
            {genres.map((g) => {
              const iconSrc = GENRE_ICON_MAP[g.id.toLowerCase()];
              return (
                <button
                  key={g.id}
                  role="tab"
                  aria-selected={selectedGenre === g.id}
                  className={`${styles.genrePill} ${selectedGenre === g.id ? styles.active : ''}`}
                  onClick={() => setSelectedGenre(g.id)}
                >
                  {iconSrc && (
                    <img
                      src={iconSrc}
                      alt=""
                      className={styles.filterGenreIcon}
                      onError={(e) => {
                        if (
                          g.id.toLowerCase() === 'folk' &&
                          !e.currentTarget.src.includes('folk.webp')
                        ) {
                          e.currentTarget.src = 'assets/genre-icons/folk.webp';
                        }
                      }}
                    />
                  )}
                  <span>{g.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Continuous Nonstop Sets Shelf */}
        {continuousSets.length > 0 && selectedGenre === 'all' && !searchQuery && (
          <section className={styles.section} aria-label="Continuous Nonstop Sets">
            <div className={styles.sectionHeader}>
              <div className={styles.titleWithIcon}>
                <Layers size={18} style={{ color: 'var(--accent)' }} />
                <h2 className={styles.sectionTitle}>Continuous Nonstop Sets</h2>
              </div>
              <span className={styles.sectionBadge}>
                {continuousSets.length} Verified Full Sets
              </span>
            </div>

            <div className={styles.setsGrid}>
              {continuousSets.slice(0, 6).map((set) => {
                const isPlayingThis = state.currentSong?.id === set.id && state.isPlaying;
                return (
                  <div key={set.id} className={styles.setCard} onClick={() => handlePlaySet(set)}>
                    <div className={styles.setMeta}>
                      <span className={styles.setGenreTag}>{set.genre || 'Nonstop Set'}</span>
                      <h3 className={styles.setTitle}>{set.title}</h3>
                      <p className={styles.setArtist}>{set.artist}</p>
                    </div>

                    <div className={styles.setStats}>
                      <div className={styles.setDetailsRow}>
                        <Clock size={13} />
                        <span>{set.duration || 'Full Set'}</span>
                        {set.chapters && <span>• {set.chapters.length} chapters</span>}
                      </div>
                      <div className={styles.playBadge}>
                        {isPlayingThis ? (
                          <Pause size={16} />
                        ) : (
                          <Play size={16} style={{ marginLeft: 2 }} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Songs Grid */}
        <section className={styles.section} aria-label="Song List">
          <div className={styles.sectionHeader}>
            <div className={styles.titleWithIcon}>
              <Music size={18} style={{ color: 'var(--accent)' }} />
              <h2 className={styles.sectionTitle}>
                {activeArtistFilter
                  ? `${activeArtistFilter} Recordings`
                  : selectedGenre === 'all'
                    ? 'Catalogue Songs'
                    : `${selectedGenre.toUpperCase()} Songs`}
              </h2>
            </div>
            <span className={styles.sectionBadge}>{filteredSongs.length} items</span>
          </div>

          <div className={styles.songGrid} role="list">
            {filteredSongs.slice(0, visibleLimit).map((song) => {
              const isCurrent = state.currentSong?.id === song.id;
              const isPlaying = isCurrent && state.isPlaying;
              const isFav = favorites.includes(song.id);

              return (
                <div
                  key={song.id}
                  role="listitem"
                  className={`${styles.songCard} ${isCurrent ? styles.active : ''}`}
                  onClick={() => {
                    if (isCurrent) togglePlay();
                    else onSelectSong(song);
                  }}
                >
                  <div className={styles.cardLeft}>
                    <div className={styles.cardPlayBtn}>
                      {isPlaying ? (
                        <Pause size={15} />
                      ) : (
                        <Play
                          size={15}
                          style={{ marginLeft: 2 }}
                          fill={isCurrent ? 'currentColor' : 'none'}
                        />
                      )}
                    </div>
                    <div className={styles.cardInfo}>
                      <span className={styles.cardTitle}>{song.title}</span>
                      <span className={styles.cardArtist}>{song.artist}</span>
                    </div>
                  </div>

                  <div className={styles.cardRight} onClick={(e) => e.stopPropagation()}>
                    <span className={styles.cardDuration}>
                      {formatDuration(song.durationSeconds)}
                    </span>

                    {/* Favorite button */}
                    <button
                      className={`${styles.iconBtn} ${isFav ? styles.favActive : ''}`}
                      onClick={(e) => toggleFavorite(song.id, e)}
                      title={isFav ? 'Remove from My Garba' : 'Add to My Garba'}
                      aria-label="Toggle favourite"
                    >
                      <Heart size={14} fill={isFav ? '#e63946' : 'none'} />
                    </button>

                    {/* Add to Queue button */}
                    <button
                      className={styles.iconBtn}
                      onClick={(e) => handleAddToQueue(song, e)}
                      title="Add to Up next"
                      aria-label="Add to Queue"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show more pagination */}
          {visibleLimit < filteredSongs.length && (
            <div className={styles.loadMoreContainer}>
              <button
                className={styles.loadMoreButton}
                onClick={() => setVisibleLimit((prev) => prev + 60)}
              >
                Load More Songs ({filteredSongs.length - visibleLimit} remaining)
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className={styles.toast} role="status" aria-live="polite">
          <Sparkles size={14} className={styles.toastIcon} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
