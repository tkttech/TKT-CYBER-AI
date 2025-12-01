import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { retryOperation } from '../utils/errorHandler.js';

class SessionManager {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.sessionPath = config.sessionFile;
  }

  /**
     * Download session credentials from Pastebin raw URL with retry logic
     */
  async downloadFromPastebin() {
    const operation = async () => {
      this.logger.info('📥 Downloading session from Pastebin...', {
        url: this.config.pastebinRawUrl.replace(/\/raw\/.*/, '/raw/***'),
      });

      // Use responseType: 'json' as suggested
      const response = await axios.get(this.config.pastebinRawUrl, {
        timeout: 10000,
        responseType: 'json',
        headers: {
          'User-Agent': 'Vesperr-Bot/2.0',
        },
      });

      if (!response.data) {
        throw new Error('Empty response from Pastebin');
      }

      // Robust parsing logic adapted from user snippet
      let sessionData;
      try {
        sessionData = typeof response.data === 'object'
          ? response.data
          : JSON.parse(response.data);
      } catch (parseError) {
        this.logger.error('Failed to parse session data', { error: parseError.message });
        throw new Error('Invalid JSON response from Pastebin');
      }

      // Validate session data structure
      if (!sessionData.creds && !sessionData.me) {
        // Some sessions might be just the creds object directly, handle that
        if (sessionData.noiseKey && sessionData.signedIdentityKey) {
          // It looks like a direct creds object
          sessionData = { creds: sessionData };
        } else {
          throw new Error('Invalid session data structure');
        }
      }

      // Save to session directory
      await this.saveSession(sessionData);
      this.logger.info('✅ Session downloaded and saved successfully');
      return sessionData;
    };

    return retryOperation(operation, 3, 2000, this.logger);
  }

  /**
     * Save session data to local directory
     */
  async saveSession(sessionData) {
    try {
      // Create session directory if it doesn't exist
      if (!fs.existsSync(this.sessionPath)) {
        fs.mkdirSync(this.sessionPath, { recursive: true });
      }

      // Create backup of existing session if it exists
      const credsPath = path.join(this.sessionPath, 'creds.json');
      if (fs.existsSync(credsPath)) {
        const backupPath = path.join(this.sessionPath, `creds.backup.${Date.now()}.json`);
        fs.copyFileSync(credsPath, backupPath);
        this.logger.info(`📦 Backed up existing session to ${backupPath}`);
      }

      // Save creds.json
      fs.writeFileSync(credsPath, JSON.stringify(sessionData, null, 2));

      this.logger.info('💾 Session saved', { path: this.sessionPath });
    } catch (error) {
      this.logger.error('Failed to save session', { error: error.message });
      throw error;
    }
  }

  /**
     * Backup current session
     */
  backupSession() {
    try {
      const credsPath = path.join(this.sessionPath, 'creds.json');

      if (!fs.existsSync(credsPath)) {
        this.logger.warn('No session to backup');
        return false;
      }

      const backupDir = path.join(this.sessionPath, 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `creds.${timestamp}.json`);

      fs.copyFileSync(credsPath, backupPath);
      this.logger.info('✅ Session backed up', { path: backupPath });

      return backupPath;
    } catch (error) {
      this.logger.error('Failed to backup session', { error: error.message });
      return false;
    }
  }

  /**
     * Restore session from backup
     */
  restoreSession(backupPath) {
    try {
      const credsPath = path.join(this.sessionPath, 'creds.json');

      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file not found');
      }

      fs.copyFileSync(backupPath, credsPath);
      this.logger.info('✅ Session restored from backup');

      return true;
    } catch (error) {
      this.logger.error('Failed to restore session', { error: error.message });
      throw error;
    }
  }

  /**
     * Check if session exists locally
     */
  sessionExists() {
    const credsPath = path.join(this.sessionPath, 'creds.json');
    return fs.existsSync(credsPath);
  }

  /**
     * Delete session
     */
  deleteSession() {
    try {
      if (fs.existsSync(this.sessionPath)) {
        fs.rmSync(this.sessionPath, { recursive: true, force: true });
        this.logger.info('🗑️ Session deleted');
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('Failed to delete session', { error: error.message });
      throw error;
    }
  }

  /**
     * Load existing session or download from Pastebin
     */
  async ensureSession() {
    if (this.sessionExists()) {
      this.logger.info('✅ Local session found');
      return true;
    }

    this.logger.warn('⚠️  No local session found');

    // Try to download from Pastebin if URL is configured
    if (this.config.pastebinRawUrl &&
            !this.config.pastebinRawUrl.includes('YOUR_PASTE_ID') &&
            this.config.pastebinRawUrl.length > 10) {
      try {
        await this.downloadFromPastebin();
        return true;
      } catch (error) {
        this.logger.warn('Failed to download session, will generate QR code', {
          error: error.message,
        });
        return false;
      }
    }

    this.logger.info('⚠️  No Pastebin URL configured, will generate QR code');
    return false;
  }
}

export default SessionManager;
