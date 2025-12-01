import fs from 'fs';
import path from 'path';

export default {
  name: 'help',

  command: {
    pattern: 'help',
    desc: 'Reveal Vesperr\'s capabilities',
    category: 'core',
    react: '❓',

    run: async ({ sock, msg }) => {
      const chat = msg.key.remoteJid;

      /* -------------------------------------------------------
         Collect plugin commands dynamically
      ------------------------------------------------------- */
      const pluginManager = global.VESPERR?.pluginManager;
      const commands = [];

      if (pluginManager && pluginManager.commands) {
        pluginManager.commands.forEach(p => {
          if (p.command && p.command.pattern) {
            commands.push({
              name: p.command.pattern,
              desc: p.command.desc || 'No description',
              category: p.command.category || 'misc',
            });
          }
        });
      }

      // Group by categories
      const grouped = {};
      for (const cmd of commands) {
        if (!grouped[cmd.category]) grouped[cmd.category] = [];
        grouped[cmd.category].push(cmd);
      }

      /* -------------------------------------------------------
         Build Help Text
      ------------------------------------------------------- */
      let helpText = `
┏━━━━━━━━━━━━━━━━━━━━━━┓
   ⚡ *TKT-CYBER-AI— System Core*
┗━━━━━━━━━━━━━━━━━━━━━━┛

📜 *Commands Found:* ${commands.length}

*— Command Codex —*
`;

      for (const cat of Object.keys(grouped).sort()) {
        helpText += `\n┏━━━〔 ${cat.toUpperCase()} 〕━━━\n`;
        for (const item of grouped[cat]) {
          helpText += `┃ ◈ *.${item.name}* — ${item.desc}\n`;
        }
        helpText += '┗━━━━━━━━━━━━━━\n';
      }

      helpText += '\n🜁 *Check latency: .ping*\n';

      /* -------------------------------------------------------
         Optional Image (Codex)
      ------------------------------------------------------- */
      const imgPath = path.join(process.cwd(), 'assets', 'logo.jpg');
      const hasImg = fs.existsSync(imgPath);

      if (hasImg) {
        try {
          const img = fs.readFileSync(imgPath);

          return await sock.sendMessage(
            chat,
            {
              image: img,
              caption: helpText,
              contextInfo: {
                isForwarded: true,
                forwardingScore: 1,
              },
            },
            { quoted: msg }
          );
        } catch (e) {
          console.warn('Codex image failed:', e.message);
        }
      }

      /* -------------------------------------------------------
         Fallback to text-only
      ------------------------------------------------------- */
      return sock.sendMessage(
        chat,
        {
          text: helpText,
          contextInfo: {
            isForwarded: true,
            forwardingScore: 1,
          },
        },
        { quoted: msg }
      );
    },
  },
};
