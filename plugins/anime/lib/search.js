import axios from 'axios';
import cache from './cache.js';

/* ------------------- Anime Search (AniList → Jikan → Kitsu) ------------------- */
export async function animeSearch(q) {
  const key = `anime:${q.toLowerCase()}`;
  const c = cache.get(key);
  if (c) return c;

  // AniList
  try {
    const gql = `
      query ($search: String) {
        Media(search: $search, type: ANIME) {
          idMal
          title { english romaji }
          description
          meanScore
          episodes
          status
          siteUrl
          coverImage { large }
        }
      }
    `;
    const r = await axios.post('https://graphql.anilist.co', {
      query: gql,
      variables: { search: q }
    });

    const d = r.data.data.Media;
    if (d) {
      const out = {
        id: d.idMal,
        title: d.title.english || d.title.romaji,
        synopsis: d.description?.replace(/\<.*?\>/g, '').trim() || '',
        score: d.meanScore / 10,
        episodes: d.episodes || '?',
        status: d.status,
        url: d.siteUrl,
        image: d.coverImage.large
      };
      cache.set(key, out);
      return out;
    }
  } catch { }

  // Jikan
  try {
    const r = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=1`);
    const d = r.data.data[0];
    if (d) {
      const out = {
        id: d.mal_id,
        title: d.title,
        synopsis: d.synopsis || '',
        score: d.score,
        episodes: d.episodes,
        status: d.status,
        url: d.url,
        image: d.images?.jpg?.large_image_url
      };
      cache.set(key, out);
      return out;
    }
  } catch { }

  return null;
}

/* ------------------- Manga Search ------------------- */
export async function mangaSearch(q) {
  const key = `manga:${q.toLowerCase()}`;
  const c = cache.get(key);
  if (c) return c;

  try {
    const r = await axios.get(`https://api.jikan.moe/v4/manga?q=${q}&limit=1`);
    const m = r.data.data[0];
    if (m) {
      const out = {
        id: m.mal_id,
        title: m.title,
        description: m.synopsis,
        chapters: m.chapters,
        url: m.url,
        image: m.images?.jpg?.image_url
      };
      cache.set(key, out);
      return out;
    }
  } catch { }

  return null;
}

/* ------------------- Character Search ------------------- */
export async function characterSearch(q) {
  const key = `character:${q.toLowerCase()}`;
  const c = cache.get(key);
  if (c) return c;

  try {
    const r = await axios.get(`https://api.jikan.moe/v4/characters?q=${q}&limit=1`);
    const d = r.data.data[0];
    if (d) {
      const out = {
        name: d.name,
        about: d.about?.replace(/\s+/g, ' ').trim(),
        image: d.images?.jpg?.image_url
      };
      cache.set(key, out);
      return out;
    }
  } catch { }

  return null;
}

/* ------------------- Anime Themes (OP/ED) ------------------- */
export async function animeThemes(title) {
  try {
    const s = await animeSearch(title);
    if (!s) return null;

    const r = await axios.get(`https://api.jikan.moe/v4/anime/${s.id}/full`);
    return r.data.data?.theme || null;
  } catch {
    return null;
  }
}

export default { animeSearch, mangaSearch, characterSearch, animeThemes };
