import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* -------------------------------------------------------
   CONFIG & CACHE
------------------------------------------------------- */
const CONFIG_DIR = path.join(__dirname, 'config');
const CFG_PATH = path.join(CONFIG_DIR, 'antidelete.json');

// Ensure config exists
if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
if (!fs.existsSync(CFG_PATH)) {
  fs.writeFileSync(CFG_PATH, JSON.stringify({ enabled: true, gcChat: true }, null, 2));
}

// In-Memory Cache (Map is faster than Object for frequent IO)
// Key: MessageID, Value: { msg, sender, type, caption }
const msgCache = new Map();

// Clean cache every 1 hour to prevent RAM overflow
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of msgCache) {
    if (now - data.ts > 24 * 60 * 60 * 1000) { // 24 hour TTL
      msgCache.delete(id);
    }
  }
}, 60 * 60 * 1000);

function readCfg() {
  try { return JSON.parse(fs.readFileSync(CFG_PATH, 'utf8')); }
  catch { return { enabled: true, gcChat: true }; }
}

function saveCfg(c) {
  fs.writeFileSync(CFG_PATH, JSON.stringify(c, null, 2));
}

/* -------------------------------------------------------
   PLUGIN LOGIC
------------------------------------------------------- */
export default {
  name: 'antidelete',

  init: async ({ ctx, sock }) => {
    // 1. Store Incoming Messages
    sock.ev.on('messages.upsert', async (update) => {
      const cfg = readCfg();
      if (!cfg.enabled) return;

      for (const m of update.messages) {
        if (!m.message) continue;
        const id = m.key.id;

        // Don't cache bot's own messages or status updates
        if (m.key.fromMe || m.key.remoteJid === 'status@broadcast') continue;

        msgCache.set(id, {
          key: m.key,
          message: m.message,
          ts: Date.now(),
          sender: m.key.participant || m.key.remoteJid,
          pushName: m.pushName || 'Unknown'
        });
      }
    });

    // 2. Detect Deletions (Protocol Messages)
    sock.ev.on('messages.update', async (updates) => {
      const cfg = readCfg();
      if (!cfg.enabled) return;

      for (const u of updates) {
        // Check for REVOKE (Type 0 Protocol Message)
        if (u.update.messageStubType === 68 || // Some versions use stubType
                    (u.update.message && u.update.message.protocolMessage && u.update.message.protocolMessage.type === 0)) {

          const key = u.key || u.update.message.protocolMessage.key;
          const targetId = key.id;
          const cached = msgCache.get(targetId);

          if (cached) {
            const chat = cached.key.remoteJid;
            const sender = cached.sender.split('@')[0];

            // Check if media or text
            const content = cached.message;
            const isText = content.conversation || content.extendedTextMessage;
            const isImage = content.imageMessage;
            const isVideo = content.videoMessage;
            const isSticker = content.stickerMessage;
            const isVoice = content.audioMessage;

            // Construct Header
            const header = `🕯️ *Anti-Delete Detected*\n\n👤 *Sender:* @${sender}\n🕒 *Time:* ${new Date().toLocaleTimeString()}`;

            try {
              if (isText) {
                const text = content.conversation || content.extendedTextMessage.text;
                await sock.sendMessage(chat, {
                  text: `${header}\n\n📝 *Message:*\n${text}`,
                  mentions: [cached.sender]
                });
              }
              else if (isImage) {
                await sock.sendMessage(chat, {
                  image: content.imageMessage,
                  caption: `${header}\n\n(Recovered Image)`,
                  mentions: [cached.sender]
                });
              }
              else if (isVideo) {
                await sock.sendMessage(chat, {
                  video: content.videoMessage,
                  caption: `${header}\n\n(Recovered Video)`,
                  mentions: [cached.sender]
                });
              }
              else if (isSticker) {
                await sock.sendMessage(chat, { text: header, mentions: [cached.sender] });
                await sock.sendMessage(chat, { sticker: content.stickerMessage });
              }
              else if (isVoice) {
                await sock.sendMessage(chat, {
                  audio: content.audioMessage,
                  mimetype: 'audio/mp4',
                  ptt: true
                });
              }
            } catch (e) {
              console.error('[AntiDelete] Failed to repost:', e);
            }
          }
        }
      }
    });
  },

  command: {
    pattern: 'antidelete',
    desc: 'Manage deleted message recovery',
    category: 'protection',
    react: '🕯️',

    run: async ({ sock, msg, args }) => {
      // Security Check
      /* if (!msg.key.fromMe) return; */

      const chat = msg.key.remoteJid;
      const cfg = readCfg();
      const mode = args[0]?.toLowerCase();

      if (!mode) {
        return sock.sendMessage(chat, {
          text: '🕯️ *Anti-Delete Status*\n\n' +
                        `• *State:* ${cfg.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                        `• *Cached Msgs:* ${msgCache.size}\n\n` +
                        '*Usage:* .antidelete on | off'
        }, { quoted: msg });
      }

      if (mode === 'on') {
        cfg.enabled = true;
        saveCfg(cfg);
        return sock.sendMessage(chat, { text: '✅ Anti-Delete is now *ENABLED*.' }, { quoted: msg });
      }

      if (mode === 'off') {
        cfg.enabled = false;
        msgCache.clear(); // Clear memory to save RAM
        saveCfg(cfg);
        return sock.sendMessage(chat, { text: '❌ Anti-Delete is now *DISABLED*.' }, { quoted: msg });
      }
    }
  }
};