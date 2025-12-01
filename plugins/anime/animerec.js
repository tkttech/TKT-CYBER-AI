import axios from 'axios';
import { delay } from './lib/utils.js';

async function rec(genre) {
  try {
    const q = `
      query ($genre:String){
        Page(perPage:10){
          media(genre_in:[$genre], sort:POPULARITY_DESC, type:ANIME){
            title{english romaji}
          }
        }
      }
    `;
    const r = await axios.post('https://graphql.anilist.co', {
      query: q,
      variables: { genre }
    });

    return r.data.data.Page.media.map(a =>
      a.title.english || a.title.romaji
    );
  } catch {
    return [];
  }
}

export default {
  name: 'animerec',
  command: {
    pattern: 'animerec',
    desc: 'Anime recommendations',
    category: 'anime',
    react: '🎯',

    run: async ({ sock, msg, args }) => {
      const genre = args.join(' ') || 'action';
      const chat = msg.key.remoteJid;

      await delay();
      const list = await rec(genre);

      if (!list.length)
        return sock.sendMessage(chat, { text: 'No recommendations found.' });

      return sock.sendMessage(chat, {
        text: `🎯 Recommended ${genre} anime:\n\n• ` + list.join('\n• ')
      });
    }
  }
};
