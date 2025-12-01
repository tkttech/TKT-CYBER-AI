export default {
  name: 'Info',
  alias: ['about', 'botinfo'],
  command: {
    pattern: 'info',
    desc: 'Bot information',
    category: 'general',
    react: 'ℹ️',

    run: async ({ sock, msg, args, config }) => {
      const infoMessage = `*🤖 ${config.botName}*\n\n` +
                'Version: 2.0.0\n' +
                `Prefix: ${config.prefix}\n` +
                `Owner: ${config.ownerNumber || 'Not set'}\n\n` +
                '_Powered by TKT-TECH🇿🇼_';

      await sock.sendMessage(msg.key.remoteJid, {
        text: infoMessage
      });
    }
  }
};
