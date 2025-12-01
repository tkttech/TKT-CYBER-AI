/**
 * Command model for tracking command usage
 */
export class Command {
  constructor(db) {
    this.db = db;
  }

  /**
     * Log command execution
     */
  log(userJid, command, args = [], success = true, errorMessage = null) {
    return this.db.prepare(`
      INSERT INTO command_logs (user_jid, command, args, success, error_message)
      VALUES (?, ?, ?, ?, ?)
    `).run(userJid, command, JSON.stringify(args), success ? 1 : 0, errorMessage);
  }

  /**
     * Get command statistics
     */
  getStats() {
    return this.db.prepare(`
      SELECT 
        command,
        COUNT(*) as total_uses,
        SUM(success) as successful_uses,
        COUNT(*) - SUM(success) as failed_uses
      FROM command_logs
      GROUP BY command
      ORDER BY total_uses DESC
    `).all();
  }

  /**
     * Get user command history
     */
  getUserHistory(userJid, limit = 10) {
    return this.db.prepare(`
      SELECT * FROM command_logs
      WHERE user_jid = ?
      ORDER BY executed_at DESC
      LIMIT ?
    `).all(userJid, limit);
  }

  /**
     * Get most used commands
     */
  getMostUsed(limit = 10) {
    return this.db.prepare(`
      SELECT command, COUNT(*) as uses
      FROM command_logs
      WHERE success = 1
      GROUP BY command
      ORDER BY uses DESC
      LIMIT ?
    `).all(limit);
  }

  /**
     * Get command usage count
     */
  getTotalCount() {
    return this.db.prepare('SELECT COUNT(*) as count FROM command_logs').get().count;
  }

  /**
     * Get daily statistics
     */
  getDailyStats(days = 7) {
    return this.db.prepare(`
      SELECT 
        DATE(executed_at) as date,
        COUNT(*) as total_commands,
        SUM(success) as successful,
        COUNT(DISTINCT user_jid) as unique_users
      FROM command_logs
      WHERE executed_at >= datetime('now', '-' || ? || ' days')
      GROUP BY DATE(executed_at)
      ORDER BY date DESC
    `).all(days);
  }

  /**
     * Get top users by command usage
     */
  getTopUsers(limit = 10) {
    return this.db.prepare(`
      SELECT 
        user_jid,
        COUNT(*) as command_count
      FROM command_logs
      GROUP BY user_jid
      ORDER BY command_count DESC
      LIMIT ?
    `).all(limit);
  }
}

export default Command;
