import { Client } from 'ssh2';

/**
 * SSH Authentication Service
 * Handles SSH connection and authentication using credentials
 * Does NOT store credentials - they are validated only
 */
class AuthService {
  constructor(config = {}) {
    this.sshHost = config.sshHost || 'localhost';
    this.sshPort = config.sshPort || 22;
    this.sshTimeout = config.sshTimeout || 10000;
    this.logger = config.logger;
  }

  /**
   * Authenticate user via SSH
   * Creates a test SSH connection to validate credentials
   * Connection is closed immediately after validation
   * @param {string} username - SSH username
   * @param {string} password - SSH password
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async authenticate(username, password) {
    return new Promise((resolve) => {
      const client = new Client();
      let resolved = false;

      // Timeout handler - if SSH doesn't respond within timeout period
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try {
            client.end();
          } catch (err) {
            // Ignore cleanup errors
          }
          this.logger?.warn(`SSH auth timeout for user: ${username}`);
          resolve({
            success: false,
            error: 'SSH connection timeout'
          });
        }
      }, this.sshTimeout);

      // Connection established - authentication succeeded
      client.on('ready', () => {
        clearTimeout(timeoutId);
        if (!resolved) {
          resolved = true;
          try {
            client.end();
          } catch (err) {
            // Ignore cleanup errors
          }
          this.logger?.info(`SSH auth successful for user: ${username}`);
          resolve({ success: true });
        }
      });

      // Authentication or connection failed
      client.on('error', (err) => {
        clearTimeout(timeoutId);
        if (!resolved) {
          resolved = true;
          this.logger?.debug(`SSH auth failed for user: ${username} - ${err.message}`);
          resolve({
            success: false,
            error: 'Authentication failed'
          });
        }
      });

      // Attempt SSH connection
      try {
        client.connect({
          host: this.sshHost,
          port: this.sshPort,
          username,
          password,
          readyTimeout: this.sshTimeout
        });
      } catch (error) {
        clearTimeout(timeoutId);
        if (!resolved) {
          resolved = true;
          this.logger?.error(`SSH connection error for user: ${username}`, error.message);
          resolve({
            success: false,
            error: 'Connection error'
          });
        }
      }
    });
  }

  /**
   * Validate credentials format
   * @param {string} username
   * @param {string} password
   * @returns {string|null} - Error message if invalid, null if valid
   */
  validateCredentials(username, password) {
    if (!username || typeof username !== 'string') {
      return 'Username is required';
    }
    if (!password || typeof password !== 'string') {
      return 'Password is required';
    }
    if (username.length < 1 || username.length > 255) {
      return 'Invalid username length';
    }
    if (password.length < 1 || password.length > 1024) {
      return 'Invalid password length';
    }
    // Prevent obvious injection attempts (newlines, nulls)
    if (username.includes('\n') || username.includes('\r') || username.includes('\0')) {
      return 'Invalid username characters';
    }
    if (password.includes('\0')) {
      return 'Invalid password characters';
    }
    // Check for suspicious patterns
    if (/[<>"`$(){}[\]|;&]/.test(username)) {
      return 'Invalid username characters';
    }
    return null;
  }
}

export default AuthService;
