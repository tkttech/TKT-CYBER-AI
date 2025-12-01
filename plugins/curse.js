const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// Gothic fantasy curse lines
const CURSES = [
  'May your shadow whisper secrets you are not ready to hear.',
  'May every candle you light tremble with unseen breath.',
  'May your footsteps echo where no hallways exist.',
  'May the moon follow you… even indoors.',
  'May ink spill in patterns only the dead can read.',
  'May your reflection blink when you do not.',
  'May whispers greet you from rooms you thought were empty.',
  'May forgotten names rise unbidden to your tongue.',
  'May old books open themselves in your presence.',
  'May your dreams walk ahead of you into waking life.',
  'May your shadow lag behind… as if reluctant.',
  'May ravens gather where you rest and stare knowingly.',
  'May cold fingers brush your neck when you are alone.',
  'May every locked door rattle once as you pass.',
  'May mirrors fog with words you didn’t speak.',
  'May the wind call your name with a voice too familiar.',
  'May the night remember you more clearly than the day.',
  'May forgotten spirits pause when you speak.',
  'May the ground beneath you hum with ancient warnings.',
  'May unseen footsteps follow at the edge of your hearing.'
];

function randomCurse() {
  return CURSES[Math.floor(Math.random() * CURSES.length)];
}

export default {
  name: 'curse',

  command: {
    pattern: 'curse',
    desc: 'Cast a dark, harmless fantasy curse',
    category: 'fun',
    react: '🕯️',

    run: async ({ sock, msg }) => {
      const chat = msg.key.remoteJid;
      const myJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      const sender = msg.key.participant || msg.key.remoteJid;

      try {
        await sock.sendMessage(chat, { react: { text: '🕯️', key: msg.key } });
      } catch { }

      // Random delay for dramatic effect
      await delay(Math.floor(Math.random() * 200) + 150);

      // 1. CHECK FOR TARGET (Mention OR Quoted Reply)
      const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
      const mentioned = contextInfo?.mentionedJid?.[0];
      const quoted = contextInfo?.participant;

      const target = mentioned || quoted || null;
      const curseLine = randomCurse();

      // 2. TARGET EXISTS
      if (target) {
        // FUN: If they try to curse the bot, bounce it back!
        if (target === myJid) {
          return sock.sendMessage(chat, {
            text: `🔮 *The curse rebounds!* \n\n_Reflections cannot be cursed. The shadows turn back upon you, <@${sender.split('@')[0]}>..._\n\n_${curseLine}_`,
            mentions: [sender]
          }, { quoted: msg });
        }

        return sock.sendMessage(
          chat,
          {
            text: `🕯️ *A shadowy curse has been whispered upon* <@${target.split('@')[0]}>:\n\n_${curseLine}_`,
            mentions: [target],
          },
          { quoted: msg }
        );
      }

      // 3. NO TARGET (General Curse)
      return sock.sendMessage(
        chat,
        {
          text: `🕯️ *The void speaks to the air...*\n\n_${curseLine}_`,
        },
        { quoted: msg }
      );
    },
  },
};