import { characterSearch } from './lib/search.js';
import { delay, dl } from './lib/utils.js';

export default {
  name: 'character',
  command: {
    pattern: 'character',
    desc: 'Search anime characters',
    category: 'anime',
    react: '👤',

    run: async ({ sock, msg, args }) => {
      const q = args.join(' ');
      const chat = msg.key.remoteJid;

      if (!q) return sock.sendMessage(chat, { text: 'Usage: .character <name>' });

      await delay();
      const c = await characterSearch(q);

      if (!c)
        return sock.sendMessage(chat, { text: 'Character not found.' });

      const buf = c.image ? await dl(c.image) : null;

      const txt = `👤 *${c.name}*\n\n${c.about}`;

      if (buf)
        return sock.sendMessage(chat, { image: buf, caption: txt });

      return sock.sendMessage(chat, { text: txt });
    }
  }
};
