# Vesperr v2.0 - Quick Setup Guide

## Prerequisites Installed? ✓

Before starting, ensure you have:
- ✅ Node.js 18+ (`node --version`)
- ✅ npm (`npm --version`)  
- ✅ WhatsApp account

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

This will install all ~20 dependencies including Baileys, Winston, Sharp, Gemini AI, and more.

### 2. Configure Environment

The bot requires a `.env` file. Copy the example:

```bash
cp .env.example .env
```

**Edit `.env` with your details:**

```env
# Required
BOT_NAME=Vesperr
PREFIX=!
OWNER_NUMBER=your_number@s.whatsapp.net

# Optional for session download
PASTEBIN_RAW_URL=

# Optional API keys for advanced features
GOOGLE_AI_API_KEY=        # For AI chat plugin
OPENWEATHER_API_KEY=      # For weather plugin
```

> **Note:** Owner number should be in format: `6281234567890@s.whatsapp.net`

### 3. Start the Bot

```bash
# Development mode (auto-restart on changes)
npm run dev

# Or production mode
npm start
```

### 4. Authenticate

**First Run:** Scan the QR code shown in terminal with WhatsApp:
1. Open WhatsApp on your phone
2. Go to Settings → Linked Devices
3. Tap "Link a Device"
4. Scan the QR code

**Session saved to `vesperr/` directory for future runs.**

### 5. Test It Works

Send a message to the bot number:

```
!help
!info
!ping
```

## Optional: Configure AI & Weather

### Google AI (for `!ai` command)

1. Get API key: https://ai.google.dev/
2. Add to `.env`: `GOOGLE_AI_API_KEY=your_key_here`
3. Restart bot
4. Test: `!ai Tell me a joke`

### Weather (for `!weather` command)

1. Get API key: https://openweathermap.org/api
2. Add to `.env`: `OPENWEATHER_API_KEY=your_key_here`
3. Restart bot
4. Test: `!weather London`

## Docker Setup (Alternative)

If you prefer Docker:

```bash
# 1. Configure .env first
cp .env.example .env
nano .env

# 2. Start with Docker Compose
docker-compose up -d

# 3. View logs
docker-compose logs -f

# 4. Scan QR code from logs
```

## Troubleshooting

### QR code not showing
- Delete `vesperr/` directory
- Ensure `PASTEBIN_RAW_URL` is empty or correct
- Restart bot

### "Failed to initialize database"
- Check `data/` directory exists and is writable
- Verify Node.js version is 18+

### Bot not responding
- Check bot is connected (should see "✅ Connected to WhatsApp!")
- Verify PREFIX matches what you're typing (default: `!`)
- Check logs in `logs/` directory

### Module not found errors
- Run `npm install` again
- Delete `node_modules/` and `package-lock.json`, then `npm install`

## Health Check

Once running, you can check health at:

**http://localhost:3000/health**

Returns:
```json
{
  "status": "healthy",
  "uptime": "5m 23s",
  "version": "2.0.0",
  "connected": true
}
```

## Next Steps

1. ✅ Read [README.md](../README.md) for full documentation
2. ✅ Try all plugins: `!help` to see all commands
3. ✅ Create your own plugin (see [CONTRIBUTING.md](../CONTRIBUTING.md))
4. ✅ Deploy to production (Docker/Railway/Render)

## Support

- **Issues:** https://github.com/tkttech/TKT-CYBER-AI/issues
- **Pull Requests Welcome:** See [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Session Generator:** https://midknightmantra-pair.onrender.com

---

**Ready to go! 🚀 Scan that QR code and start chatting!**
