/**
 * Permission Manager - Role-based access control
 */
export class PermissionManager {
  constructor(config, logger, userModel) {
    this.config = config;
    this.logger = logger;
    this.userModel = userModel;

    // Role hierarchy (higher number = more permissions)
    this.roleHierarchy = {
      'user': 1,
      'vip': 2,
      'mod': 3,
      'admin': 4,
      'owner': 5,
    };
  }

  /**
     * Check if user has required permission level
     */
  async checkPermission(userJid, requiredRole) {
    // Owner always has permission
    if (this.isOwner(userJid)) {
      return true;
    }

    // Get user role from database
    const userRole = this.userModel.getRole(userJid);

    // Check if user is banned
    if (this.userModel.isBanned(userJid)) {
      this.logger.warn('Banned user attempted command', { userJid });
      return false;
    }

    // Compare role levels
    const userLevel = this.roleHierarchy[userRole] || 1;
    const requiredLevel = this.roleHierarchy[requiredRole] || 1;

    return userLevel >= requiredLevel;
  }

  /**
     * Check if user is owner
     */
  isOwner(userJid) {
    if (!this.config.ownerNumber) {
      return false;
    }

    // Normalize JID format
    const normalizedJid = userJid.split('@')[0];
    const ownerNumber = this.config.ownerNumber.split('@')[0];

    return normalizedJid === ownerNumber;
  }

  /**
     * Check if user is admin or higher
     */
  async isAdmin(userJid) {
    return await this.checkPermission(userJid, 'admin');
  }

  /**
     * Check if user is mod or higher
     */
  async isMod(userJid) {
    return await this.checkPermission(userJid, 'mod');
  }

  /**
     * Get user's role
     */
  getUserRole(userJid) {
    if (this.isOwner(userJid)) {
      return 'owner';
    }

    return this.userModel.getRole(userJid);
  }

  /**
     * Set user role
     */
  setUserRole(userJid, role) {
    if (!this.roleHierarchy[role]) {
      throw new Error(`Invalid role: ${role}`);
    }

    this.userModel.setRole(userJid, role);
    this.logger.info('User role updated', { userJid, role });

    return true;
  }

  /**
     * Promote user
     */
  promoteUser(userJid) {
    const currentRole = this.getUserRole(userJid);
    const currentLevel = this.roleHierarchy[currentRole] || 1;

    // Find next role in hierarchy
    const nextRole = Object.entries(this.roleHierarchy)
      .find(([role, level]) => level === currentLevel + 1);

    if (!nextRole) {
      throw new Error('User is already at maximum role');
    }

    this.setUserRole(userJid, nextRole[0]);
    return nextRole[0];
  }

  /**
     * Demote user
     */
  demoteUser(userJid) {
    const currentRole = this.getUserRole(userJid);
    const currentLevel = this.roleHierarchy[currentRole] || 1;

    if (currentLevel <= 1) {
      throw new Error('User is already at minimum role');
    }

    // Find previous role in hierarchy
    const prevRole = Object.entries(this.roleHierarchy)
      .reverse()
      .find(([role, level]) => level === currentLevel - 1);

    if (!prevRole) {
      throw new Error('Cannot demote user');
    }

    this.setUserRole(userJid, prevRole[0]);
    return prevRole[0];
  }

  /**
     * Get all roles
     */
  getRoles() {
    return Object.keys(this.roleHierarchy);
  }
}

export default PermissionManager;
