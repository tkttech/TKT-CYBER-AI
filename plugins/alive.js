import fs from 'fs';
import path from 'path';
import config from '../src/config/environment.js';

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

export default {
  name: 'alive',
  command: {
    pattern: 'alive',
    desc: 'Check if Vesperr is online',
    react: '⚡',
    category: 'core',

    run: async ({ sock, msg }) => {
      const chat = msg.key.remoteJid;
      const start = process.uptime();
      const uptime = formatUptime(start);

      const text =
        '⚡ *TKT-CYBER-AI System Online*\n\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        `🤖 *Bot Name:* ${config.botName}\n` +
        `⏳ *Uptime:* ${uptime}\n` +
        `👑 *Owner:* ${config.ownerNumber || 'System'}\n` +
        '━━━━━━━━━━━━━━━━━━\n\n' +
        '*“Efficiency is the essence of survival.”*\n\n' +
        '➤ Try *.menu* to see available commands.';

      // PATHS
      const imgPath = path.join(process.cwd(), 'assets', 'logo.jpg');

      // FAKE CHANNEL FORWARDING (Aesthetic)
      const contextInfo = {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: '120363418027651738@newsletter', // Placeholder JID
          newsletterName: 'TKT-CYBER-AI Systems',
          serverMessageId: -1
        }
      };

      // 1. Image with Caption
      if (fs.existsSync(imgPath)) {
        return await sock.sendMessage(chat, {
          image: fs.readFileSync(imgPath),
          caption: text,
          contextInfo
        }, { quoted: msg });
      }

      // 2. Text Only
      return sock.sendMessage(chat, { text, contextInfo }, { quoted: msg });
    }
  }
};