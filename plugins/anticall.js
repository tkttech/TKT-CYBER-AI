import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* -------------------------------------------------------
   CONFIG HANDLER
------------------------------------------------------- */
const CONFIG_DIR = path.join(__dirname, 'config');
const CONFIG_PATH = path.join(CONFIG_DIR, 'anticall.json');

if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
if (!fs.existsSync(CONFIG_PATH)) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ enabled: true, autoBlock: true }, null, 2));
}

function readCfg() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch { return { enabled: true, autoBlock: true }; }
}

function saveCfg(c) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(c, null, 2));
}

/* -------------------------------------------------------
   TEMP CACHE (To prevent spamming the same caller)
------------------------------------------------------- */
const processedCalls = new Set();

/* -------------------------------------------------------
   PLUGIN
------------------------------------------------------- */
export default {
  name: 'anticall',

  // Initialize the listener
  init: async ({ sock }) => {
    // Listen for call events
    sock.ev.on('call', async (events) => {
      const cfg = readCfg();
      if (!cfg.enabled) return;

      for (const call of events) {
        // We only care about INCOMING calls (status: 'offer')
        if (call.status !== 'offer') continue;

        const callerId = call.from;
        const callId = call.id;

        // Prevent handling the same call ID twice
        if (processedCalls.has(callId)) continue;
        processedCalls.add(callId);

        // Clear cache after 1 minute to save memory
        setTimeout(() => processedCalls.delete(callId), 60000);

        console.log(`[AntiCall] Incoming call from ${callerId}`);

        // 1. Send Warning Message
        try {
          await sock.sendMessage(callerId, {
            text: '📵 *Vesperr System:*\nCalls are automatically rejected. Please use text messages only.\n\n_Repeated calls will lead to an automatic block._'
          });
        } catch (e) {
          console.error('[AntiCall] Failed to send warning:', e.message);
        }

        // 2. Auto Block (if enabled)
        if (cfg.autoBlock) {
          try {
            // Small delay to ensure the message sends first
            await new Promise(r => setTimeout(r, 2000));

            await sock.updateBlockStatus(callerId, 'block');
            console.log(`[AntiCall] Blocked user: ${callerId}`);
          } catch (e) {
            console.error('[AntiCall] Failed to block:', e.message);
          }
        }
      }
    });
  },

  command: {
    pattern: 'anticall',
    desc: 'Manage Anti-Call settings',
    category: 'settings',
    react: '📵',

    run: async ({ sock, msg, args }) => {
      const chat = msg.key.remoteJid;

      // Security: Ensure only the bot owner can toggle this
      if (!msg.key.fromMe) return;

      const cfg = readCfg();
      const mode = args[0]?.toLowerCase();
      const val = args[1]?.toLowerCase();

      if (!mode) {
        return sock.sendMessage(chat, {
          text: '📵 *Anti-Call Configuration*\n\n' +
            `• *Status:* ${cfg.enabled ? '✅ On' : '❌ Off'}\n` +
            `• *Auto-Block:* ${cfg.autoBlock ? '✅ On' : '❌ Off'}\n\n` +
            '*Commands:*\n' +
            '• .anticall on\n' +
            '• .anticall off\n' +
            '• .anticall block on\n' +
            '• .anticall block off'
        }, { quoted: msg });
      }

      if (mode === 'on') {
        cfg.enabled = true;
        saveCfg(cfg);
        return sock.sendMessage(chat, { text: '✅ Anti-Call has been *ENABLED*.' }, { quoted: msg });
      }

      if (mode === 'off') {
        cfg.enabled = false;
        saveCfg(cfg);
        return sock.sendMessage(chat, { text: '❌ Anti-Call has been *DISABLED*.' }, { quoted: msg });
      }

      if (mode === 'block') {
        if (val === 'on') {
          cfg.autoBlock = true;
          saveCfg(cfg);
          return sock.sendMessage(chat, { text: '🔒 Auto-Blocking is now *ENABLED* for callers.' }, { quoted: msg });
        }
        if (val === 'off') {
          cfg.autoBlock = false;
          saveCfg(cfg);
          return sock.sendMessage(chat, { text: '🔓 Auto-Blocking is now *DISABLED*.' }, { quoted: msg });
        }
      }

      return sock.sendMessage(chat, { text: '❌ Invalid command usage.' }, { quoted: msg });
    }
  }
};