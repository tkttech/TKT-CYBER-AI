import yts from 'yt-search';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import os from 'os';
import path from 'path';

// 1. Configure Binary
ffmpeg.setFfmpegPath(ffmpegPath);

/* -------------------------------------------------------
   HELPER: Failover Audio Link
------------------------------------------------------- */
async function getAudioLink(url) {
  try {
    const res = await axios.get(`https://api.davidcyriltech.my.id/download/ytmp3?url=${url}`);
    const link = res.data?.result?.download_url || res.data?.result?.url;
    if (link) return link;
  } catch (e) { }

  try {
    const res = await axios.get(`https://api.siputzx.my.id/api/d/ytmp3?url=${url}`);
    const link = res.data?.data?.dl;
    if (link) return link;
  } catch (e) { }

  throw new Error('All APIs busy.');
}

/* -------------------------------------------------------
   HELPER: Download to Temp
------------------------------------------------------- */
async function downloadFile(url, ext) {
  const tempPath = path.join(os.tmpdir(), `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`);
  const writer = fs.createWriteStream(tempPath);

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(tempPath));
    writer.on('error', reject);
  });
}

export default {
  name: 'song',
  alias: ['play', 'music', 'p'],

  command: {
    pattern: 'song',
    desc: 'Download MP3 files',
    category: 'media',
    react: '🎶',

    run: async ({ sock, msg, args }) => {
      const chat = msg.key.remoteJid;
      const query = args.join(' ');

      if (!query) {
        return await sock.sendMessage(chat, { text: '⚠️ *Usage:* `.song <title>`' }, { quoted: msg });
      }

      await sock.sendMessage(chat, { text: '🔎 *Vesperr processing...*' }, { quoted: msg });

      let audioPath, thumbPath, finalPath;

      try {
        // 1. Search
        const search = await yts(query);
        const video = search.videos[0];
        if (!video) return await sock.sendMessage(chat, { text: '❌ *No results.*' }, { quoted: msg });

        // 2. Get Audio Link
        const audioUrl = await getAudioLink(video.url);

        // 3. Download Inputs
        audioPath = await downloadFile(audioUrl, 'mp4');
        thumbPath = await downloadFile(video.thumbnail, 'jpg');
        finalPath = path.join(os.tmpdir(), `song_${Date.now()}.mp3`);

        // 4. Strict Metadata Sanitization
        // Only allow simple alphanumeric characters to prevent command breakage
        const safeTitle = video.title.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 50);
        const safeArtist = video.author.name.replace(/[^a-zA-Z0-9 ]/g, '');

        // 5. Run FFmpeg (Simplified Command)
        await new Promise((resolve, reject) => {
          ffmpeg()
            .input(audioPath)
            .input(thumbPath)
            .outputOptions([
              '-y',                // <--- FIX: Force overwrite if file exists
              '-map 0:a',          // Use Audio stream
              '-map 1:0',          // Use Image stream
              '-c:a libmp3lame',   // Re-encode to MP3
              '-b:a 128k',         // 128k Bitrate
              '-id3v2_version 3',  // ID3 Tags
              // REMOVED complex metadata:s:v tags to prevent Windows syntax errors
            ])
            .outputOptions('-metadata', `title=${safeTitle}`)
            .outputOptions('-metadata', `artist=${safeArtist}`)
            .save(finalPath)
            .on('end', resolve)
            .on('error', reject);
        });

        // 6. Send
        await sock.sendMessage(chat, {
          document: fs.readFileSync(finalPath),
          mimetype: 'audio/mpeg',
          fileName: `${safeTitle}.mp3`,
          caption: `🎶 *${video.title}*\n👤 ${video.author.name}`,
          contextInfo: {
            externalAdReply: {
              title: video.title,
              body: video.author.name,
              thumbnailUrl: video.thumbnail,
              sourceUrl: video.url,
              mediaType: 1,
              renderLargerThumbnail: true
            }
          }
        }, { quoted: msg });

      } catch (error) {
        console.error('Song Error:', error);
        await sock.sendMessage(chat, { text: `❌ *Error:* ${error.message}` }, { quoted: msg });
      } finally {
        // 7. Cleanup
        try {
          if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
          if (thumbPath && fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
          if (finalPath && fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
        } catch (e) { console.log('Cleanup warning:', e.message); }
      }
    }
  }
};