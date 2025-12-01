import axios from 'axios';

const accountDB = new Map();

/* -------------------------------------------------------
   HELPER: User-Agent Headers (Anti-Block)
------------------------------------------------------- */
const HEADERS = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
  }
};

/* -------------------------------------------------------
   HELPER: Fancy Font
------------------------------------------------------- */
const fontMap = {
  'a': '𝚊', 'b': '𝚋', 'c': '𝚌', 'd': '𝚍', 'e': '𝚎', 'f': '𝚏', 'g': '𝚐', 'h': '𝚑', 'i': '𝚒', 'j': '𝚓', 'k': '𝚔', 'l': '𝚕', 'm': '𝚖', 'n': '𝚗', 'o': '𝚘', 'p': '𝚙', 'q': '𝚚', 'r': '𝚛', 's': '𝚜', 't': '𝚝', 'u': '𝚞', 'v': '𝚟', 'w': '𝚠', 'x': '𝚡', 'y': '𝚢', 'z': '𝚣',
  'A': '𝙰', 'B': '𝙱', 'C': '𝙲', 'D': '𝙳', 'E': '𝙴', 'F': '𝙵', 'G': '𝙶', 'H': '𝙷', 'I': '𝙸', 'J': '𝙹', 'K': '𝙺', 'L': '𝙻', 'M': '𝙼', 'N': '𝙽', 'O': '𝙾', 'P': '𝙿', 'Q': '𝚀', 'R': '𝚁', 'S': '𝚂', 'T': '𝚃', 'U': '𝚄', 'V': '𝚅', 'W': '𝚆', 'X': '𝚇', 'Y': '𝚈', 'Z': '𝚉'
};
function toFancy(text) {
  return text.split('').map(c => fontMap[c] || c).join('');
}

