import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* -------------------------------------------------------
   DATABASE HANDLER (Per-Group JSON)
------------------------------------------------------- */
const CONFIG_DIR = path.join(__dirname, 'config');
const CONFIG_PATH = path.join(CONFIG_DIR, 'antlink_groups.json');

if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
if (!fs.existsSync(CONFIG_PATH)) fs.writeFileSync(CONFIG_PATH, '{}'); // Empty object init

function getGroupConfig(jid) {
  try {
    const db = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return db[jid] || { enabled: false, action: 'warn' }; // Default is OFF
  } catch {
    return { enabled: false, action: 'warn' };
  }
}

function updateGroupConfig(jid, update) {
  try {
    const db = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8') || '{}');
    db[jid] = { ...db[jid], ...update };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(db, null, 2));
    return db[jid];
  } catch (e) {
    console.error('Save error:', e);
  }
}

/* -------------------------------------------------------
   LINK DETECTION
------------------------------------------------------- */
function containsLink(text = '') {
  // Detects http/https, t.me, wa.me, and whatsapp.com invites
  const regex = /(https?:\/\/[^\s]+)|(t\.me\/[^\s]+)|(wa\.me\/[^\s]+)|(chat\.whatsapp\.com\/[^\s]+)/i;
  return regex.test(text);
}

/* -------------------------------------------------------
   PLUGIN
------------------------------------------------------- */
export default {
  name: 'antlink',

  init: ({ ctx, sock }) => {
    ctx.sock = sock; // Store socket for onMessage
  },

  command: {
    pattern: 'antlink',
    desc: 'Configure Antilink for this group',
    category: 'protection',
    react: '🛡️',

    run: async ({ sock, msg, args }) => {
      const chat = msg.key.remoteJid;

      if (!chat.endsWith('@g.us')) {
        return sock.sendMessage(chat, { text: '❌ This command is for groups only.' }, { quoted: msg });
      }

      // 1. Check User Permissions (Must be Admin)
      const groupMetadata = await sock.groupMetadata(chat);
      const participant = groupMetadata.participants.find(p => p.id === (msg.key.participant || msg.participant));
      const isAdmin = participant?.admin !== null;

      if (!isAdmin && !msg.key.fromMe) {
        return sock.sendMessage(chat, { text: '❌ You need to be an Admin to configure Antilink.' }, { quoted: msg });
      }

      const cfg = getGroupConfig(chat);
      const sub = (args[0] || '').toLowerCase();
      const val = (args[1] || '').toLowerCase();

      if (!sub) {
        return sock.sendMessage(chat, {
          text: '🛡️ *Antilink Status (This Group)*\n\n' +
            `• *State:* ${cfg.enabled ? '✅ ON' : '🔴 OFF'}\n` +
            `• *Action:* ${cfg.action.toUpperCase()}\n\n` +
            '*Commands:*\n' +
            '• .antlink on\n' +
            '• .antlink off\n' +
            '• .antlink action warn\n' +
            '• .antlink action kick'
        }, { quoted: msg });
      }

      // Logic
      if (sub === 'on') {
        updateGroupConfig(chat, { enabled: true });
        return sock.sendMessage(chat, { text: '✅ Antilink is now *active* in this group.' }, { quoted: msg });
      }

      if (sub === 'off') {
        updateGroupConfig(chat, { enabled: false });
        return sock.sendMessage(chat, { text: '🔴 Antilink deactivated.' }, { quoted: msg });
      }

      if (sub === 'action') {
        if (['warn', 'kick'].includes(val)) {
          updateGroupConfig(chat, { action: val });
          return sock.sendMessage(chat, { text: `✨ Punishment set to: *${val.toUpperCase()}*` }, { quoted: msg });
        } else {
          return sock.sendMessage(chat, { text: '❌ Usage: .antlink action kick' }, { quoted: msg });
        }
      }
    }
  },

  /* -------------------------------------------------------
     PASSIVE MONITORING (The Filter)
  ------------------------------------------------------- */
  onMessage: async ({ sock, msg }) => {
    try {
      const chat = msg.key.remoteJid;
      if (!chat || !chat.endsWith('@g.us')) return; // Groups only

      // 1. Check if Enabled
      const cfg = getGroupConfig(chat);
      if (!cfg.enabled) return;

      // 2. Check Content
      const text = msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption || '';

      if (!containsLink(text)) return;

      // 3. Check Admin Status (Bot & Sender)
      const sender = msg.key.participant || msg.key.remoteJid;
      const groupMetadata = await sock.groupMetadata(chat);

      // Check if Sender is Admin (Immunity)
      const senderObj = groupMetadata.participants.find(p => p.id === sender);
      if (senderObj?.admin) return; // ADMINS ARE SAFE

      // Check if Bot is Admin (Required to delete/kick)
      const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      const botObj = groupMetadata.participants.find(p => p.id === botId);
      const isBotAdmin = botObj?.admin !== null;

      if (!isBotAdmin) return; // Bot can't do anything if not admin

      // 4. EXECUTE PUNISHMENT

      // Always delete the link
      await sock.sendMessage(chat, { delete: msg.key });

      if (cfg.action === 'kick') {
        // Kick User
        await sock.groupParticipantsUpdate(chat, [sender], 'remove');

        await sock.sendMessage(chat, {
          text: `🚫 *Link Detected*\n@${sender.split('@')[0]} has been removed.`,
          mentions: [sender]
        });
      } else {
        // Warn User
        await sock.sendMessage(chat, {
          text: `⚠️ *Link Detected*\n@${sender.split('@')[0]}, links are not allowed here.`,
          mentions: [sender]
        });
      }

    } catch (e) {
      console.error('Antilink check failed:', e);
    }
  }
};