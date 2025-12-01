import traceMoe from './lib/asr.js';
import { delay } from './lib/utils.js';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

async function extract(msg) {
  const type = Object.keys(msg)[0];
  const stream = await downloadContentFromMessage(msg[type], 'image');
  const buf = [];
  for await (const c of stream) buf.push(c);
  return Buffer.concat(buf);
}

export default {
  name: 'asr',
  command: {
    pattern: 'asr',
    desc: 'Identify anime from screenshot',
    category: 'anime',
    react: '🔍',

    run: async ({ sock, msg }) => {
      const chat = msg.key.remoteJid;

      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted)
        return sock.sendMessage(chat, { text: 'Reply to an image.' });

      await delay();

      const buffer = await extract(quoted);
      const res = await traceMoe(buffer);

      if (!res)
        return sock.sendMessage(chat, { text: 'No match found.' });

      const out = `🔎 *Anime Found!*\n\n🎴 *${res.anilist.title?.native || res.filename}*\n📺 Episode: ${res.episode}\n🕒 Time: ${Math.floor(res.from)}s\n🔗 https://anilist.co/anime/${res.anilist.id}`;

      sock.sendMessage(chat, { text: out });
    }
  }
};
