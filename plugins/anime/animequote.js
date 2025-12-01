import getQuote from './lib/quotes.js';
import { delay } from './lib/utils.js';

export default {
  name: 'animequote',

  command: {
    pattern: 'animequote',
    desc: 'Get a random anime quote',
    category: 'anime',
    react: '💬',

    run: async ({ sock, msg }) => {
      const chat = msg.key.remoteJid;

      // react to command
      try {
        await sock.sendMessage(chat, { react: { text: '💬', key: msg.key } });
      } catch { }

      await delay();

      const q = await getQuote();

      return sock.sendMessage(
        chat,
        {
          text: `💬 *"${q.quote}"*\n\n— *${q.character}* from *${q.anime}*`
        },
        { quoted: msg }
      );
    }
  }
};
