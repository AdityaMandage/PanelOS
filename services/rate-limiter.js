/**
 * Simple in-memory rate limiter
 * Tracks login attempts per IP address
 */
class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map(); // Store: ip -> [timestamp1, timestamp2, ...]
  }

  /**
   * Check if request is allowed
   * @param {string} ip - Client IP address
   * @returns {boolean} - true if allowed, false if rate limited
   */
  isAllowed(ip) {
    const now = Date.now();
    const key = ip;

    if (!this.attempts.has(key)) {
      this.attempts.set(key, []);
    }

    const timestamps = this.attempts.get(key);
    
    // Remove old timestamps outside the window
    const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs);
    
    if (validTimestamps.length >= this.maxAttempts) {
      return false;
    }

    // Add new attempt
    validTimestamps.push(now);
    this.attempts.set(key, validTimestamps);
    return true;
  }

  /**
   * Get remaining attempts for an IP
   * @param {string} ip - Client IP address
   * @returns {number} - Number of remaining attempts
   */
  getRemaining(ip) {
    const now = Date.now();
    if (!this.attempts.has(ip)) {
      return this.maxAttempts;
    }

    const timestamps = this.attempts.get(ip);
    const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs);
    return Math.max(0, this.maxAttempts - validTimestamps.length);
  }

  /**
   * Reset attempts for an IP (call after successful login)
   * @param {string} ip - Client IP address
   */
  reset(ip) {
    this.attempts.delete(ip);
  }

  /**
   * Cleanup old entries periodically
   */
  cleanup() {
    const now = Date.now();
    for (const [ip, timestamps] of this.attempts.entries()) {
      const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs);
      if (validTimestamps.length === 0) {
        this.attempts.delete(ip);
      } else {
        this.attempts.set(ip, validTimestamps);
      }
    }
  }
}

export default RateLimiter;
