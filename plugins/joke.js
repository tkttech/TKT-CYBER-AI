import axios from 'axios';

/* ---------------------------------------------------
   Anti-ban delay
--------------------------------------------------- */
function delay(min = 100, max = 350) {
  return new Promise((res) =>
    setTimeout(res, Math.floor(min + Math.random() * (max - min)))
  );
}

/* ---------------------------------------------------
   API Definitions
--------------------------------------------------- */

async function jokeOfficialJoke() {
  try {
    const r = await axios.get('https://official-joke-api.appspot.com/jokes/random', { timeout: 8000 });
    if (!r.data) return null;
    return `${r.data.setup}\n${r.data.punchline}`;
  } catch {
    return null;
  }
}

async function jokeJokeAPI() {
  try {
    const r = await axios.get('https://v2.jokeapi.dev/joke/Any?safe-mode', { timeout: 8000 });
    if (!r.data) return null;

    if (r.data.type === 'single') return r.data.joke;
    else return `${r.data.setup}\n${r.data.delivery}`;
  } catch {
    return null;
  }
}

// NEW API: Dad Jokes
async function jokeDad() {
  try {
    const r = await axios.get('https://icanhazdadjoke.com/', {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'VesperrBot (github.com/MidknightMantra/Vesperr)', // Required by this API
      },
      timeout: 8000,
    });
    return r.data?.joke || null;
  } catch {
    return null;
  }
}

async function jokeProgramming() {
  try {
    const r = await axios.get('https://official-joke-api.appspot.com/jokes/programming/random', { timeout: 8000 });
    const j = r.data?.[0];
    if (!j) return null;
    return `${j.setup}\n${j.punchline}`;
  } catch {
    return null;
  }
}

async function jokeGeek() {
  try {
    const r = await axios.get('https://geek-jokes.sameerkumar.website/api?format=json', { timeout: 8000 });
    return r.data?.joke || null;
  } catch {
    return null;
  }
}

async function jokeAnime() {
  try {
    const r = await axios.get('https://animechan.vercel.app/api/random', { timeout: 8000 });
    if (!r.data) return null;
    return `💬 "${r.data.quote}"\n— ${r.data.character} (${r.data.anime})`;
  } catch {
    return null;
  }
}

/* Chain for RANDOM jokes */
const RANDOM_JOKES = [
  jokeOfficialJoke,
  jokeJokeAPI,
  jokeDad,
  jokeGeek, // Geek jokes are general enough for random
];

/* ---------------------------------------------------
   EXPORT AS VESPERR PLUGIN
--------------------------------------------------- */
export default {
  name: 'joke',

  command: {
    pattern: 'joke',
    desc: 'Tells a joke by category',
    category: 'fun',
    react: '😈',

    run: async ({ sock, msg, args }) => {
      const chat = msg.key.remoteJid;
      const category = args[0] ? args[0].toLowerCase() : 'random';

      // React
      try {
        await sock.sendMessage(chat, { react: { text: '😈', key: msg.key } });
      } catch { }

      // If no category, show help
      if (!args.length) {
        return sock.sendMessage(chat, {
          text: '🃏 *Joke Categories:*\n\n• .joke (random)\n• .joke dad\n• .joke prog\n• .joke geek\n• .joke quote (anime)'
        }, { quoted: msg });
      }

      await delay();

      let joke = null;
      let title = 'A jest from the shadows:';

      // Select API based on category
      try {
        switch (category) {
        case 'prog':
        case 'programming':
          title = 'A digital conundrum:';
          joke = await jokeProgramming();
          break;
        case 'geek':
          title = 'A nerdy notion:';
          joke = await jokeGeek();
          break;
        case 'quote':
        case 'anime':
          title = 'A whisper from another world:';
          joke = await jokeAnime();
          break;
        case 'dad':
          title = 'A groan-worthy observation:';
          joke = await jokeDad();
          break;
        default:
          // "random" or any other arg runs the main waterfall
          title = 'A random jest:';
          for (const api of RANDOM_JOKES) {
            joke = await api();
            if (joke) break; // Stop as soon as one works
          }
        }
      } catch (e) {
        console.error('Joke API failed:', e);
      }

      // Final fallback
      if (!joke) {
        joke = 'The void is silent… no jokes emerged.';
      }

      return sock.sendMessage(
        chat,
        { text: `🃏 *${title}*\n\n${joke}` },
        { quoted: msg }
      );
    },
  },
};