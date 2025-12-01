import axios from 'axios';

export default {
  name: 'repo',
  alias: ['sc', 'script', 'source', 'git', 'github'],

  command: {
    pattern: 'repo',
    desc: 'Fetch official source code and repository stats',
    category: 'core',
    react: '💻',

    run: async ({ sock, msg, args }) => {
      const chat = msg.key.remoteJid;

      // ⚙️ CONFIGURATION: Change these to your details if needed
      const githubUser = 'MidknightMantra';
      const githubRepo = 'Vesperr';

      try {
        // 1. Fetch Repository Data from GitHub API
        const { data } = await axios.get(`https://api.github.com/repos/${githubUser}/${githubRepo}`);

        // 2. Format Dates
        const createdDate = new Date(data.created_at).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        });
        const updatedDate = new Date(data.updated_at).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        });

        // 3. Build the UI
        const repoText =
          `📂 *TKT-CYBER-AI SOURCE PROTOCOL*
────────────────
👤 *Owner:* ${data.owner.login}
🏷️ *Name:* ${data.name}
⭐ *Stars:* ${data.stargazers_count}
🍴 *Forks:* ${data.forks_count}
🐛 *Issues:* ${data.open_issues_count}
────────────────
📅 *Created:* ${createdDate}
🔄 *Updated:* ${updatedDate}
────────────────
📝 *Description:*
${data.description || 'No description provided.'}
────────────────
🔗 *Repository:*
${data.html_url}`;

        // 4. Send Message with Rich Preview
        await sock.sendMessage(chat, {
          text: repoText,
          contextInfo: {
            externalAdReply: {
              title: 'TKT-CYBER-AI Sentinel',
              body: 'Public Source Code',
              thumbnailUrl: data.owner.avatar_url, // Automatically uses your GitHub Profile Pic
              sourceUrl: data.html_url,
              mediaType: 1,
              renderLargerThumbnail: true
            }
          }
        }, { quoted: msg });

      } catch (error) {
        console.error('Repo Command Error:', error.message);
        await sock.sendMessage(chat, { text: '❌ Could not fetch repository data. The repo might be private or API is down.' }, { quoted: msg });
      }
    }
  }
};