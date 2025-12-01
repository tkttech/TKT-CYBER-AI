import { waifu, nekoBest } from './lib/images.js';
import { delay, dl } from './lib/utils.js';

export default {
  name: 'animepic',
  command: {
    pattern: 'animepic',
    desc: 'Anime images',
    category: 'anime',
    react: '📸',

    run: async ({ sock, msg, args }) => {
      const category = args[0] || 'waifu';
      const chat = msg.key.remoteJid;

      await delay();

      let url = await waifu(category);
      if (!url) url = await nekoBest();

      if (!url)
        return sock.sendMessage(chat, { text: 'Could not fetch image.' });

      const buf = await dl(url);
      if (!buf) return sock.sendMessage(chat, { text: url });

      return sock.sendMessage(chat, {
        image: buf,
        caption: `🎴 Category: ${category}`
      });
    }
  }
};
