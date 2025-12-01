import axios from 'axios';

export default {
  name: 'wiki',
  alias: ['wikipedia', 'whatis', 'encyclopedia'],

  command: {
    pattern: 'wiki',
    desc: 'Search Wikipedia (Image First, then Detail)',
    category: 'education',
    react: '📚',

    run: async ({ sock, msg, args }) => {
      const chat = msg.key.remoteJid;
      const query = args.join(' ');

      if (!query) {
        return await sock.sendMessage(chat, {
          text: '📚 *Wikipedia Search*\n\nUsage: `.wiki <topic>`\nExample: `.wiki Albert Einstein`'
        }, { quoted: msg });
      }

      try { await sock.sendMessage(chat, { react: { text: '🔍', key: msg.key } }); } catch { }

      try {
        // 1. Fetch Data (Intro only)
        const { data } = await axios.get('https://en.wikipedia.org/w/api.php', {
          params: {
            action: 'query',
            format: 'json',
            prop: 'extracts|pageimages',
            titles: query,
            explaintext: 1,    // Clean text
            exintro: 1,        // Get the full introduction (Detailed)
            redirects: 1,
            pithumbsize: 1000  // High Quality Image
          },
          headers: {
            'User-Agent': 'VesperrBot/1.0 (Educational WhatsApp Bot)'
          }
        });

        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        const pageData = pages[pageId];

        // Handle Not Found
        if (pageId === '-1') {
          return await sock.sendMessage(chat, { text: `❌ *Not Found*\n\nNo article found for "${query}".` }, { quoted: msg });
        }

        const title = pageData.title;
        const text = pageData.extract || 'No text available.';
        const imageUrl = pageData.thumbnail?.source;
        const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;

        // Variable to store the sent image message object
        let sentImageMsg = null;

        // 2. STEP 1: Send Image (If available)
        if (imageUrl) {
          // We capture the result of this message in 'sentImageMsg'
          sentImageMsg = await sock.sendMessage(chat, {
            image: { url: imageUrl },
            caption: `📚 *${title}*`
          }, { quoted: msg });

          // ⚠️ Critical Delay: Wait 0.5s to ensure the image exists on the server
          await new Promise(r => setTimeout(r, 500));
        }

        // 3. STEP 2: Send Detailed Text
        const finalMessage = `📚 *${title}*\n────────────────\n${text}\n────────────────\n🔗 [Read Full Article](${pageUrl})`;

        // LOGIC CHANGE:
        // If we sent an image, we quote the image (sentImageMsg).
        // If there was no image, we quote the user's command (msg).
        const messageToQuote = sentImageMsg ? sentImageMsg : msg;

        await sock.sendMessage(chat, { text: finalMessage }, { quoted: messageToQuote });

        try { await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }); } catch { }

      } catch (error) {
        if (error.code === 'ENOTFOUND') {
          return await sock.sendMessage(chat, { text: '❌ *Network Error:* Cannot reach Wikipedia.' }, { quoted: msg });
        }
        console.error('Wiki Error:', error.message);
        await sock.sendMessage(chat, { text: '❌ Wiki system malfunction.' }, { quoted: msg });
      }
    }
  }
};