import axios from 'axios';

export const delay = (ms = 500) => new Promise((res) => setTimeout(res, ms));

export const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const dl = async (url) => {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    return res.data;
  } catch (e) {
    console.error('Download failed:', e.message);
    return null;
  }
};
