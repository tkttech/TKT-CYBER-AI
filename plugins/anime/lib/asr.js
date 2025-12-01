import axios from 'axios';

export default async function traceMoe(buffer) {
  try {
    const r = await axios.post(
      'https://api.trace.moe/search',
      { image: `data:image/jpeg;base64,${buffer.toString('base64')}` },
      { timeout: 20000 }
    );
    return r.data.result?.[0] || null;
  } catch {
    return null;
  }
}
