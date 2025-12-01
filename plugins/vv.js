import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* -------------------------------------------------------
   DATABASE HANDLER (Per-Group Config)
------------------------------------------------------- */
const CONFIG_DIR = path.join(__dirname, '../session/config');
const CONFIG_PATH = path.join(CONFIG_DIR, 'antiviewonce.json');

if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
if (!fs.existsSync(CONFIG_PATH)) fs.writeFileSync(CONFIG_PATH, '{}');

function getGroupConfig(jid) {
  try {
    const db = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return db[jid] || { auto: false };
  } catch {
    return { auto: false };
  }
}

function updateGroupConfig(jid, update) {
  try {
    const db = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8') || '{}');
    db[jid] = { ...(db[jid] || {}), ...update };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(db, null, 2));
  } catch { }
}

/* -------------------------------------------------------
   HELPER: Extract Media
------------------------------------------------------- */
async function extractViewOnce(mediaObj, type) {
  const stream = await downloadContentFromMessage(mediaObj, type);
  let buffer = Buffer.from([]);
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }
  return buffer;
}

export default {
  name: 'vv',
  alias: ['antiviewonce', 'antivo'],

  /* ---------------------------------------------------------
     COMMAND: Manual Unlock (.vv) & Configuration
  --------------------------------------------------------- */
  command: {
    pattern: 'vv',
    desc: 'Unlock ViewOnce (Reply) or Configure Auto-Mode',
    category: 'protection',
    react: '👁️',

    run: async ({ sock, msg, args }) => {
      const chat = msg.key.remoteJid;

      // 1. HANDLE CONFIGURATION (.vv auto on)
      if (args[0] === 'auto') {
        if (!msg.key.fromMe) return sock.sendMessage(chat, { text: '❌ Owner only.' });

        const mode = args[1];
        if (mode === 'on') {
          updateGroupConfig(chat, { auto: true });
          return sock.sendMessage(chat, { text: '✅ Auto-ViewOnce is now *ENABLED*. Hidden media will be sent to your DM.' });
        } else if (mode === 'off') {
          updateGroupConfig(chat, { auto: false });
          return sock.sendMessage(chat, { text: '🔴 Auto-ViewOnce disabled.' });
        } else {
          return sock.sendMessage(chat, { text: 'Usage: `.vv auto on` or `.vv auto off`' });
        }
      }

      // 2. HANDLE MANUAL UNLOCK (Reply)
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted) return sock.sendMessage(chat, { text: '👁️ Reply to a ViewOnce message with `.vv`' }, { quoted: msg });

      // Detect ViewOnce Type (V2 or Legacy)
      const voMessage = quoted.viewOnceMessageV2?.message || quoted.viewOnceMessage?.message;

      let media, type;
      if (voMessage?.imageMessage) { media = voMessage.imageMessage; type = 'image'; }
      else if (voMessage?.videoMessage) { media = voMessage.videoMessage; type = 'video'; }
      else return sock.sendMessage(chat, { text: '❌ Not a view-once media.' }, { quoted: msg });

      try {
        const buffer = await extractViewOnce(media, type);

        if (type === 'image') {
          await sock.sendMessage(chat, { image: buffer, caption: '👁️ *Unlocked*' }, { quoted: msg });
        } else {
          await sock.sendMessage(chat, { video: buffer, caption: '👁️ *Unlocked*' }, { quoted: msg });
        }
      } catch (e) {
        console.error(e);
        return sock.sendMessage(chat, { text: '❌ Failed to download media.' });
      }
    },
  },

  /* ---------------------------------------------------------
     PASSIVE: Auto-Unlock (Sends to DM)
  --------------------------------------------------------- */
  onMessage: async ({ sock, msg }) => {
    try {
      const chat = msg.key.remoteJid;
      const sender = msg.key.participant || msg.key.remoteJid;

      // Check if feature enabled for this chat
      const cfg = getGroupConfig(chat);
      if (!cfg.auto) return;

      // Detect ViewOnce
      const vo = msg.message?.viewOnceMessageV2?.message || msg.message?.viewOnceMessage?.message;
      if (!vo) return;

      let media, type;
      if (vo.imageMessage) { media = vo.imageMessage; type = 'image'; }
      else if (vo.videoMessage) { media = vo.videoMessage; type = 'video'; }
      else return;

      console.log(`[AntiViewOnce] Detected from ${sender.split('@')[0]} in ${chat}`);

      // Download
      const buffer = await extractViewOnce(media, type);
      const caption = `👁️ *Auto-Recovered ViewOnce*\n\n👤 *From:* @${sender.split('@')[0]}\n📍 *Chat:* ${chat.endsWith('@g.us') ? 'Group' : 'Private'}`;

      // SEND TO BOT OWNER (DM)
      const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';

      if (type === 'image') {
        await sock.sendMessage(botJid, { image: buffer, caption, mentions: [sender] });
      } else {
        await sock.sendMessage(botJid, { video: buffer, caption, mentions: [sender] });
      }

    } catch (e) {
      console.error('Auto-VV Error:', e);
    }
  }
};