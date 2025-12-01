import NodeCache from 'node-cache';
import { RateLimitError } from './errorHandler.js';

/**
 * Rate limiting system to prevent spam and abuse
 */
export class RateLimiter {
  constructor(options = {}) {
    const {
      maxRequests = 10,
      windowMs = 60000,
      message = 'Too many requests. Please try again later.',
    } = options;

    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.message = message;

    // Use node-cache for storing request counts
    this.cache = new NodeCache({
      stdTTL: Math.ceil(windowMs / 1000),
      checkperiod: Math.ceil(windowMs / 1000),
    });
  }

  /**
     * Check if user has exceeded rate limit
     */
  check(userId) {
    const key = `rate_limit:${userId}`;
    const requests = this.cache.get(key) || 0;

    if (requests >= this.maxRequests) {
      const ttl = this.cache.getTtl(key);
      const resetTime = ttl ? Math.ceil((ttl - Date.now()) / 1000) : 0;

      throw new RateLimitError(`${this.message} Try again in ${resetTime} seconds.`);
    }

    // Increment request count
    this.cache.set(key, requests + 1);

    return {
      allowed: true,
      remaining: this.maxRequests - requests - 1,
      resetTime: this.windowMs / 1000,
    };
  }

  /**
     * Reset rate limit for a user
     */
  reset(userId) {
    const key = `rate_limit:${userId}`;
    this.cache.del(key);
  }

  /**
     * Get current rate limit status
     */
  getStatus(userId) {
    const key = `rate_limit:${userId}`;
    const requests = this.cache.get(key) || 0;
    const ttl = this.cache.getTtl(key);
    const resetTime = ttl ? Math.ceil((ttl - Date.now()) / 1000) : this.windowMs / 1000;

    return {
      requests,
      remaining: Math.max(0, this.maxRequests - requests),
      resetTime,
      limit: this.maxRequests,
    };
  }
}

/**
 * Cooldown manager for command-specific cooldowns
 */
export class CooldownManager {
  constructor() {
    this.cooldowns = new NodeCache();
  }

  /**
     * Check if user is on cooldown for a command
     */
  check(userId, command, cooldownSeconds) {
    const key = `cooldown:${userId}:${command}`;
    const lastUsed = this.cooldowns.get(key);

    if (lastUsed) {
      const timeLeft = Math.ceil((lastUsed + cooldownSeconds * 1000 - Date.now()) / 1000);

      if (timeLeft > 0) {
        throw new RateLimitError(`⏳ Please wait ${timeLeft} seconds before using this command again.`);
      }
    }

    // Set cooldown
    this.cooldowns.set(key, Date.now(), cooldownSeconds);

    return true;
  }

  /**
     * Reset cooldown for a user and command
     */
  reset(userId, command) {
    const key = `cooldown:${userId}:${command}`;
    this.cooldowns.del(key);
  }

  /**
     * Get remaining cooldown time
     */
  getRemaining(userId, command, cooldownSeconds) {
    const key = `cooldown:${userId}:${command}`;
    const lastUsed = this.cooldowns.get(key);

    if (!lastUsed) {
      return 0;
    }

    const timeLeft = Math.ceil((lastUsed + cooldownSeconds * 1000 - Date.now()) / 1000);
    return Math.max(0, timeLeft);
  }
}

export default RateLimiter;
