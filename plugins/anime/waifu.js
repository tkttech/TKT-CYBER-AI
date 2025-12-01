import { waifu } from './lib/images.js';
import { delay, dl } from './lib/utils.js';

export default {
  name: 'waifu',
  command: {
    pattern: 'waifu',
    desc: 'Random waifu',
    category: 'anime',
    react: '💙',

    run: async ({ sock, msg }) => {
      const chat = msg.key.remoteJid;
      await delay();

      const url = await waifu('waifu');
      const buf = await dl(url);

      if (!buf)
        return sock.sendMessage(chat, { text: url });

      return sock.sendMessage(chat, { image: buf, caption: '💙 Waifu' });
    }
  }
};
