export default {
  name: 'Buttons',
  alias: ['btn'],
  command: {
    pattern: 'buttons',
    desc: 'Test buttons',
    category: 'test',
    react: '🔘',

    run: async ({ sock, msg, args }) => {
      await sock.sendMessage(msg.key.remoteJid, {
        text: 'Buttons are not fully supported in multi-device yet, but here is a test message.'
      });
    }
  }
};
