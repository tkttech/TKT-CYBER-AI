const { proto } = require('@whiskeysockets/baileys');

/* -------------------------------------------------------
   ⚙️ CONFIGURATION
------------------------------------------------------- */
const OWNER_NAME = 'TAFADZWA TKT & TKT-TECH🇿🇼';
const OWNER_NUMBER = '263718095555'; // Country code + Number (No + sign)
const OWNER_ORG = 'TKT-TECH🇿🇼';
const GITHUB_URL = 'https://github.com/tkttech/TKT-CYBER-AI';
const INSTAGRAM_URL = 'https://instagram.com/Tafadzwatkt';

/* -------------------------------------------------------
   PLUGIN
------------------------------------------------------- */
export default {
  name: 'owner',
  alias: ['creator', 'dev'],

  command: {
    pattern: 'owner',
    desc: 'Bot owner\'s contact card',
    category: 'general',
    react: '👑',

    run: async ({ sock, msg }) => {
      const chat = msg.key.remoteJid;

      // 1. Construct vCard (VCF)
      // This tells WhatsApp how to display the "Add Contact" button
      const vcard =
        'BEGIN:VCARD\n' +
        'VERSION:3.0\n' +
        `FN:${OWNER_NAME}\n` + // Full Name
        `ORG:${OWNER_ORG};\n` + // Organization
        `TEL;type=CELL;type=VOICE;waid=${OWNER_NUMBER}:${OWNER_NUMBER}\n` + // WhatsApp ID
        'END:VCARD';

      // 2. React
      try { await sock.sendMessage(chat, { react: { text: '👑', key: msg.key } }); } catch { }



      // 3. Send Contact Message
      await sock.sendMessage(chat, {
        contacts: {
          displayName: OWNER_NAME,
          contacts: [{ vcard }]
        }
      }, { quoted: msg });

      // 4. Send Follow-up Text with Links
      const caption =
        '👑 *Developer Info*\n\n' +
        `👤 *Name:* ${OWNER_NAME}\n` +
        `📞 *Chat:* wa.me/${OWNER_NUMBER}\n` +
        `💻 *GitHub:* ${GITHUB_URL}\n` +
        `📸 *Instagram:* ${INSTAGRAM_URL}\n\n` +
        '_Feel free to contact for updates, bugs, or feature requests._';

      // Optional: Send as text or image
      return sock.sendMessage(chat, {
        text: caption,
        contextInfo: {
          externalAdReply: {
            title: 'TKT-CYBER-AI- The Sentinel',
            body: 'Contact the Creator',
            thumbnailUrl: 'https://files.catbox.moe/vnu745.png', // Replace with your own image URL
            sourceUrl: GITHUB_URL,
            mediaType: 1,
            renderLargerThumbnail: true
          }
        }
      }, { quoted: msg });
    }
  }
};