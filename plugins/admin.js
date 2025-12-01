export default {
  name: 'admin',
  alias: ['adm'],
  command: {
    pattern: 'admin',
    desc: 'Admin commands',
    category: 'admin',
    react: '👮',

    run: async ({ sock, msg, args, isAdmins }) => {
      const chat = msg.key.remoteJid;

      if (!isAdmins && !msg.key.fromMe) {
        return sock.sendMessage(chat, { text: '🚫 Access denied. Admins only.' }, { quoted: msg });
      }

      const subCommand = args[0];
      if (!subCommand) {
        return sock.sendMessage(chat, { text: 'Usage: .admin <ban|promote|demote> <user>' }, { quoted: msg });
      }

      // This is a meta-command that guides users to specific commands
      // The actual logic is often in group.js, but we can add shortcuts here if needed.
      // For now, we'll just point them to the specific commands.

      if (['ban', 'kick', 'remove'].includes(subCommand)) {
        return sock.sendMessage(chat, { text: 'Use .kick <user> to remove a member.' }, { quoted: msg });
      }

      if (['promote', 'admin'].includes(subCommand)) {
        return sock.sendMessage(chat, { text: 'Use .promote <user> to make them an admin.' }, { quoted: msg });
      }

      if (['demote', 'member'].includes(subCommand)) {
        return sock.sendMessage(chat, { text: 'Use .demote <user> to remove admin rights.' }, { quoted: msg });
      }

      await sock.sendMessage(chat, { text: `Unknown admin subcommand: ${subCommand}` }, { quoted: msg });
    }
  }
};
