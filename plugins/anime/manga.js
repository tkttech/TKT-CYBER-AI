import { mangaSearch } from './lib/search.js';
import { delay, dl } from './lib/utils.js';

export default {
  name: 'manga',
  command: {
    pattern: 'manga',
    desc: 'Search manga',
    category: 'anime',
    react: '📚',

    run: async ({ sock, msg, args }) => {
      const query = args.join(' ');
      const chat = msg.key.remoteJid;

      if (!query)
        return sock.sendMessage(chat, { text: 'Usage: .manga <title>' });

      await delay();
      const m = await mangaSearch(query);

      if (!m)
        return sock.sendMessage(chat, { text: '❌ No manga found.' });

      const buf = m.image ? await dl(m.image) : null;

      const out = `📚 *${m.title}*\n${m.description}\n\nChapters: ${m.chapters}\n🔗 ${m.url}`;

      if (buf)
        return sock.sendMessage(chat, { image: buf, caption: out });

      return sock.sendMessage(chat, { text: out });
    }
  }
};
