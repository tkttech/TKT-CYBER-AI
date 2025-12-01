import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Database manager for SQLite
 */
export class DatabaseManager {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.db = null;
  }

  /**
     * Initialize database connection
     */
  async init() {
    try {
      const dbPath = this.config.db.path;
      const dbDir = path.dirname(dbPath);

      // Ensure database directory exists
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Connect to database
      this.db = new Database(dbPath);

      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');

      // Run migrations
      await this.runMigrations();

      this.logger.info(`✅ Database initialized: ${dbPath}`);

      return this.db;
    } catch (error) {
      this.logger.error('Failed to initialize database', { error: error.message });
      throw error;
    }
  }

  /**
     * Run database migrations
     */
  async runMigrations() {
    const migrationsDir = path.join(__dirname, 'migrations');

    // Create migrations table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
      this.logger.warn('Migrations directory not found, creating initial schema...');
      this.createInitialSchema();
      return;
    }

    // Get all migration files
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    // Execute each migration
    for (const file of files) {
      const executed = this.db.prepare('SELECT * FROM migrations WHERE name = ?').get(file);

      if (!executed) {
        this.logger.info(`Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

        this.db.exec(sql);
        this.db.prepare('INSERT INTO migrations (name) VALUES (?)').run(file);

        this.logger.info(`✅ Migration completed: ${file}`);
      }
    }
  }

  /**
     * Create initial database schema
     */
  createInitialSchema() {
    this.db.exec(`
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jid TEXT NOT NULL UNIQUE,
        username TEXT,
        role TEXT DEFAULT 'user',
        is_banned INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Command usage tracking
      CREATE TABLE IF NOT EXISTS command_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        command TEXT NOT NULL,
        args TEXT,
        success INTEGER DEFAULT 1,
        error_message TEXT,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users(jid)
      );

      -- User preferences
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL UNIQUE,
        language TEXT DEFAULT 'en',
        notifications INTEGER DEFAULT 1,
        preferences TEXT,
        FOREIGN KEY (user_jid) REFERENCES users(jid)
      );

      -- Auto-responders
      CREATE TABLE IF NOT EXISTS auto_responders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        keyword TEXT NOT NULL,
        response TEXT NOT NULL,
        match_type TEXT DEFAULT 'contains',
        is_active INTEGER DEFAULT 1,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Reminders
      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        message TEXT NOT NULL,
        remind_at DATETIME NOT NULL,
        is_sent INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users(jid)
      );

      -- Bot statistics
      CREATE TABLE IF NOT EXISTS bot_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stat_key TEXT NOT NULL UNIQUE,
        stat_value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_command_logs_user ON command_logs(user_jid);
      CREATE INDEX IF NOT EXISTS idx_command_logs_command ON command_logs(command);
      CREATE INDEX IF NOT EXISTS idx_command_logs_executed ON command_logs(executed_at);
      CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_jid);
      CREATE INDEX IF NOT EXISTS idx_reminders_time ON reminders(remind_at);
    `);

    this.logger.info('✅ Initial schema created');
  }

  /**
     * Get or create user
     */
  getOrCreateUser(jid, username = null) {
    let user = this.db.prepare('SELECT * FROM users WHERE jid = ?').get(jid);

    if (!user) {
      this.db.prepare('INSERT INTO users (jid, username) VALUES (?, ?)').run(jid, username);
      user = this.db.prepare('SELECT * FROM users WHERE jid = ?').get(jid);
    }

    return user;
  }

  /**
     * Log command execution
     */
  logCommand(userJid, command, args, success = true, errorMessage = null) {
    this.db.prepare(`
      INSERT INTO command_logs (user_jid, command, args, success, error_message)
      VALUES (?, ?, ?, ?, ?)
    `).run(userJid, command, JSON.stringify(args), success ? 1 : 0, errorMessage);
  }

  /**
     * Get database instance
     */
  getDb() {
    return this.db;
  }

  /**
     * Close database connection
     */
  close() {
    if (this.db) {
      this.db.close();
      this.logger.info('Database connection closed');
    }
  }
}

export default DatabaseManager;
