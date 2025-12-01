import fact from './lib/facts.js';
import { delay } from './lib/utils.js';

export default {
  name: 'animefact',
  command: {
    pattern: 'animefact',
    desc: 'Random anime fact',
    category: 'anime',
    react: 'ℹ️',

    run: async ({ sock, msg }) => {
      const chat = msg.key.remoteJid;

      await delay();
      const f = await fact();
      return sock.sendMessage(chat, { text: 'ℹ️ ' + f });
    }
  }
};
