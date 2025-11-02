import { Client } from 'ssh2';
import pty from 'node-pty';

/**
 * Terminal Session Management Service
 * Handles SSH-based terminal sessions with PTY
 */
class TerminalService {
  constructor(config = {}) {
    this.logger = config.logger;
    this.sessions = new Map();
    this.sshHost = config.sshHost || 'localhost';
    this.sshPort = config.sshPort || 22;
    this.sshTimeout = config.sshTimeout || 10000;
    this.maxSessionTimeout = 3600000; // 1 hour - close inactive sessions
    this.sessionIdleTimeout = 1800000; // 30 minutes
    
    // Start cleanup interval for idle sessions
    this.cleanupInterval = setInterval(() => this._cleanupIdleSessions(), 60000); // Check every minute
  }

  /**
   * Check and clean up idle sessions
   * @private
   */
  _cleanupIdleSessions() {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions) {
      const idleTime = now - session.lastActivityAt;
      if (idleTime > this.sessionIdleTimeout) {
        this.logger?.info(`Closing idle session: ${sessionId} (idle for ${Math.round(idleTime / 1000)}s)`);
        this.closeSession(sessionId);
      }
    }
  }

  /**
   * Start a terminal session
   * @param {string} sessionId - Unique session ID
   * @param {Object} credentials - { username, password }
   * @param {Object} options - { rows, cols }
   * @returns {Promise<Object>} Session info
   */
  async startSession(sessionId, credentials, options = {}) {
    return new Promise((resolve, reject) => {
      const { username, password } = credentials;
      const { rows = 24, cols = 80 } = options;

      // Validate input
      if (!sessionId || typeof sessionId !== 'string') {
        return reject(new Error('Invalid session ID'));
      }
      if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
        return reject(new Error('Invalid credentials'));
      }
      if (rows < 5 || cols < 10 || rows > 500 || cols > 500) {
        return reject(new Error('Invalid terminal dimensions'));
      }

      const client = new Client();
      let stream = null;
      let connectionEstablished = false;

      // Timeout handler
      const timeoutId = setTimeout(() => {
        if (!connectionEstablished) {
          if (stream) stream.end();
          client.end();
          reject(new Error('SSH connection timeout'));
        }
      }, this.sshTimeout);

      client.on('ready', () => {
        this.logger?.debug(`SSH ready for session ${sessionId}`);
        connectionEstablished = true;

        // Open shell channel
        client.shell({ term: 'xterm-256color', rows, cols }, (err, shellStream) => {
          if (err) {
            clearTimeout(timeoutId);
            client.end();
            this.logger?.error(`Failed to open shell for session ${sessionId}:`, err.message);
            return reject(err);
          }

          stream = shellStream;

          // Store session
          this.sessions.set(sessionId, {
            client,
            stream,
            username,
            createdAt: new Date(),
            lastActivityAt: Date.now(),
            rows,
            cols,
            buffer: []
          });

          this.logger?.info(`Terminal session started: ${sessionId} for user ${username}`);
          clearTimeout(timeoutId);
          resolve({ success: true, sessionId });
        });
      });

      client.on('error', (err) => {
        clearTimeout(timeoutId);
        if (connectionEstablished) {
          this.logger?.warn(`SSH error for session ${sessionId}: ${err.message}`);
        } else {
          this.logger?.error(`SSH connection error for session ${sessionId}:`, err.message);
        }
        reject(err);
      });

      // Attempt SSH connection
      try {
        client.connect({
          host: this.sshHost,
          port: this.sshPort,
          username,
          password,
          readyTimeout: this.sshTimeout,
          algorithms: {
            serverHostKey: ['ssh-rsa', 'ecdsa-sha2-nistp256']
          }
        });
      } catch (error) {
        clearTimeout(timeoutId);
        this.logger?.error(`SSH connection error for session ${sessionId}:`, error.message);
        reject(error);
      }
    });
  }

  /**
   * Send input to terminal
   * @param {string} sessionId - Session ID
   * @param {string} data - Input data
   */
  sendInput(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.stream) {
      this.logger?.warn(`Session not found: ${sessionId}`);
      return false;
    }

    try {
      session.stream.write(data);
      session.lastActivityAt = Date.now(); // Track activity
      return true;
    } catch (error) {
      this.logger?.error(`Error writing to session ${sessionId}:`, error.message);
      return false;
    }
  }

  /**
   * Resize terminal
   * @param {string} sessionId - Session ID
   * @param {number} rows - Number of rows
   * @param {number} cols - Number of columns
   */
  resizeTerminal(sessionId, rows, cols) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.stream) {
      this.logger?.warn(`Session not found: ${sessionId}`);
      return false;
    }

    // Validate dimensions
    if (rows < 5 || cols < 10 || rows > 500 || cols > 500) {
      this.logger?.warn(`Invalid terminal dimensions: ${rows}x${cols}`);
      return false;
    }

    try {
      session.stream.setWindow(rows, cols);
      session.rows = rows;
      session.cols = cols;
      session.lastActivityAt = Date.now(); // Track activity
      return true;
    } catch (error) {
      this.logger?.error(`Error resizing session ${sessionId}:`, error.message);
      return false;
    }
  }

  /**
   * Get session stream
   * @param {string} sessionId
      * @returns {Stream|null}
   */
  getStream(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? session.stream : null;
  }

  /**
   * Close terminal session
   * @param {string} sessionId - Session ID
   */
  closeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      if (session.stream) {
        try {
          session.stream.end();
        } catch (err) {
          this.logger?.debug(`Error ending stream for ${sessionId}:`, err.message);
        }
      }
      if (session.client) {
        try {
          session.client.end();
        } catch (err) {
          this.logger?.debug(`Error ending client for ${sessionId}:`, err.message);
        }
      }
      this.sessions.delete(sessionId);
      this.logger?.info(`Terminal session closed: ${sessionId}`);
    } catch (error) {
      this.logger?.error(`Error closing session ${sessionId}:`, error.message);
    }
  }

  /**
   * Check if session exists
   * @param {string} sessionId - Session ID
   */
  hasSession(sessionId) {
    return this.sessions.has(sessionId);
  }

  /**
   * Cleanup all sessions (on shutdown)
   */
  cleanup() {
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all sessions
    for (const [sessionId] of this.sessions) {
      this.closeSession(sessionId);
    }
    this.logger?.info('Terminal service cleaned up - all sessions closed');
  }
}

export default TerminalService;
