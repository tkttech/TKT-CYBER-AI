import os from 'os';

export default {
  name: 'stats',
  alias: ['status', 'botstatus'],
  command: {
    pattern: 'stats',
    desc: 'Show Vesperr system statistics',
    category: 'core',
    react: '📊',

    run: async ({ sock, msg }) => {
      const uptime = process.uptime();
      const h = Math.floor(uptime / 3600);
      const m = Math.floor((uptime % 3600) / 60);
      const s = Math.floor(uptime % 60);

      const ramUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
      const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
      const platform = os.platform();
      const arch = os.arch();

      const message =
                `📊 *VESPERR ANALYTICS*
────────────────
⏱️ *Uptime:* ${h}h ${m}m ${s}s
💾 *RAM:* ${ramUsage}MB / ${totalRam}GB
🖥️ *OS:* ${platform} (${arch})
⚡ *Node:* ${process.version}
────────────────
_System functioning within normal parameters._`;

      await sock.sendMessage(msg.key.remoteJid, {
        text: message
      }, { quoted: msg });
    }
  }
};
