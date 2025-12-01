import { animeThemes } from './lib/search.js';
import { delay } from './lib/utils.js';

export default {
  name: 'op',
  command: {
    pattern: 'op',
    desc: 'Anime openings',
    category: 'anime',
    react: '🎵',

    run: async ({ sock, msg, args }) => {
      const title = args.join(' ');
      const chat = msg.key.remoteJid;

      if (!title)
        return sock.sendMessage(chat, { text: 'Usage: .op <anime>' });

      await delay();
      const t = await animeThemes(title);

      if (!t || !t.openings || !t.openings.length)
        return sock.sendMessage(chat, { text: 'No OP found.' });

      return sock.sendMessage(chat, {
        text: '🎵 Openings:\n• ' + t.openings.join('\n• ')
      });
    }
  }
};
