import axios from 'axios';

/* -------------------------------------------------------
   HELPER: Detect Platform
------------------------------------------------------- */
function getPlatform(url) {
  if (url.includes('instagram.com')) return 'Instagram';
  if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) return 'TikTok';
  if (url.includes('facebook.com') || url.includes('fb.watch')) return 'Facebook';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'Twitter';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
  return 'Unknown';
}

/* -------------------------------------------------------
   ENGINE 1: SIPUTZX (Primary - Strong AIO)
------------------------------------------------------- */
async function engineSiputzx(url) {
  try {
    const { data } = await axios.get(`https://api.siputzx.my.id/api/d/save?url=${url}`);
    if (data.status && data.data && data.data.length > 0) {
      return {
        video: data.data[0].url,
        caption: 'TKT-CYBER-AI Download (Siputzx)',
        source: 'Siputzx'
      };
    }
  } catch (e) {
    // console.log("Siputzx Failed");
  }
  return null;
}

/* -------------------------------------------------------
   ENGINE 2: WIDIPE (Secondary - Very Fast)
------------------------------------------------------- */
async function engineWidipe(url) {
  try {
    const { data } = await axios.get(`https://widipe.is-a.dev/api/dl/social?url=${url}`);
    if (data.result && data.result.url) {
      // Sometimes it returns an array of media, sometimes a single object
      const vidUrl = Array.isArray(data.result.url) ? data.result.url[0] : data.result.url;
      return {
        video: vidUrl,
        caption: 'TKT-CYBER-AI Download (Widipe)',
        source: 'Widipe'
      };
    }
  } catch (e) {
    // console.log("Widipe Failed");
  }
  return null;
}

/* -------------------------------------------------------
   ENGINE 3: RYZENDESU (Tertiary - Platform Specific)
------------------------------------------------------- */
async function engineRyzen(url, platform) {
  try {
    let apiUrl = '';
    if (platform === 'Instagram') apiUrl = `https://api.ryzendesu.vip/api/downloader/igdl?url=${url}`;
    if (platform === 'Facebook') apiUrl = `https://api.ryzendesu.vip/api/downloader/fbdl?url=${url}`;
    if (platform === 'Twitter') apiUrl = `https://api.ryzendesu.vip/api/downloader/twitter?url=${url}`;

    if (apiUrl) {
      const { data } = await axios.get(apiUrl);
      if (data.success && data.data) {
        // Handle array structure
        const media = Array.isArray(data.data) ? data.data[0].url : data.media;
        if (media) {
          return { video: media, caption: 'TKT-CYBER-AI Download (Ryzen)', source: 'Ryzen' };
        }
      }
    }
  } catch (e) { }
  return null;
}

/* -------------------------------------------------------
   ENGINE 4: NAYAN (Final Backup)
------------------------------------------------------- */
async function engineNayan(url) {
  try {
    const { data } = await axios.get(`https://api.nayan-project.moe/nayan/video_downloader?url=${url}`);
    if (data.data) {
      const vid = data.data.high || data.data.low || data.data.video;
      if (vid) return { video: vid, caption: 'Vesperr Download (Nayan)', source: 'Nayan' };
    }
  } catch (e) { }
  return null;
}

/* -------------------------------------------------------
   MASTER CONTROLLER
------------------------------------------------------- */
export default {
  name: 'downloader',
  alias: ['dl', 'insta', 'tiktok', 'fb', 'twitter'],

  command: {
    pattern: 'download',
    desc: 'Universal Video Downloader (Cloud-Safe Engines)',
    category: 'media',
    react: '⬇️',

    run: async ({ sock, msg, args }) => {
      const chat = msg.key.remoteJid;
      const query = args.join(' ');

      if (!query) {
        return await sock.sendMessage(chat, {
          text: '⬇️ *Universal Downloader*\n\nUsage: `.dl <link>`\nSupports: IG, TikTok, FB, Twitter, YT Shorts'
        }, { quoted: msg });
      }

      const platform = getPlatform(query);
      if (platform === 'Unknown') {
        return await sock.sendMessage(chat, { text: '❌ Link not supported.' }, { quoted: msg });
      }

      // 1. React
      try { await sock.sendMessage(chat, { react: { text: '⏳', key: msg.key } }); } catch { }

      try {
        // 2. Execute Waterfall
        let media = null;

        // Attempt 1: Siputzx
        if (!media) media = await engineSiputzx(query);

        // Attempt 2: Widipe
        if (!media) media = await engineWidipe(query);

        // Attempt 3: Ryzen (Specifics)
        if (!media) media = await engineRyzen(query, platform);

        // Attempt 4: Nayan
        if (!media) media = await engineNayan(query);


        // 3. Handle Failure
        if (!media || !media.video) {
          return await sock.sendMessage(chat, { text: `❌ Failed to download from ${platform}. The link might be private.` }, { quoted: msg });
        }

        // 4. Send Video

        await sock.sendMessage(chat, {
          video: { url: media.video },
          caption: `⬇️ *TKT-CYBER-AI Downloader*\n📡 *Platform:* ${platform}\n⚙️ *Engine:* ${media.source}`
        }, { quoted: msg });

        try { await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }); } catch { }

      } catch (error) {
        console.error('DL Error:', error.message);
        await sock.sendMessage(chat, { text: '❌ System Error during download.' }, { quoted: msg });
      }
    }
  }
};