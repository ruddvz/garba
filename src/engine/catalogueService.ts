import { Genre, Song, Release, ContinuousSet, SetChapter } from '../types';

export interface CatalogueData {
  genres: Genre[];
  songs: Song[];
  releases: Release[];
  continuousSets: ContinuousSet[];
  artists: string[];
  isLoaded: boolean;
}

const POPULAR_SET_CHUNKS = [
  'sets-01.json',
  'sets-07-gaman-santhal.json',
  'sets-08-rutvi-pandya.json',
  'sets-09-pooja-santvani.json',
  'sets-10-kairavi-buch.json',
  'sets-11-atul-purohit.json',
  'sets-13-ramzat5.json',
  'sets-20-ramzat-2-2018.json',
  'sets-21-rangtaali-2017.json',
  'sets-24-sanedo-nonstop.json',
  'sets-25-ramzat3-chapters.json',
  'sets-26-ramzat4-chapters.json',
  'sets-27-rangtaali2-chapters.json',
  'sets-28-taal1-chapters.json',
  'sets-29-taal2-chapters.json',
  'sets-30-shakti424-chapters.json',
  'sets-31-mandavadi-chapters.json',
  'sets-32-rangtaali4-chapters.json',
  'sets-33-rangtaali3-chapters.json',
];

class CatalogueService {
  private data: CatalogueData = {
    genres: [],
    songs: [],
    releases: [],
    continuousSets: [],
    artists: [],
    isLoaded: false,
  };

  private loadingPromise: Promise<CatalogueData> | null = null;

  public async load(): Promise<CatalogueData> {
    if (this.data.isLoaded) return this.data;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
      try {
        const [genresRes, songsRes, releasesRes] = await Promise.all([
          fetch('./data/genres.json'),
          fetch('./data/songs.json'),
          fetch('./data/releases.json').catch(() => null),
        ]);

        const genres: Genre[] = genresRes.ok ? await genresRes.json() : [];
        const rawSongs: Song[] = songsRes.ok ? await songsRes.json() : [];
        const releases: Release[] = releasesRes && releasesRes.ok ? await releasesRes.json() : [];

        // Fetch continuous sets across popular chunks
        const continuousSets: ContinuousSet[] = [];
        const setPromises = POPULAR_SET_CHUNKS.map(async (chunk) => {
          try {
            const res = await fetch(`./data/discovery/sets/${chunk}`);
            if (res.ok) {
              const chunkData = await res.json();
              if (Array.isArray(chunkData.sets)) {
                return chunkData.sets.map((s: any) => {
                  const chapters: SetChapter[] = Array.isArray(s.segments)
                    ? s.segments.map((seg: any) => ({
                        title: seg.title || 'Untitled Chapter',
                        startSeconds: seg.startSeconds || 0,
                        endSeconds: seg.endSeconds,
                        artist: Array.isArray(seg.artists)
                          ? seg.artists.join(', ')
                          : s.artists?.join(', '),
                      }))
                    : [];

                  const primaryArtist = Array.isArray(s.artists)
                    ? s.artists.join(', ')
                    : s.artist || 'Various Artists';

                  return {
                    id: s.id,
                    title: s.title,
                    artist: primaryArtist,
                    year: s.year,
                    genre: s.categories?.[0] || 'traditional',
                    duration: s.durationSeconds
                      ? `${Math.floor(s.durationSeconds / 60)} min`
                      : undefined,
                    youtubeId: s.source?.videoId || null,
                    chapters,
                  } as ContinuousSet;
                });
              }
            }
          } catch {}
          return [];
        });

        const resolvedSets = await Promise.all(setPromises);
        resolvedSets.forEach((arr) => continuousSets.push(...arr));

        // Deduplicate continuous sets
        const seenSetIds = new Set<string>();
        const uniqueSets = continuousSets.filter((set) => {
          if (seenSetIds.has(set.id)) return false;
          seenSetIds.add(set.id);
          return true;
        });

        // Filter valid catalogue songs
        const songs = rawSongs.filter(
          (s) => !s.presentationRole || s.presentationRole === 'catalogue',
        );

        // Extract distinct artist names for discovery
        const artistSet = new Set<string>();
        songs.forEach((s) => {
          if (s.artist) artistSet.add(s.artist);
        });
        uniqueSets.forEach((s) => {
          if (s.artist) artistSet.add(s.artist);
        });
        const artists = Array.from(artistSet).sort();

        this.data = {
          genres,
          songs,
          releases,
          continuousSets: uniqueSets,
          artists,
          isLoaded: true,
        };
      } catch (err) {
        console.error('Failed to load catalogue data', err);
      }
      return this.data;
    })();

    return this.loadingPromise;
  }

  public getData(): CatalogueData {
    return this.data;
  }

  public searchSongs(query: string, genre?: string): Song[] {
    const q = query.trim().toLowerCase();
    return this.data.songs.filter((song) => {
      if (genre && genre !== 'all' && song.genre?.toLowerCase() !== genre.toLowerCase()) {
        return false;
      }
      if (!q) return true;
      return (
        song.title.toLowerCase().includes(q) ||
        song.artist.toLowerCase().includes(q) ||
        (song.category && song.category.toLowerCase().includes(q))
      );
    });
  }

  public getSongsByGenre(genre: string): Song[] {
    if (!genre || genre === 'all') return this.data.songs;
    return this.data.songs.filter((s) => s.genre?.toLowerCase() === genre.toLowerCase());
  }

  public getSongsByArtist(artist: string): Song[] {
    const a = artist.toLowerCase();
    return this.data.songs.filter((s) => s.artist?.toLowerCase().includes(a));
  }

  public getGenre(genreId: string): Genre | undefined {
    return this.data.genres.find((g) => g.id.toLowerCase() === genreId.toLowerCase());
  }
}

export const catalogueService = new CatalogueService();
