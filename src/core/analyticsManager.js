/**
 * Analytics Manager - Track and analyze bot usage
 */
export class AnalyticsManager {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger;
    this.startTime = Date.now();
  }

  /**
     * Record bot startup
     */
  recordStartup() {
    this.startTime = Date.now();
    this.updateStat('last_startup', new Date().toISOString());
    this.incrementStat('total_startups');
  }

  /**
     * Update or create a statistic
     */
  updateStat(key, value) {
    this.db.prepare(`
      INSERT INTO bot_stats (stat_key, stat_value) VALUES (?, ?)
      ON CONFLICT(stat_key) DO UPDATE SET stat_value = ?, updated_at = CURRENT_TIMESTAMP
    `).run(key, value.toString(), value.toString());
  }

  /**
     * Increment a numeric statistic
     */
  incrementStat(key, amount = 1) {
    const current = this.getStat(key);
    const newValue = (parseFloat(current) || 0) + amount;
    this.updateStat(key, newValue);
    return newValue;
  }

  /**
     * Get a statistic value
     */
  getStat(key) {
    const result = this.db.prepare('SELECT stat_value FROM bot_stats WHERE stat_key = ?').get(key);
    return result ? result.stat_value : null;
  }

  /**
     * Get uptime in milliseconds
     */
  getUptime() {
    return Date.now() - this.startTime;
  }

  /**
     * Get formatted uptime
     */
  getFormattedUptime() {
    const uptime = this.getUptime();
    const seconds = Math.floor(uptime / 1000) % 60;
    const minutes = Math.floor(uptime / (1000 * 60)) % 60;
    const hours = Math.floor(uptime / (1000 * 60 * 60)) % 24;
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(' ');
  }

  /**
     * Get comprehensive statistics
     */
  getStatistics() {
    // Get all stats from database
    const dbStats = this.db.prepare('SELECT * FROM bot_stats').all();
    const statsMap = {};

    dbStats.forEach(stat => {
      statsMap[stat.stat_key] = stat.stat_value;
    });

    // Add runtime stats
    return {
      uptime: this.getFormattedUptime(),
      uptimeMs: this.getUptime(),
      startTime: new Date(this.startTime).toISOString(),
      ...statsMap,
    };
  }

  /**
     * Get command usage summary
     */
  getCommandSummary() {
    return this.db.prepare(`
      SELECT 
        command,
        COUNT(*) as total,
        SUM(success) as successful,
        COUNT(*) - SUM(success) as failed
      FROM command_logs
      GROUP BY command
      ORDER BY total DESC
      LIMIT 10
    `).all();
  }

  /**
     * Get user activity summary
     */
  getUserSummary() {
    return this.db.prepare(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN is_banned = 1 THEN 1 ELSE 0 END) as banned_users,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
        SUM(CASE WHEN role = 'mod' THEN 1 ELSE 0 END) as mods
      FROM users
    `).get();
  }

  /**
     * Get recent activity
     */
  getRecentActivity(hours = 24) {
    return this.db.prepare(`
      SELECT 
        COUNT(*) as command_count,
        COUNT(DISTINCT user_jid) as unique_users
      FROM command_logs
      WHERE executed_at >= datetime('now', '-' || ? || ' hours')
    `).get(hours);
  }
}

export default AnalyticsManager;
