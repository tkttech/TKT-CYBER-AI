import { gif } from './lib/images.js';
import { delay } from './lib/utils.js';

export default {
  name: 'animegif',
  command: {
    pattern: 'animegif',
    desc: 'Random anime GIF',
    category: 'anime',
    react: '🎞️',

    run: async ({ sock, msg, args }) => {
      const action = args.join(' ') || 'hug';
      const chat = msg.key.remoteJid;

      await delay();
      const url = await gif(action);

      if (!url)
        return sock.sendMessage(chat, { text: 'Could not fetch GIF.' });

      return sock.sendMessage(chat, { text: url });
    }
  }
};
