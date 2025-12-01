import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

export async function smartUpload(filePath) {
  try {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', fs.createReadStream(filePath));

    const response = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    return response.data;
  } catch (error) {
    console.error('Upload failed:', error);
    return null;
  }
}
