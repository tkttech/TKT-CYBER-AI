import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* -------------------------------------------------------
   DATABASE HANDLER (Per-Group JSON)
------------------------------------------------------- */
const CONFIG_DIR = path.join(__dirname, 'config');
const CONFIG_PATH = path.join(CONFIG_DIR, 'antibadword_groups.json');

if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
if (!fs.existsSync(CONFIG_PATH)) fs.writeFileSync(CONFIG_PATH, '{}');

function getGroupConfig(jid) {
  try {
    const db = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    // Default structure: disabled, warn action, empty word list
    return db[jid] || { enabled: false, action: 'warn', words: [] };
  } catch {
    return { enabled: false, action: 'warn', words: [] };
  }
}

function updateGroupConfig(jid, update) {
  try {
    const db = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8') || '{}');
    // Merge existing config with updates
    const current = db[jid] || { enabled: false, action: 'warn', words: [] };
    db[jid] = { ...current, ...update };

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(db, null, 2));
    return db[jid];
  } catch (e) {
    console.error('Save error:', e);
  }
}

/* -------------------------------------------------------
   PLUGIN
------------------------------------------------------- */
export default {
  name: 'antibadword',
  alias: ['toxic', 'badword'],

  init: ({ ctx, sock }) => {
    ctx.sock = sock;
  },

  command: {
    pattern: 'antibadword',
    desc: 'Configure banned words for this group',
    category: 'protection',
    react: '🤬',

    run: async ({ sock, msg, args }) => {
      const chat = msg.key.remoteJid;

      if (!chat.endsWith('@g.us')) {
        return sock.sendMessage(chat, { text: '❌ This command is for groups only.' }, { quoted: msg });
      }

      // 1. Check Admin Permissions
      const groupMetadata = await sock.groupMetadata(chat);
      const participant = groupMetadata.participants.find(p => p.id === (msg.key.participant || msg.participant));
      const isAdmin = participant?.admin !== null;

      if (!isAdmin && !msg.key.fromMe) {
        return sock.sendMessage(chat, { text: '❌ You need to be an Admin to configure the filter.' }, { quoted: msg });
      }

      const cfg = getGroupConfig(chat);
      const cmd = (args[0] || '').toLowerCase();
      const payload = args.slice(1).join(' ').toLowerCase();

      // HELP MENU
      if (!cmd) {
        return sock.sendMessage(chat, {
          text: '🤬 *Toxic Filter Configuration*\n\n' +
            `• *Status:* ${cfg.enabled ? '✅ ON' : '🔴 OFF'}\n` +
            `• *Action:* ${cfg.action.toUpperCase()}\n` +
            `• *Banned Words:* ${cfg.words.length}\n\n` +
            '*Commands:*\n' +
            '• .badword on / off\n' +
            '• .badword action warn / kick\n' +
            '• .badword add <word>\n' +
            '• .badword remove <word>\n' +
            '• .badword list'
        }, { quoted: msg });
      }

      // TOGGLES
      if (cmd === 'on') {
        updateGroupConfig(chat, { enabled: true });
        return sock.sendMessage(chat, { text: '✅ Toxic filter is now *active*.' }, { quoted: msg });
      }
      if (cmd === 'off') {
        updateGroupConfig(chat, { enabled: false });
        return sock.sendMessage(chat, { text: '🔴 Toxic filter deactivated.' }, { quoted: msg });
      }

      // ACTIONS
      if (cmd === 'action') {
        if (['warn', 'kick'].includes(payload)) {
          updateGroupConfig(chat, { action: payload });
          return sock.sendMessage(chat, { text: `✨ Punishment set to: *${payload.toUpperCase()}*` }, { quoted: msg });
        } else {
          return sock.sendMessage(chat, { text: '❌ Usage: .badword action kick' }, { quoted: msg });
        }
      }

      // LIST MANAGEMENT
      if (cmd === 'add') {
        if (!payload) return sock.sendMessage(chat, { text: '❌ Specify a word to ban.' }, { quoted: msg });
        if (cfg.words.includes(payload)) return sock.sendMessage(chat, { text: '⚠️ Word is already in the list.' }, { quoted: msg });

        const newWords = [...cfg.words, payload];
        updateGroupConfig(chat, { words: newWords });
        return sock.sendMessage(chat, { text: `✅ Added *"${payload}"* to the blacklist.` }, { quoted: msg });
      }

      if (cmd === 'remove' || cmd === 'del') {
        if (!payload) return sock.sendMessage(chat, { text: '❌ Specify a word to remove.' }, { quoted: msg });
        const newWords = cfg.words.filter(w => w !== payload);
        updateGroupConfig(chat, { words: newWords });
        return sock.sendMessage(chat, { text: `🗑️ Removed *"${payload}"* from the list.` }, { quoted: msg });
      }

      if (cmd === 'list') {
        if (cfg.words.length === 0) return sock.sendMessage(chat, { text: '📝 The blacklist is empty.' }, { quoted: msg });
        return sock.sendMessage(chat, { text: `📝 *Blacklisted Words:*\n\n${cfg.words.join(', ')}` }, { quoted: msg });
      }
    }
  },

  /* -------------------------------------------------------
     PASSIVE MONITORING
  ------------------------------------------------------- */
  onMessage: async ({ sock, msg }) => {
    try {
      const chat = msg.key.remoteJid;
      if (!chat || !chat.endsWith('@g.us')) return;

      const cfg = getGroupConfig(chat);
      if (!cfg.enabled || cfg.words.length === 0) return;

      // Extract Text
      const text = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        ''
      ).toLowerCase();

      if (!text) return;

      // 1. Check for Bad Words (Whole Word Matching)
      // We use regex \bword\b to ensure "ass" doesn't trigger on "class"
      const isToxic = cfg.words.some(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(text);
      });

      if (!isToxic) return;

      // 2. Check Immunity (Admins)
      const sender = msg.key.participant || msg.key.remoteJid;
      const groupMetadata = await sock.groupMetadata(chat);
      const senderObj = groupMetadata.participants.find(p => p.id === sender);
      if (senderObj?.admin) return; // Admins can curse

      // 3. Check Bot Admin Status
      const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      const botObj = groupMetadata.participants.find(p => p.id === botId);
      if (!botObj?.admin) return; // Bot needs admin to act

      // 4. Execute Punishment
      await sock.sendMessage(chat, { delete: msg.key });

      if (cfg.action === 'kick') {
        await sock.groupParticipantsUpdate(chat, [sender], 'remove');

        await sock.sendMessage(chat, {
          text: `🚫 *Toxic Content Detected*\n@${sender.split('@')[0]} has been removed.`,
          mentions: [sender]
        });
      } else {
        await sock.sendMessage(chat, {
          text: `⚠️ *Profanity Detected*\n@${sender.split('@')[0]}, that word is banned here.`,
          mentions: [sender]
        });
      }

    } catch (e) {
      console.error('Antibadword check failed:', e);
    }
  }
};