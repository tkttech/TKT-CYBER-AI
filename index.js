import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import cfonts from 'cfonts';
import NodeCache from 'node-cache';
import pino from 'pino';
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, makeCacheableSignalKeyStore, Browsers } from '@whiskeysockets/baileys';
import SessionManager from './src/core/sessionManager.js';
import PluginManager from './src/core/pluginManager.js';
import { loadConfig } from './src/config/environment.js';

// Load configuration
const config = loadConfig();

const PLUGINS_DIR = path.join(process.cwd(), 'plugins');
const SESSION_DIR = path.join(process.cwd(), 'data', 'session'); // Use safe path

// Cache to handle retries
const msgRetryCounterCache = new NodeCache();

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function banner() {
  console.clear();
  try {
    cfonts.say('VESPERR', { font: 'block', align: 'center', colors: ['yellow'] });
  } catch (e) {
    console.error('Failed to render banner:', e);
  }
  console.log(chalk.gray('A lightweight, plugin-driven WhatsApp bot — File System Mode\n'));
}

function createLogger() {
  return pino({ level: 'fatal', timestamp: () => `,"time":"${new Date().toISOString()}"` });
}

async function showQR(qr) {
  console.log(chalk.yellow('Scan QR code below:'));
  const qrcode = (await import('qrcode-terminal')).default;
  qrcode.generate(qr, { small: true });
}

/* ---------------------------------------------------------
   MAIN SOCKET LOGIC
--------------------------------------------------------- */
async function startSock() {
  const logger = createLogger();

  // Initialize Managers
  const sessionManager = new SessionManager(config, logger);
  const pluginManager = new PluginManager({ ...config, pluginsDir: PLUGINS_DIR }, logger);

  // 1. Ensure Session (Download from Pastebin if needed)
  await sessionManager.ensureSession();

  // 2. Load Plugins
  await pluginManager.loadPlugins();

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

  let version;
  try { version = (await fetchLatestBaileysVersion()).version; } catch { }

  const sock = makeWASocket({
    version,
    logger,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    printQRInTerminal: false,
    browser: Browsers.windows('Chrome'),
    syncFullHistory: false,
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    connectTimeoutMs: 60000,
    retryRequestDelayMs: 250,
    msgRetryCounterCache,
    getMessage: async (key) => { return { conversation: 'hello' }; }
  });

  sock.ev.on('creds.update', saveCreds);

  /* ---------------------------------------------------------
       CONNECTION HANDLER
    --------------------------------------------------------- */
  // Flag to track if we already greeted
  let isOnlineMsgSent = false;

  sock.ev.on('connection.update', async ({ connection, qr, lastDisconnect }) => {
    if (qr) await showQR(qr);

    // ✅ FIX: Check if already sent
    if (connection === 'open' && !isOnlineMsgSent) {
      isOnlineMsgSent = true; // Lock it immediately

      console.log(chalk.green('\n🚀 TKT-CYBER-AI awake (File Mode).\n'));
      try {
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        await sock.sendMessage(botId, { text: '🚀 *TKT-CYBER-AI ONLINE* 🚀\n\n_System Active._' });
      } catch (e) { }
    }

    if (connection === 'close') {
      // Reset flag on disconnect so it can send again when it reconnects
      isOnlineMsgSent = false;

      const code = lastDisconnect?.error?.output?.statusCode;

      if (code === DisconnectReason.loggedOut) {
        console.log(chalk.red('Logged out — clearing session.'));
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        process.exit(0);
      }

      console.log(chalk.yellow(`Connection closed (${code}). Reconnecting...`));
      setTimeout(startSock, 3000);
    }
  });

  // Message Handler
  const seen = new Set();
  setInterval(() => seen.clear(), 60000);

  sock.ev.on('messages.upsert', async (packet) => {
    for (const msg of packet.messages || []) {
      const id = msg?.key?.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);

      const remote = msg.key?.remoteJid;
      const fromMe = msg.key?.fromMe;

      if (fromMe) {
        continue;
      }

      // Handle Status Updates
      if (remote === 'status@broadcast') {
        await pluginManager.runHook('onStatus', { sock, key: msg.key, msg });
        continue;
      }

      const messageType = Object.keys(msg.message || {})[0];
      const content = messageType === 'ephemeralMessage' ? msg.message.ephemeralMessage.message : msg.message;
      const text = content?.conversation || content?.extendedTextMessage?.text || content?.imageMessage?.caption || content?.videoMessage?.caption || '';

      // Command Execution
      if (text.startsWith(config.prefix) || text.startsWith('.')) {
        const parts = text.slice(1).trim().split(/\s+/);
        const command = parts.shift().toLowerCase();
        const args = parts;

        // Use PluginManager to execute command
        await pluginManager.executeCommand(command, sock, msg, args, { config });
      }

      // Handle onMessage hooks
      await pluginManager.runHook('onMessage', { sock, msg });
    }
  });

  sock.ev.on('group-participants.update', async (update) => {
    await pluginManager.runHook('onGroupUpdate', { sock, update });
  });

  sock.ev.on('presence.update', async (presence) => {
    await pluginManager.runHook('onPresence', { sock, presence });
  });

  global.VESPERR = { sock, pluginManager };
  return sock;
}

(async function main() {
  ensureDir(PLUGINS_DIR);
  ensureDir(SESSION_DIR);
  banner();
  await startSock();
})();