/* -------------------------------------------------------
   PROVIDERS: API Logic
------------------------------------------------------- */
const PROVIDERS = {

  // 1. MAIL.TM (Best Quality)
  mailtm: {
    gen: async () => {
      const api = 'https://api.mail.tm';
      // Get Domain
      const dRes = await axios.get(`${api}/domains`, HEADERS);
      const domain = dRes.data['hydra:member'][0].domain;
      // Create Creds
      const user = 'user' + Math.floor(Math.random() * 100000);
      const pass = 'pass' + Math.floor(Math.random() * 100000);
      const email = `${user}@${domain}`;
      // Register
      await axios.post(`${api}/accounts`, { address: email, password: pass }, HEADERS);
      // Get Token
      const tRes = await axios.post(`${api}/token`, { address: email, password: pass }, HEADERS);
      return { email, token: tRes.data.token, provider: 'mailtm' };
    },
    inbox: async (email, token) => {
      const res = await axios.get('https://api.mail.tm/messages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data['hydra:member'].map(m => ({
        id: m.id,
        from: m.from.address,
        subject: m.subject,
        intro: m.intro || 'No preview'
      }));
    },
    read: async (email, id, token) => {
      const res = await axios.get(`https://api.mail.tm/messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return {
        from: res.data.from.address,
        subject: res.data.subject,
        body: res.data.text || res.data.html
      };
    }
  },

  // 2. TEMPMAIL.LOL (Fast, Token Based)
  tempmail_lol: {
    gen: async () => {
      const res = await axios.get('https://api.tempmail.lol/generate', HEADERS);
      return { email: res.data.address, token: res.data.token, provider: 'tempmail_lol' };
    },
    inbox: async (email, token) => {
      const res = await axios.get(`https://api.tempmail.lol/auth/${token}`, HEADERS);
      // Check if 'email' exists in response (structure varies)
      const msgs = res.data.email || [];
      return msgs.map(m => ({
        id: 'latest', // This API usually sends the full list, difficult to query single ID
        from: m.from,
        subject: m.subject,
        intro: m.body.substring(0, 30)
      }));
    },
    read: async (email, id, token) => {
      // Since this API returns full body in inbox, we refetch inbox and take the first
      const res = await axios.get(`https://api.tempmail.lol/auth/${token}`, HEADERS);
      const m = res.data.email[0]; // Just get latest
      if (!m) throw new Error('Email not found');
      return {
        from: m.from,
        subject: m.subject,
        body: m.body || m.html
      };
    }
  },

  // 3. 1SECMAIL (No Token, Public)
  onesecmail: {
    gen: async () => {
      const res = await axios.get('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1', HEADERS);
      return { email: res.data[0], token: null, provider: 'onesecmail' };
    },
    inbox: async (email) => {
      const [login, domain] = email.split('@');
      const res = await axios.get(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`, HEADERS);
      return res.data.map(m => ({
        id: m.id,
        from: m.from,
        subject: m.subject,
        intro: 'Click read to view'
      }));
    },
    read: async (email, id) => {
      const [login, domain] = email.split('@');
      const res = await axios.get(`https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${id}`, HEADERS);
      return {
        from: res.data.from,
        subject: res.data.subject,
        body: res.data.textBody || res.data.body
      };
    }
  }
};

export default {
  name: 'tempmail',
  alias: ['mail', 'tm'],

  command: {
    pattern: 'mail',
    desc: 'Multi-provider temp email (Failover supported)',
    category: 'tools',
    react: '📧',

    run: async ({ sock, msg, args }) => {
      const chat = msg.key.remoteJid;
      const subCommand = args[0] ? args[0].toLowerCase() : 'help';

      try {
        /* -----------------------------------------------
                   MODE 1: GENERATE (FAILOVER LOGIC)
                ----------------------------------------------- */
        if (subCommand === 'gen' || subCommand === 'create') {
          await sock.sendMessage(chat, { text: '🔄 *Vesperr generating mail...*' }, { quoted: msg });

          let data = null;
          let usedProvider = '';

          // Try Providers in Order
          try {
            console.log('Trying Mail.tm...');
            data = await PROVIDERS.mailtm.gen();
            usedProvider = 'Mail.tm';
          } catch (e) {
            console.log('Mail.tm failed, trying TempMail.lol...');
            try {
              data = await PROVIDERS.tempmail_lol.gen();
              usedProvider = 'TempMail.lol';
            } catch (e2) {
              console.log('TempMail.lol failed, trying 1secmail...');
              data = await PROVIDERS.onesecmail.gen();
              usedProvider = '1secMail';
            }
          }

          if (!data) {
            return await sock.sendMessage(chat, { text: '❌ *Critical:* All email providers failed.' }, { quoted: msg });
          }

          // Save to DB
          accountDB.set(data.email, { provider: data.provider, token: data.token });

          let text = '┏━━━━━━━━━━━━━━━━━━━┓\n';
          text += '┃ 📧 *Vesperr Mails*\n';
          text += '┗━━━━━━━━━━━━━━━━━━━┛\n\n';
          text += `📬 *Address:*\n\`${data.email}\`\n\n`;
          text += '👇 *Check Inbox:*\n';
          text += `> .mail inbox ${data.email}`;

          return await sock.sendMessage(chat, { text: text }, { quoted: msg });
        }

        /* -----------------------------------------------
                   MODE 2: CHECK INBOX
                ----------------------------------------------- */
        else if (subCommand === 'inbox' || subCommand === 'check') {
          const targetEmail = args[1];
          if (!targetEmail) return await sock.sendMessage(chat, { text: '⚠️ Provide email.' }, { quoted: msg });

          // Retrieve stored data
          const session = accountDB.get(targetEmail);

          // Fallback for 1secmail (doesn't need session if user types manually)
          if (!session && !targetEmail.includes('1secmail') && !targetEmail.includes('1sc')) {
            return await sock.sendMessage(chat, { text: '⚠️ I don\'t have the session key for this email. (Only works for emails generated recently)' }, { quoted: msg });
          }

          // Determine provider
          const providerKey = session ? session.provider : 'onesecmail'; // Default to onesecmail if manual check
          const token = session ? session.token : null;

          await sock.sendMessage(chat, { text: '🔄 *Fetching...*' }, { quoted: msg });

          const messages = await PROVIDERS[providerKey].inbox(targetEmail, token);

          if (!messages || messages.length === 0) {
            return await sock.sendMessage(chat, { text: `📭 *Inbox Empty* (${providerKey})` }, { quoted: msg });
          }

          let text = '┏━━━━━━━━━━━━━━━━━━━┓\n';
          text += `┃ 📨 *INBOX* (${messages.length})\n`;
          text += '┗━━━━━━━━━━━━━━━━━━━┛\n';

          const limit = messages.slice(0, 5);
          for (const m of limit) {
            text += `┌── ❲ *${toFancy('EMAIL')}* ❳\n`;
            text += `│ 🆔 *ID:* ${m.id}\n`;
            text += `│ 👤 *From:* ${m.from}\n`;
            text += `│ 📝 *Sub:* ${m.subject}\n`;
            text += '└──────────────\n';
          }
          text += `\n> .mail read ${targetEmail} <ID>`;

          return await sock.sendMessage(chat, { text: text }, { quoted: msg });
        }

        /* -----------------------------------------------
                   MODE 3: READ EMAIL
                ----------------------------------------------- */
        else if (subCommand === 'read') {
          const targetEmail = args[1];
          const id = args[2];
          if (!targetEmail || !id) return await sock.sendMessage(chat, { text: '⚠️ Usage: .mail read <email> <id>' }, { quoted: msg });

          const session = accountDB.get(targetEmail);
          const providerKey = session ? session.provider : 'onesecmail';
          const token = session ? session.token : null;

          const mail = await PROVIDERS[providerKey].read(targetEmail, id, token);

          let text = '┏━━━━━━━━━━━━━━━━━━━┓\n';
          text += '┃ 📖 *READING*\n';
          text += '┗━━━━━━━━━━━━━━━━━━━┛\n';
          text += `👤 *From:* ${mail.from}\n`;
          text += `📝 *Subject:* ${mail.subject}\n`;
          text += '─────────────────────\n\n';
          text += `${mail.body || 'No Content'}`;

          return await sock.sendMessage(chat, { text: text }, { quoted: msg });
        }

        /* -----------------------------------------------
                   MODE 4: HELP
                ----------------------------------------------- */
        else {
          let text = '⚠️ *Multi-Provider Mail:*\n\n';
          text += '1️⃣ .mail gen\n';
          text += '2️⃣ .mail inbox <email>\n';
          text += '3️⃣ .mail read <email> <id>';
          return await sock.sendMessage(chat, { text: text }, { quoted: msg });
        }

      } catch (error) {
        console.error(error);
        return await sock.sendMessage(chat, { text: `❌ *Error:* ${error.message}` }, { quoted: msg });
      }
    }
  }
};