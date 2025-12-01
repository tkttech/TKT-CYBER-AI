import { animeThemes } from './lib/search.js';
import { delay } from './lib/utils.js';

export default {
  name: 'ed',
  command: {
    pattern: 'ed',
    desc: 'Anime endings',
    category: 'anime',
    react: '🎶',

    run: async ({ sock, msg, args }) => {
      const title = args.join(' ');
      const chat = msg.key.remoteJid;

      if (!title)
        return sock.sendMessage(chat, { text: 'Usage: .ed <anime>' });

      await delay();
      const t = await animeThemes(title);

      if (!t || !t.endings || !t.endings.length)
        return sock.sendMessage(chat, { text: 'No ED found.' });

      return sock.sendMessage(chat, {
        text: '🎶 Endings:\n• ' + t.endings.join('\n• ')
      });
    }
  }
};
