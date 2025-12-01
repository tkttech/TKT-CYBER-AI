import axios from 'axios';

export default async function animeFact() {
  try {
    const r = await axios.get('https://anime-facts-rest-api.herokuapp.com/api/v1');
    const f = r.data.data;
    return f[Math.floor(Math.random() * f.length)]?.fact || 'Nothing found.';
  } catch {
    return 'Anime was originally inspired by Western cartoons.';
  }
}
