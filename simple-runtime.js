(() => {
  const nativeFetch = window.fetch.bind(window);
  const bootGenres = [{"id":"traditional","name":"Traditional","label":"Traditional Garba","background":"assets/backgrounds/traditional.svg","accent":"#d6b06f"},{"id":"dandiya","name":"Dandiya","label":"Dandiya Raas","background":"assets/backgrounds/dandiya.svg","accent":"#a77ad6"},{"id":"devotional","name":"Devotional","label":"Devotional Garba","background":"assets/backgrounds/devotional.svg","accent":"#c78372"},{"id":"folk","name":"Folk","label":"Gujarati Folk","background":"assets/backgrounds/folk.svg","accent":"#9a9fc7"},{"id":"sanedo","name":"Sanedo","label":"Sanedo","background":"assets/backgrounds/sanedo.svg","accent":"#c99872"},{"id":"fusion","name":"Fusion","label":"Modern Fusion Garba","background":"assets/backgrounds/fusion.svg","accent":"#a78bc4"}];
  const bootSongs = [{"id":"ochhav-2023-01-ochhav-theme","title":"Ochhav Theme","artist":"Aditya Gadhvi","genre":"traditional","durationSeconds":79,"youtubeId":"V4f5I_xJVoA","youtubeStartSeconds":0,"playbackProvider":"youtube","playbackSourceUrl":"https://www.youtube.com/watch?v=V4f5I_xJVoA","playbackSourceType":"official-artist-channel"},{"id":"atul-maro-garbo-2000-10-haiye-rakhi-hom","title":"Haiye Rakhi Hom","artist":"Atul Purohit, Himali & Smita Shah","genre":"traditional","durationSeconds":184,"youtubeId":"wJZLxRx3ymc","youtubeStartSeconds":1166,"playbackProvider":"youtube","playbackSourceUrl":"https://www.youtube.com/watch?v=wJZLxRx3ymc","playbackSourceType":"verified-performance-chapter"},{"id":"atul-maro-garbo-2000-12-fagan-foramto-aayo","title":"Fagan Foramto Aayo","artist":"Atul Purohit, Himali & Smita Shah","genre":"traditional","durationSeconds":228,"youtubeId":"wJZLxRx3ymc","youtubeStartSeconds":1453,"playbackProvider":"youtube","playbackSourceUrl":"https://www.youtube.com/watch?v=wJZLxRx3ymc","playbackSourceType":"verified-performance-chapter"},{"id":"khelaiya-disco-dandia-93-1993-04-dholida-dhol-re-vagad","title":"Dholida Dhol Re Vagad","artist":"Rupal Doshi","genre":"dandiya","durationSeconds":481,"youtubeId":"RKDi5F85ft4","youtubeStartSeconds":1721,"playbackProvider":"youtube","playbackSourceUrl":"https://www.youtube.com/watch?v=RKDi5F85ft4","playbackSourceType":"verified-performance-chapter"},{"id":"ramzat-45-1995-01-ramzat-45-non-stop-raas-garba","title":"Ramzat 45 Non Stop Raas Garba","artist":"Anuradha Paudwal, Praful Dave, Sonu Nigam, Mina Patel, Sanjay Ojha, Aarti Munshi & Gaurang Vyas","genre":"dandiya","playbackProvider":"apple-music","playbackSourceUrl":"https://music.apple.com/us/album/ramzat-45-non-stop-raas-garba/1251277246","playbackSourceType":"verified-single-release-source"},{"id":"bollywood-dandiya-2014-01-non-stop-bollywood-dandiya-garbe-ki-raat-hai-2014","title":"Non Stop Bollywood Dandiya Garbe Ki Raat Hai 2014","artist":"Pankaj Bhatt","genre":"dandiya","playbackProvider":"apple-music","playbackSourceUrl":"https://music.apple.com/us/album/non-stop-bollywood-dandiya-garbe-ki-raat-hai-2014/1194845614","playbackSourceType":"verified-single-release-source"},{"id":"shyam-raas-v3-1998-01-chhand","title":"Chhand","artist":"Hemant Chauhan","genre":"devotional","durationSeconds":78,"youtubeId":"ZnqLyzreCF8","youtubeStartSeconds":31,"playbackProvider":"youtube","playbackSourceUrl":"https://www.youtube.com/watch?v=ZnqLyzreCF8","playbackSourceType":"verified-performance-chapter"},{"id":"re-lol-vol7-2000-01-chhand","title":"Chhand","artist":"Various Artists","genre":"devotional","durationSeconds":93,"youtubeId":"ZnqLyzreCF8","youtubeStartSeconds":31,"playbackProvider":"youtube","playbackSourceUrl":"https://www.youtube.com/watch?v=ZnqLyzreCF8","playbackSourceType":"verified-performance-chapter"},{"id":"anand-vol8-2001-14-ghor-andhari-re","title":"Ghor Andhari Re","artist":"Musa Paik & Pamela Jain","genre":"devotional","durationSeconds":225,"youtubeId":"V4f5I_xJVoA","youtubeStartSeconds":2518,"playbackProvider":"youtube","playbackSourceUrl":"https://www.youtube.com/watch?v=V4f5I_xJVoA","playbackSourceType":"verified-performance-chapter"},{"id":"he-ranglo-jamyo-1962-01-he-ranglo-jamyo","title":"He Ranglo Jamyo","artist":"Asha Bhosle & Ashit Desai","genre":"folk","playbackProvider":"apple-music","playbackSourceUrl":"https://music.apple.com/us/song/1424893548","playbackSourceType":"verified-track-source"},{"id":"diwaliben-koyal-digital-01-koyal-bethi-aambaliya-ni-dal","title":"Koyal Bethi Aambaliya Ni Dal","artist":"Diwaliben Bhil","genre":"folk","playbackProvider":"apple-music","playbackSourceUrl":"https://music.apple.com/us/song/1566136266","playbackSourceType":"verified-track-source"},{"id":"charan-kanya-aditya-gadhvi-2022","title":"Charan Kanya - Swarotsav 2019","artist":"Aditya Gadhvi","genre":"folk","youtubeId":"Tu9cLEYEvoc","playbackProvider":"youtube","playbackSourceUrl":"https://www.youtube.com/watch?v=Tu9cLEYEvoc","playbackSourceType":"official-artist-channel"},{"id":"sanedo-sanedo-2007-01-rang-pichkari","title":"Rang Pichkari","artist":"Achal Maheta, Sargam Vyash, Ansh Maheta, Shilpa Aiyyar, Piyush Parmar & Pratiksha Desai","genre":"sanedo","playbackProvider":"apple-music","playbackSourceUrl":"https://music.apple.com/us/album/sanedo-sanedo/581651148","playbackSourceType":"verified-release-source"},{"id":"sanedo-sanedo-2007-02-poonam-ni-raat","title":"Poonam Ni Raat","artist":"Achal Maheta, Sargam Vyash, Ansh Maheta, Shilpa Aiyyar, Piyush Parmar & Pratiksha Desai","genre":"sanedo","playbackProvider":"apple-music","playbackSourceUrl":"https://music.apple.com/us/album/sanedo-sanedo/581651148","playbackSourceType":"verified-release-source"},{"id":"sanedo-sanedo-2007-03-ashmani-rang-ni-chundani","title":"Ashmani Rang Ni Chundani","artist":"Achal Maheta, Sargam Vyash, Ansh Maheta, Shilpa Aiyyar, Piyush Parmar & Pratiksha Desai","genre":"sanedo","playbackProvider":"apple-music","playbackSourceUrl":"https://music.apple.com/us/album/sanedo-sanedo/581651148","playbackSourceType":"verified-release-source"},{"id":"ho-raj-fusion-2001-01-ho-raj-ho-raj","title":"Ho Raj Ho Raj","artist":"Manoj Dave & Forum Mehta","genre":"fusion","durationSeconds":66,"playbackProvider":"spotify","playbackSourceUrl":"https://open.spotify.com/track/0GDjX03Yvagc1uYY27saCB","playbackSourceType":"verified-track-source"},{"id":"ho-raj-fusion-2001-02-ghor-andhari-re","title":"Ghor Andhari Re","artist":"Forum Mehta","genre":"fusion","durationSeconds":158,"youtubeId":"V4f5I_xJVoA","youtubeStartSeconds":2518,"playbackProvider":"youtube","playbackSourceUrl":"https://www.youtube.com/watch?v=V4f5I_xJVoA","playbackSourceType":"verified-performance-chapter"},{"id":"ho-raj-fusion-2001-03-ho-raj-re-mavdi-na-garabe","title":"Ho Raj Re Mavdi Na Garabe","artist":"Manoj Dave & Forum Mehta","genre":"fusion","durationSeconds":279,"playbackProvider":"spotify","playbackSourceUrl":"https://open.spotify.com/track/0GDjX03Yvagc1uYY27saCB","playbackSourceType":"verified-track-source"}];
  let hydratePromise = null;
  let hydrated = false;

  function requestPath(input) {
    try {
      const raw = typeof input === 'string' ? input : input?.url;
      return raw ? new URL(raw, location.href).pathname : '';
    } catch {
      return '';
    }
  }

  function localJson(data) {
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json; charset=utf-8' }),
      async json() { return data; },
      async text() { return JSON.stringify(data); },
      clone() { return localJson(data); },
    };
  }

  window.fetch = (input, init) => {
    const path = requestPath(input);
    if (path.endsWith('/data/genres.json')) return Promise.resolve(localJson(bootGenres));
    if (path.endsWith('/data/songs.json')) return Promise.resolve(localJson(bootSongs));
    return nativeFetch(input, init);
  };

  async function hydrate() {
    if (hydratePromise) return hydratePromise;
    hydratePromise = (async () => {
      try {
        const [genresResponse, songsResponse] = await Promise.all([
          nativeFetch('data/genres.json', { cache: 'default' }),
          nativeFetch('data/songs.json', { cache: 'default' }),
        ]);
        if (!genresResponse.ok || !songsResponse.ok) throw new Error('Full catalogue request failed');
        const [genres, songs] = await Promise.all([genresResponse.json(), songsResponse.json()]);
        if (!Array.isArray(genres) || !Array.isArray(songs) || !songs.length) throw new Error('Full catalogue is invalid');

        bootGenres.splice(0, bootGenres.length, ...genres);
        bootSongs.splice(0, bootSongs.length, ...songs);
        hydrated = true;
        window.GARBA_CATALOGUE_READY = true;
        window.dispatchEvent(new CustomEvent('garba:catalogue-ready', { detail: { songs: songs.length } }));
        window.dispatchEvent(new Event('online'));
        return true;
      } catch (error) {
        console.warn('GARBA full catalogue will retry on demand; fast catalogue remains active.', error);
        hydratePromise = null;
        return false;
      }
    })();
    return hydratePromise;
  }

  function scheduleHydration() {
    const run = () => hydrate();
    if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 2600 });
    else setTimeout(run, 1800);
  }

  window.GARBA_FAST_BOOT = {
    genres: bootGenres,
    songs: bootSongs,
    hydrate,
    get hydrated() { return hydrated; },
  };

  if (document.readyState === 'complete') scheduleHydration();
  else window.addEventListener('load', scheduleHydration, { once: true });
})();

document.write('<script src="provider-runtime.js"><\/script><script src="player-continuity.js"><\/script><script src="youtube-player-runtime.js"><\/script>');
