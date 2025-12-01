import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_DIR = path.join(__dirname, '../session/config'); // Store config inside session folder to persist on Heroku
const CONFIG_FILE = path.join(CONFIG_DIR, 'autostatus.json');

// Defaults
const DEFAULT = {
  enabled: true,
  react: true,
  emoji: '🕷️',
  throttleMs: 30000, // 30 seconds throttle is safer than 5 mins
  viewDelayMin: 1000,
  viewDelayMax: 3000
};

// Initialize Config
if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
if (!fs.existsSync(CONFIG_FILE)) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT, null, 2), 'utf8');
}

function loadConfig() {
  try {
    return { ...DEFAULT, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
  } catch {
    return DEFAULT;
  }
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (e) {
    console.error('Config save failed:', e);
  }
}

// Anti-Ban Delay
const delay = (ms) => new Promise(res => setTimeout(res, ms));
const lastReact = new Map();

export default {
  name: 'autostatus',
  alias: ['autosview', 'statusview'],

  command: {
    pattern: 'autostatus',
    desc: 'Configure Auto-Status Viewer & Reactor',
    category: 'settings',
    react: '🕷️',

    run: async ({ sock, msg, args }) => {
      const chat = msg.key.remoteJid;
      // Only Owner can use this
      if (!msg.key.fromMe) return;

      const cfg = loadConfig();
      const sub = args[0]?.toLowerCase();

      if (!sub) {
        const statusTxt = `
🕯️ *Vesperr AutoStatus*
────────────────
👁️ *View:* ${cfg.enabled ? 'ON' : 'OFF'}
🕷️ *React:* ${cfg.react ? 'ON' : 'OFF'}
✨ *Emoji:* ${cfg.emoji}
────────────────
*Commands:*
.autostatus on/off
.autostatus react on/off
.autostatus emoji 🔥`;
        return sock.sendMessage(chat, { text: statusTxt }, { quoted: msg });
      }

      if (sub === 'on' || sub === 'off') {
        cfg.enabled = sub === 'on';
        saveConfig(cfg);
        return sock.sendMessage(chat, { text: `👁️ Status Viewer: *${sub.toUpperCase()}*` });
      }

      if (sub === 'react') {
        const mode = args[1]?.toLowerCase();
        if (mode === 'on' || mode === 'off') {
          cfg.react = mode === 'on';
          saveConfig(cfg);
          return sock.sendMessage(chat, { text: `🕷️ Status Reaction: *${mode.toUpperCase()}*` });
        }
      }

      if (sub === 'emoji') {
        const emo = args[1];
        if (emo) {
          cfg.emoji = emo;
          saveConfig(cfg);
          return sock.sendMessage(chat, { text: `✨ Reaction set to: ${emo}` });
        }
      }
    }
  },

  /* -------------------------------------------------------
     THE STATUS HANDLER (Called by index.js)
  ------------------------------------------------------- */
  onStatus: async ({ sock, key, msg }) => {
    const cfg = loadConfig();
    if (!cfg.enabled) return;

    // Safety Checks
    if (key.fromMe) return; // Don't react to self

    // 1. View Status (Mark Read)
    // Random delay to look human
    const viewTime = Math.floor(Math.random() * (cfg.viewDelayMax - cfg.viewDelayMin) + cfg.viewDelayMin);
    await delay(viewTime);

    try {
      // Using the correct read key structure for Baileys
      await sock.readMessages([key]);
    } catch (e) {
      // Ignore read errors (common in status broadcasts)
    }

    // 2. React to Status
    if (cfg.react) {
      const author = key.participant;
      const now = Date.now();
      const last = lastReact.get(author) || 0;

      // Throttle: Only react once every X seconds per person
      if (now - last < cfg.throttleMs) return;

      await delay(1000); // Small pause before reacting

      try {
        await sock.sendMessage('status@broadcast', {
          react: { text: cfg.emoji, key: key }
        }, { statusJidList: [key.participant] }); // Crucial for status reactions

        lastReact.set(author, now);
      } catch (e) {
        // Ignore reaction errors (encryption issues)
      }
    }
  }
};