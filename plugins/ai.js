import axios from 'axios';

const MAX_PROMPT = 4000;
const TIMEOUT = 60000; // 60s timeout for slower models

// Anti-ban delay helper
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* -----------------------------------------------------------
   🤖 VESPERR PERSONA
----------------------------------------------------------- */
const SYSTEM_PROMPT =
    `You are TKT-CYBER-AI.
Archetype: A helpful, intelligent, and professional AI assistant.
Tone: Friendly, concise, and informative.
Behavior: 
- Act as a helpful assistant.
- Provide clear and direct answers.
- Use emojis moderately to be engaging.
- If asked who you are, say you are Vesperr, an advanced WhatsApp bot.`;

/* -----------------------------------------------------------
   TIER 1 — PAID / PRIVATE KEYS (Priority)
----------------------------------------------------------- */

async function askOpenAI(prompt) {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key === 'null') return null;

  const r = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    },
    { headers: { Authorization: `Bearer ${key}` }, timeout: TIMEOUT }
  );
  return r.data.choices[0].message.content;
}

async function askGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'null') return null;

  // Combined prompt for stronger persona adherence
  const finalPrompt = `${SYSTEM_PROMPT}\n\nQUERY: ${prompt}`;

  // UPDATED: Using gemini-1.5-flash (Faster/Better Free Tier)
  const r = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    { contents: [{ parts: [{ text: finalPrompt }] }] },
    { timeout: TIMEOUT }
  );
  return r.data.candidates[0].content.parts[0].text;
}

/* -----------------------------------------------------------
   TIER 2 — ROBUST FREE PROVIDERS (No Keys)
----------------------------------------------------------- */

// 1. Pollinations (The most reliable free option)
async function askPollinations(prompt) {
  try {
    // We inject the persona directly into the URL system param
    const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&system=${encodeURIComponent(SYSTEM_PROMPT)}`;
    const r = await axios.get(url, { timeout: TIMEOUT });
    return r.data;
  } catch (e) {
    return null;
  }
}

// 2. Blackbox AI (With headers to look like a real browser)
async function askBlackbox(prompt) {
  try {
    const r = await axios.post('https://api.blackbox.ai/api/chat', {
      messages: [
        { role: 'user', content: `${SYSTEM_PROMPT}\n\n${prompt}` }
      ],
      model: 'gpt-4o',
      max_tokens: 1024
    }, {
      timeout: TIMEOUT,
      headers: {
        'Origin': 'https://www.blackbox.ai',
        'Referer': 'https://www.blackbox.ai/'
      }
    });

    const text = r.data;
    // Clean up Blackbox specific garbage tokens
    return text.replace(/\$@\$v=.*?\$@\$/g, '');
  } catch {
    return null;
  }
}

// 3. DarkAI (Backup)
async function askDarkAI(prompt) {
  try {
    const r = await axios.get(
      `https://dark-yasiya-api-new.vercel.app/ai/chatgpt?text=${encodeURIComponent(SYSTEM_PROMPT + ' ' + prompt)}`,
      { timeout: TIMEOUT }
    );
    if (r.data.status && r.data.result) return r.data.result;
    return null;
  } catch {
    return null;
  }
}

/* -----------------------------------------------------------
   MASTER CONTROLLER
----------------------------------------------------------- */
async function getResponse(text) {
  const providers = [
    askOpenAI,       // 1. Paid (Best)
    askGemini,       // 2. Paid (Fast)
    askPollinations, // 3. Free (Reliable)
    askBlackbox,     // 4. Free (Strong)
    askDarkAI        // 5. Free (Backup)
  ];

  for (const provider of providers) {
    try {
      const result = await provider(text);
      // Basic validation to ensure we didn't get an HTML error page
      if (result && typeof result === 'string' && result.length > 1 && !result.includes('<!DOCTYPE')) {
        return result.trim();
      }
    } catch (e) {
      // Fail silently and move to next provider
      continue;
    }
  }
  return null;
}

/* -----------------------------------------------------------
   PLUGIN EXPORT
----------------------------------------------------------- */
export default {
  name: 'ai',
  alias: ['chat', 'gpt', 'bot', 'ask'],

  command: {
    pattern: 'ai',
    desc: 'Ask Vesperr AI',
    category: 'ai',
    react: '🤖',

    run: async ({ sock, msg, args }) => {
      const chat = msg.key.remoteJid;
      const input = args.join(' ');

      if (!input) {
        return sock.sendMessage(chat, {
          text: '🤖 *How can I help you today?*\nExample: `.ai What is the capital of France?`'
        }, { quoted: msg });
      }

      // 1. Send "Thinking" Message (We will edit this later)
      // We save the message object to 'keyMsg'
      const keyMsg = await sock.sendMessage(chat, { text: '🤖 *Thinking...*' }, { quoted: msg });

      // 2. Generate Response
      const reply = await getResponse(input);

      // 3. Construct Final Message
      const finalMessage = reply
        ? `🤖 *TKT-CYBER-AI*\n────────────────\n${reply}\n────────────────\n`
        : '⚠️ *AI Service Unavailable* (Network Unreachable)';

      // 4. Edit the "Thinking" message to show the result
      // This is smoother than deleting and resending
      if (keyMsg) {
        await sock.sendMessage(chat, {
          text: finalMessage,
          edit: keyMsg.key
        });
      } else {
        // Fallback if edit fails (rare)
        await sock.sendMessage(chat, { text: finalMessage }, { quoted: msg });
      }
    }
  }
};
