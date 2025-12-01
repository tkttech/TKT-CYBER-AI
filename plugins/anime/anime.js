import { animeSearch } from './lib/search.js';
import { delay, dl } from './lib/utils.js';

export default {
  name: 'anime',
  command: {
    pattern: 'anime',
    desc: 'Search an anime',
    category: 'anime',
    react: '🎴',

    run: async ({ sock, msg, args }) => {
      const query = args.join(' ');
      const chat = msg.key.remoteJid;

      if (!query)
        return sock.sendMessage(chat, { text: 'Usage: .anime <title>' });

      await delay();
      const res = await animeSearch(query);

      if (!res)
        return sock.sendMessage(chat, { text: '❌ No anime found.' });

      const buf = res.image ? await dl(res.image) : null;

      const txt = `🎴 *${res.title}*\n⭐ ${res.score}\n📺 ${res.episodes} episodes\n⏳ ${res.status}\n\n${res.synopsis}\n\n🔗 ${res.url}`;

      if (buf)
        return sock.sendMessage(chat, { image: buf, caption: txt });

      return sock.sendMessage(chat, { text: txt });
    }
  }
};
