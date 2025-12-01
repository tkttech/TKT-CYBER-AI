import { nekoBest } from './lib/images.js';
import { delay, dl } from './lib/utils.js';

export default {
  name: 'randchar',
  command: {
    pattern: 'randchar',
    desc: 'Random anime character image',
    category: 'anime',
    react: '🎲',

    run: async ({ sock, msg }) => {
      const chat = msg.key.remoteJid;

      await delay();
      const url = await nekoBest();

      if (!url)
        return sock.sendMessage(chat, { text: 'No character found.' });

      const buf = await dl(url);
      if (!buf) return sock.sendMessage(chat, { text: url });

      return sock.sendMessage(chat, { image: buf, caption: '🎲 Random Character' });
    }
  }
};
