import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONF = path.join(__dirname, 'nsfw.json');
let cfg = { enabled: false };

try { cfg = JSON.parse(fs.readFileSync(CONF)); } catch { }

function save() { fs.writeFileSync(CONF, JSON.stringify(cfg, null, 2)); }

export default {
  name: 'waifu18',
  command: {
    pattern: 'waifu18',
    desc: 'Toggle NSFW',
    category: 'anime',
    react: '🔞',

    run: async ({ sock, msg, args }) => {
      const chat = msg.key.remoteJid;

      if (!msg.key.fromMe)
        return sock.sendMessage(chat, { text: 'Owner only!' });

      const opt = (args[0] || '').toLowerCase();
      if (!['on', 'off'].includes(opt))
        return sock.sendMessage(chat, { text: 'Usage: .waifu18 on/off' });

      cfg.enabled = opt === 'on';
      save();

      return sock.sendMessage(chat, {
        text: `NSFW mode: ${cfg.enabled ? 'ENABLED' : 'DISABLED'}`
      });
    }
  }
};
