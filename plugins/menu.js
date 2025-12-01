import fs from 'fs';
import path from 'path';
import os from 'os';

/* -------------------------------------------------------
   HELPER: Fancy Font Converter (Typewriter Style)
------------------------------------------------------- */
const fontMap = {
  'a': '𝚊', 'b': '𝚋', 'c': '𝚌', 'd': '𝚍', 'e': '𝚎', 'f': '𝚏', 'g': '𝚐', 'h': '𝚑', 'i': '𝚒', 'j': '𝚓', 'k': '𝚔', 'l': '𝚕', 'm': '𝚖', 'n': '𝚗', 'o': '𝚘', 'p': '𝚙', 'q': '𝚚', 'r': '𝚛', 's': '𝚜', 't': '𝚝', 'u': '𝚞', 'v': '𝚟', 'w': '𝚠', 'x': '𝚡', 'y': '𝚢', 'z': '𝚣',
  'A': '𝙰', 'B': '𝙱', 'C': '𝙲', 'D': '𝙳', 'E': '𝙴', 'F': '𝙵', 'G': '𝙶', 'H': '𝙷', 'I': '𝙸', 'J': '𝙹', 'K': '𝙺', 'L': '𝙻', 'M': '𝙼', 'N': '𝙽', 'O': '𝙾', 'P': '𝙿', 'Q': '𝚀', 'R': '𝚁', 'S': '𝚂', 'T': '𝚃', 'U': '𝚄', 'V': '𝚅', 'W': '𝚆', 'X': '𝚇', 'Y': '𝚈', 'Z': '𝚉',
  '0': '0', '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9'
};

function toFancy(text) {
  return text.split('').map(c => fontMap[c] || c).join('');
}

/* -------------------------------------------------------
   HELPER: Uptime
------------------------------------------------------- */
function getUptime() {
  const uptime = process.uptime();
  const h = Math.floor(uptime / 3600);
  const m = Math.floor((uptime % 3600) / 60);
  const s = Math.floor(uptime % 60);
  return `${h}h ${m}m ${s}s`;
}

/* -------------------------------------------------------
   HELPER: Time Greeting
------------------------------------------------------- */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export default {
  name: 'menu',
  alias: ['list', 'commands'],

  command: {
    pattern: 'menu',
    desc: 'Display the command codex',
    category: 'core',
    react: '📜',

    run: async ({ sock, msg, args }) => {
      const chat = msg.key.remoteJid;
      const name = msg.pushName || 'User';

      // 1. Retrieve Plugins
      const pluginManager = global.VESPERR?.pluginManager;
      const commands = [];
      let totalCmds = 0;

      if (pluginManager && pluginManager.commands) {
        pluginManager.commands.forEach(p => {
          if (p.command && p.command.pattern) {
            totalCmds++;
            commands.push({
              cmd: p.command.pattern,
              alias: p.alias || [],
              desc: p.command.desc,
              category: p.command.category || 'others'
            });
          }
        });
      }

      const categories = {};
      commands.forEach(c => {
        if (!categories[c.category]) categories[c.category] = [];
        categories[c.category].push(c);
      });

      // 3. Build Menu Text (NEW DESIGN)
      let text = `╭━━━[ 𝐓𝐊𝐓-𝐂𝐘𝐁𝐄𝐑-𝐀𝐈 ]━━━⬣
┃ 👋 ${getGreeting()}, *${name}*
┃ 
┃ ⌚ *Uptime:* ${getUptime()}
┃ 📟 *Ram:* ${os.loadavg()[0].toFixed(2)}%
┃ 📂 *Total:* ${totalCmds} Commands
╰━━━━━━━━━━━━━━⬣\n`;

      const keys = Object.keys(categories).sort();

      for (const cat of keys) {
        // Fancy Category Header
        text += `\n╭──『 *${cat.toUpperCase()}* 』───➤\n`;

        categories[cat].sort((a, b) => a.cmd.localeCompare(b.cmd));

        const catCmds = categories[cat];
        catCmds.forEach((cmd, index) => {
          const isLast = index === catCmds.length - 1;
          // Changes the connector based on if it is the last item or not
          const branch = isLast ? '╰' : '├';
          const aliasText = cmd.alias.length > 0 ? ` (${cmd.alias[0]})` : '';

          // Applying fancy font to the command name
          text += `┃ ${branch} ✧ ${toFancy(cmd.cmd)}${aliasText}\n`;
        });
        // Optional: Close the block visually if you want extra spacing
        if (keys.indexOf(cat) === keys.length - 1) {
          text += '╰───────────────\n';
        }
      }

      text += '\n_© 2025 TKT-CYBER-AI Systems_';

      // 4. Prepare Message Options
      const localPath = path.join(process.cwd(), 'assets', 'logo.jpg');
      let messagePayload = {};

      if (fs.existsSync(localPath)) {
        const imageBuffer = fs.readFileSync(localPath);
        messagePayload = {
          image: imageBuffer,
          caption: text
        };
      } else {
        messagePayload = {
          text: text
        };
      }

      messagePayload.contextInfo = {
        externalAdReply: {
          title: 'TKT-CYBER-AI Menu',
          body: 'System Online',
          sourceUrl: 'https://github.com/tkttech/TKT-CYBER-AI',
          mediaType: 1,
          renderLargerThumbnail: true
        }
      };

      // 5. Send Message
      await sock.sendMessage(chat, messagePayload, { quoted: msg });
    }
  }
};