let bioInterval = null;

/* -------------------------------------------------------
   CONFIGURATION: The Phrase Bank
------------------------------------------------------- */
const phrases = [
  // 🌑 Dark / Philosophical
  'The void stares back.',
  'Silence is an answer.',
  'We are but dust.',
  'Shadows do not bleed.',
  'Chaos is a ladder.',

  // 🏛️ Ancient / Latin
  'Memento Mori.',        // Remember you must die
  'Amor Fati.',           // Love your fate
  'Tempus Fugit.',        // Time flies
  'Sic Parvis Magna.',    // Greatness from small beginnings
  'Veni, Vidi, Vici.',    // I came, I saw, I conquered

  // 🦉 Advisory / Wisdom
  'Trust no one completely.',
  'Listen more, speak less.',
  'Patience is a weapon.',
  'Observe the unseen.',

  // 👾 Fun / Tech
  '404: Reality Not Found.',
  'Loading consciousness...',
  'Running on caffeine.',
  'Error: Human undefined.',
  'I see you looking.'
];

export default {
  name: 'autobio',
  alias: ['setbio', 'bio'],

  command: {
    pattern: 'autobio',
    desc: 'Toggle atmospheric auto-updating profile status',
    category: 'admin',
    react: '🎭',

    run: async ({ sock, msg, args }) => {
      const mode = args[0]?.toLowerCase();

      // 1. Handle "ON"
      if (mode === 'on') {
        if (bioInterval) {
          return await sock.sendMessage(msg.key.remoteJid, { text: '⚠️ The cycle is already running.' }, { quoted: msg });
        }

        const newLocal = '🌑 Vesperr bio running';
        await sock.sendMessage(msg.key.remoteJid, { text: newLocal }, { quoted: msg });

        // Start the loop
        bioInterval = setInterval(async () => {
          try {
            // 1. Get Data
            const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });

            // 2. Pick a Random Phrase
            const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];

            // 3. Construct Bio
            // Format: [Phrase] | ⌚ [Time]
            // Example: Memento Mori. | ⌚ 10:00 AM
            const statusText = `${randomPhrase} | ⌚ ${time}`;

            // 4. Update
            await sock.updateProfileStatus(statusText);

          } catch (e) {
            console.error('Error updating bio:', e);
          }
        }, 60000); // Updates every 60 seconds

        // 2. Handle "OFF"
      } else if (mode === 'off') {
        if (!bioInterval) {
          return await sock.sendMessage(msg.key.remoteJid, { text: '⚠️ The cycle is not currently active.' }, { quoted: msg });
        }

        clearInterval(bioInterval);
        bioInterval = null;

        // Reset to static
        await sock.updateProfileStatus('🤖 Vesperr Systems | Offline');

        await sock.sendMessage(msg.key.remoteJid, { text: '🛑 Autobio silenced.' }, { quoted: msg });

      } else {
        await sock.sendMessage(msg.key.remoteJid, { text: 'Usage: *.autobio on* or *.autobio off*' }, { quoted: msg });
      }
    }
  }
};