export default {
  name: 'Example',
  alias: ['ex'],
  command: {
    pattern: 'example',
    desc: 'Example plugin',
    category: 'example',
    react: '💡',

    run: async ({ sock, msg, args }) => {
      await sock.sendMessage(msg.key.remoteJid, {
        text: 'This is an example plugin using the new format.'
      });
    }
  }
};
