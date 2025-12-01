import axios from 'axios';

/* -----------------------------------------------------------
   🛠️ HELPER: URL to Buffer
----------------------------------------------------------- */
async function getBuffer(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data, 'utf-8');
  } catch (err) {
    return null;
  }
}

/* -----------------------------------------------------------
   🎨 PROVIDER 1: Pollinations (Flux Model) - BEST QUALITY
   Updated: Added &nologo=true to remove watermark
----------------------------------------------------------- */
async function genFlux(prompt) {
  try {
    const seed = Math.floor(Math.random() * 1000000);
    // ✅ ADDED &nologo=true
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;
    const buffer = await getBuffer(url);
    return buffer ? { img: buffer, model: 'Flux (Realism)' } : null;
  } catch { return null; }
}

/* -----------------------------------------------------------
   🎨 PROVIDER 2: Pollinations (Turbo Model) - FASTEST
   Updated: Added &nologo=true to remove watermark
----------------------------------------------------------- */
async function genTurbo(prompt) {
  try {
    const seed = Math.floor(Math.random() * 1000000);
    // ✅ ADDED &nologo=true
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&model=turbo&nologo=true`;
    const buffer = await getBuffer(url);
    return buffer ? { img: buffer, model: 'Turbo (Speed)' } : null;
  } catch { return null; }
}

/* -----------------------------------------------------------
   🎨 PROVIDER 3: DarkAI (DALL-E 3 Wrapper)
----------------------------------------------------------- */
async function genDarkAI(prompt) {
  try {
    const { data } = await axios.get(`https://dark-yasiya-api-new.vercel.app/ai/dalle?text=${encodeURIComponent(prompt)}`);
    if (data && data.status && data.result) {
      const buffer = await getBuffer(data.result);
      return buffer ? { img: buffer, model: 'DALL-E 3 (Wrapper)' } : null;
    }
    return null;
  } catch { return null; }
}

/* -----------------------------------------------------------
   🎨 PROVIDER 4: BK9 (Anime/Magic Model)
----------------------------------------------------------- */
async function genBK9(prompt) {
  try {
    const { data } = await axios.get(`https://bk9.fun/ai/magicstudio?prompt=${encodeURIComponent(prompt)}`);
    if (data && data.status && data.BK9) {
      const buffer = await getBuffer(data.BK9);
      return buffer ? { img: buffer, model: 'Magic Studio' } : null;
    }
    return null;
  } catch { return null; }
}

/* -----------------------------------------------------------
   🚀 MASTER CONTROLLER
----------------------------------------------------------- */
export default {
  name: 'imagine',
  alias: ['draw', 'img', 'dalle', 'art', 'generate'],

  command: {
    pattern: 'imagine',
    desc: 'Generate AI art (No Watermark)',
    category: 'ai',
    react: '🎨',

    run: async ({ sock, msg, args }) => {
      const chat = msg.key.remoteJid;
      const prompt = args.join(' ');

      if (!prompt) {
        return await sock.sendMessage(chat, {
          text: '🎨 *Vesperr Studio*\n\nUsage: `.imagine <concept>`\nExample: `.imagine A futuristic city made of glass`'
        }, { quoted: msg });
      }

      try { await sock.sendMessage(chat, { react: { text: '🖌️', key: msg.key } }); } catch { }

      // Waterfall Strategy
      let result = await genFlux(prompt);

      if (!result) {
        console.log('Flux failed, switching to Turbo...');
        result = await genTurbo(prompt);
      }
      if (!result) {
        console.log('Turbo failed, switching to DarkAI...');
        result = await genDarkAI(prompt);
      }
      if (!result) {
        console.log('DarkAI failed, switching to BK9...');
        result = await genBK9(prompt);
      }

      if (!result) {
        try { await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }); } catch { }
        return await sock.sendMessage(chat, { text: '❌ All image engines are currently busy. Please try again later.' }, { quoted: msg });
      }

      await sock.sendMessage(chat, {
        image: result.img,
        caption: `🎨 *TKT-CYBER-AI Vision*\n"${prompt}"`
      }, { quoted: msg });

      try { await sock.sendMessage(chat, { react: { text: '🖼️', key: msg.key } }); } catch { }
    }
  }
};