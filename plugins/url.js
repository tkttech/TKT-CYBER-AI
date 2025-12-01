import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { smartUpload } from '../src/utils/uploader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* -----------------------------------------------------------
   Anti-ban delay
----------------------------------------------------------- */
function delay(min = 150, max = 450) {
  return new Promise((r) =>
    setTimeout(r, Math.floor(min + Math.random() * (max - min)))
  );
}

/* -----------------------------------------------------------
   MEDIA EXTRACTOR
----------------------------------------------------------- */
async function extract(typeMsg, type) {
  const stream = await downloadContentFromMessage(typeMsg, type);
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

async function resolveMedia(message) {
  const m = message?.message || {};

  if (m.imageMessage)
    return { buffer: await extract(m.imageMessage, 'image'), ext: '.jpg' };

  if (m.videoMessage)
    return { buffer: await extract(m.videoMessage, 'video'), ext: '.mp4' };

  if (m.audioMessage)
    return { buffer: await extract(m.audioMessage, 'audio'), ext: '.mp3' };

  if (m.stickerMessage)
    return { buffer: await extract(m.stickerMessage, 'sticker'), ext: '.webp' };

  if (m.documentMessage) {
    const ext = path.extname(m.documentMessage.fileName || '') || '.bin';
    return { buffer: await extract(m.documentMessage, 'document'), ext };
  }

  return null;
}

async function resolveQuoted(message) {
  const quoted = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quoted) return null;
  return resolveMedia({ message: quoted });
}

/* -----------------------------------------------------------
   MAIN URL CONVERTER
----------------------------------------------------------- */
export default {
  name: 'url',

  command: {
    pattern: 'url',
    desc: 'Convert any media into a shareable direct URL',
    category: 'tools',
    react: '🔗',

    run: async ({ sock, msg }) => {
      const chat = msg.key.remoteJid;

      // React to command
      try {
        await sock.sendMessage(chat, { react: { text: '🔗', key: msg.key } });
      } catch { }

      await delay();

      /* Extract media: prefer direct > quoted */
      let media = await resolveMedia(msg);
      if (!media) media = await resolveQuoted(msg);

      if (!media) {
        return sock.sendMessage(
          chat,
          {
            text:
              '🕯️ *Present or reply to a media file to receive its sacred URL.*\n\n' +
              'Supported: image, video, audio, sticker, document.',
          },
          { quoted: msg }
        );
      }

      /* Save temp file */
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

      const tempFile = path.join(tempDir, `${Date.now()}${media.ext}`);
      fs.writeFileSync(tempFile, media.buffer);

      /* Upload */
      let url;
      try {
        url = await smartUpload(tempFile);
      } catch (e) {
        console.error('UPLOAD ERROR:', e);
      } finally {
        setTimeout(() => {
          if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        }, 1500);
      }

      if (!url) {
        return sock.sendMessage(
          chat,
          { text: '💀 *The ritual failed. No host accepted this offering.*' },
          { quoted: msg }
        );
      }

      return sock.sendMessage(
        chat,
        {
          text: `🕯️ *Link conjured successfully:*\n\n${url}`,
        },
        { quoted: msg }
      );
    },
  },
};
