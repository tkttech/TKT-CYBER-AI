import axios from 'axios';

export async function waifu(category = 'waifu') {
  try {
    const r = await axios.get(`https://api.waifu.pics/sfw/${category}`);
    return r.data.url;
  } catch {
    return null;
  }
}

export async function nekoBest() {
  try {
    const r = await axios.get('https://nekos.best/api/v2/neko');
    return r.data.results[0].url;
  } catch {
    return null;
  }
}

export async function wallpaper(q) {
  try {
    const r = await axios.get(`https://api.waifu.im/search?included_tags=${q}`);
    return r.data.images?.[0]?.url || null;
  } catch {
    return null;
  }
}

export async function gif(action) {
  try {
    const r = await axios.get(`https://api.waifu.pics/sfw/${action}`);
    return r.data.url;
  } catch {
    return null;
  }
}

export default { waifu, nekoBest, wallpaper, gif };
