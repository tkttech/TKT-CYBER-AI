/**
 * User model for database operations
 */
export class User {
  constructor(db) {
    this.db = db;
  }

  /**
     * Find user by JID
     */
  findByJid(jid) {
    return this.db.prepare('SELECT * FROM users WHERE jid = ?').get(jid);
  }

  /**
     * Create new user
     */
  create(jid, username = null, role = 'user') {
    const result = this.db.prepare(`
      INSERT INTO users (jid, username, role) VALUES (?, ?, ?)
    `).run(jid, username, role);

    return this.findByJid(jid);
  }

  /**
     * Update user
     */
  update(jid, data) {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }

    values.push(jid);

    this.db.prepare(`
      UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE jid = ?
    `).run(...values);

    return this.findByJid(jid);
  }

  /**
     * Ban user
     */
  ban(jid) {
    return this.update(jid, { is_banned: 1 });
  }

  /**
     * Unban user
     */
  unban(jid) {
    return this.update(jid, { is_banned: 0 });
  }

  /**
     * Check if user is banned
     */
  isBanned(jid) {
    const user = this.findByJid(jid);
    return user ? user.is_banned === 1 : false;
  }

  /**
     * Set user role
     */
  setRole(jid, role) {
    return this.update(jid, { role });
  }

  /**
     * Get user role
     */
  getRole(jid) {
    const user = this.findByJid(jid);
    return user ? user.role : 'user';
  }

  /**
     * Get all users
     */
  getAll() {
    return this.db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  }

  /**
     * Get user count
     */
  count() {
    return this.db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  }

  /**
     * Get users by role
     */
  getByRole(role) {
    return this.db.prepare('SELECT * FROM users WHERE role = ?').all(role);
  }
}

export default User;
