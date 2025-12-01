import { wallpaper } from './lib/images.js';
import { delay } from './lib/utils.js';

export default {
  name: 'animewall',
  command: {
    pattern: 'animewall',
    desc: 'Anime wallpapers',
    category: 'anime',
    react: '🖼️',

    run: async ({ sock, msg, args }) => {
      const q = args.join(' ') || 'anime';
      const chat = msg.key.remoteJid;

      await delay();
      const url = await wallpaper(q);

      if (!url)
        return sock.sendMessage(chat, { text: '❌ No wallpaper found.' });

      return sock.sendMessage(chat, { text: url });
    }
  }
};
