import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = path.join(__dirname, '../anime_cache.json');
let cache = {};

try {
  cache = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
} catch {
  cache = {};
}

function save() {
  fs.writeFileSync(CONFIG, JSON.stringify(cache, null, 2));
}

export function get(key, ttl = 24 * 60 * 60 * 1000) {
  const v = cache[key];
  if (!v) return null;
  if (Date.now() - v.ts > ttl) {
    delete cache[key];
    save();
    return null;
  }
  return v.val;
}

export function set(key, val) {
  cache[key] = { ts: Date.now(), val };
  save();
}

export default { get, set };
