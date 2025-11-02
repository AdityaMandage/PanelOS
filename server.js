import express from 'express';
import session from 'express-session';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import winston from 'winston';
import 'winston-daily-rotate-file';
import AuthService from './services/auth.service.js';
import RateLimiter from './services/rate-limiter.js';
import MetricsService from './services/metrics.service.js';
import TerminalService from './services/terminal.service.js';
import FirewallService from './services/firewall.service.js';

// Load environment variables
dotenv.config();

// Logger setup with daily rotation and 3-day retention
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'panelos' },
  transports: [
    // Error logs - daily rotation with 3-day retention
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxDays: '3d',
      maxSize: '20m',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    }),
    // All logs (info and above) - daily rotation with 3-day retention
    new winston.transports.DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxDays: '3d',
      maxSize: '20m',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    }),
    // Console - ERROR level only
    new winston.transports.Console({
      level: 'error',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, stack }) => {
          const baseMsg = `${timestamp} [${level}]: ${message}`;
          return stack ? `${baseMsg}\n${stack}` : baseMsg;
        })
      )
    })
  ]
});

// Setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Create session store
const sessionStore = new session.MemoryStore();

const io = new SocketIOServer(httpServer, {
  path: '/socket.io/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS']
  }
});

// Initialize services
const authService = new AuthService({
  sshHost: process.env.SSH_HOST || 'localhost',
  sshPort: parseInt(process.env.SSH_PORT) || 22,
  sshTimeout: parseInt(process.env.SSH_TIMEOUT) || 10000,
  logger
});

const rateLimiter = new RateLimiter(
  parseInt(process.env.RATE_LIMIT_LOGIN) || 5,
  parseInt(process.env.RATE_LIMIT_WINDOW) || 60000
);

const metricsService = new MetricsService({ logger });

const terminalService = new TerminalService({
  sshHost: process.env.SSH_HOST || 'localhost',
  sshPort: parseInt(process.env.SSH_PORT) || 22,
  sshTimeout: parseInt(process.env.SSH_TIMEOUT) || 10000,
  logger
});

const firewallService = new FirewallService({ 
  logger,
  enabled: process.env.FIREWALL_ENABLED !== 'false' // Default to enabled
});

// Middleware
app.use(helmet({
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000 } : false,
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.socket.io", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"] ,
      fontSrc: ["'self'", "https:", "data:"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: null
    }
  }
}));
app.use(cors());
app.use(express.json({ limit: '10kb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Input sanitization middleware
app.use((req, res, next) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      const value = req.body[key];
      if (typeof value === 'string') {
        // Remove suspicious characters but keep basics
        req.body[key] = value.replace(/[<>]/g, '');
      }
    }
  }
  next();
});

// Session middleware
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'change-this-secret',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: false, // Allow HTTP for now - set to true only with HTTPS
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_TIMEOUT) || 30 * 60 * 1000,
    sameSite: 'lax' // More permissive than 'strict' for cross-IP access
  }
});

app.use(sessionMiddleware);

// Attach session middleware to Socket.io
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Logger middleware - log to files only, not console
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// ============================================================
// ROUTES
// ============================================================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Serve login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve dashboard
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Root redirect
app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

// Auth endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;
    const { username, password } = req.body;

    // Check rate limit
    if (!rateLimiter.isAllowed(clientIp)) {
      logger.warn(`Rate limit exceeded for IP: ${clientIp}`);
      return res.status(429).json({
        success: false,
        error: 'Too many login attempts. Please try again later.'
      });
    }

    // Validate input
    const validationError = authService.validateCredentials(username, password);
    if (validationError) {
      logger.warn(`Validation error for user ${username}: ${validationError}`);
      return res.status(400).json({
        success: false,
        error: validationError
      });
    }

    // Attempt SSH authentication
    const authResult = await authService.authenticate(username, password);

    if (authResult.success) {
      // Create session
      req.session.user = {
        username,
        loginTime: new Date(),
        ip: clientIp
      };

      // DO NOT store credentials in session - they will be passed fresh on terminal requests
      // Reset rate limiter on successful login
      rateLimiter.reset(clientIp);

      logger.info(`User logged in: ${username} from ${clientIp}`);
      res.json({ success: true, user: { username } });
    } else {
      logger.warn(`Failed login attempt for user: ${username} from ${clientIp}`);
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Session destroy error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

app.get('/api/auth/verify', (req, res) => {
  if (req.session.user) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

// Middleware to require authentication
function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Metrics endpoints (requires authentication)
app.get('/api/metrics/system', requireAuth, async (req, res) => {
  try {
    const metrics = await metricsService.getSystemMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Metrics error:', error);
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

app.get('/api/metrics/quick', requireAuth, async (req, res) => {
  try {
    const metrics = await metricsService.getQuickMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Quick metrics error:', error);
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

// Firewall endpoints (requires authentication)
app.get('/api/firewall/status', requireAuth, async (req, res) => {
  try {
    const status = await firewallService.getStatus();
    res.json(status);
  } catch (error) {
    logger.error('Firewall status error:', error);
    res.status(500).json({ error: 'Failed to get firewall status' });
  }
});

app.post('/api/firewall/status', requireAuth, async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Invalid enabled value. Must be boolean' });
    }

    const result = await firewallService.setStatus(enabled);
    res.json(result);
  } catch (error) {
    logger.error('Set firewall status error:', error);
    res.status(500).json({ error: error.message || 'Failed to set firewall status' });
  }
});

app.get('/api/firewall/rules', requireAuth, async (req, res) => {
  try {
    const rules = await firewallService.getRules();
    res.json(rules);
  } catch (error) {
    logger.error('Firewall rules error:', error);
    res.status(500).json({ error: 'Failed to get firewall rules' });
  }
});

app.post('/api/firewall/rules', requireAuth, async (req, res) => {
  try {
    const rule = req.body;
    // Basic validation
    if (!rule.action || !['allow', 'deny'].includes(rule.action)) {
      return res.status(400).json({ error: 'Invalid action. Must be "allow" or "deny"' });
    }
    if (!rule.port || isNaN(rule.port) || rule.port < 1 || rule.port > 65535) {
      return res.status(400).json({ error: 'Invalid port. Must be between 1 and 65535' });
    }
    if (rule.protocol && !['tcp', 'udp'].includes(rule.protocol)) {
      return res.status(400).json({ error: 'Invalid protocol. Must be "tcp" or "udp"' });
    }

    const result = await firewallService.addRule(rule);
    res.json(result);
  } catch (error) {
    logger.error('Add firewall rule error:', error);
    res.status(500).json({ error: error.message || 'Failed to add firewall rule' });
  }
});

app.delete('/api/firewall/rules/:ruleId', requireAuth, async (req, res) => {
  try {
    const { ruleId } = req.params;
    const result = await firewallService.deleteRule(ruleId);
    res.json(result);
  } catch (error) {
    logger.error('Delete firewall rule error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete firewall rule' });
  }
});

app.get('/api/firewall/ports', requireAuth, async (req, res) => {
  try {
    const ports = await firewallService.getExposedPorts();
    res.json(ports);
  } catch (error) {
    logger.error('Firewall ports error:', error);
    res.status(500).json({ error: 'Failed to get exposed ports' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(statusCode).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message,
      timestamp: new Date().toISOString()
    }
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
      timestamp: new Date().toISOString()
    }
  });
});

// ============================================================
// SOCKET.IO
// ============================================================

const metricsIntervals = new Map(); // Track intervals per socket

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  // ============ METRICS HANDLERS ============

  socket.on('metrics:subscribe', async ({ interval = 2000 } = {}) => {
    logger.info(`Client ${socket.id} subscribed to metrics with interval ${interval}ms`);

    // Clear existing interval if any
    if (metricsIntervals.has(socket.id)) {
      clearInterval(metricsIntervals.get(socket.id));
    }

    // Send initial metrics immediately
    try {
      const metrics = await metricsService.getQuickMetrics();
      socket.emit('metrics:update', metrics);
    } catch (error) {
      logger.error('Initial metrics error:', error);
      socket.emit('metrics:error', { error: 'Failed to get metrics' });
    }

    // Start interval
    const intervalId = setInterval(async () => {
      try {
        const metrics = await metricsService.getQuickMetrics();
        socket.emit('metrics:update', metrics);
      } catch (error) {
        logger.error('Metrics streaming error:', error);
        socket.emit('metrics:error', { error: 'Metrics collection failed' });
      }
    }, interval);

    metricsIntervals.set(socket.id, intervalId);
  });

  socket.on('metrics:unsubscribe', () => {
    if (metricsIntervals.has(socket.id)) {
      clearInterval(metricsIntervals.get(socket.id));
      metricsIntervals.delete(socket.id);
      logger.info(`Client ${socket.id} unsubscribed from metrics`);
    }
  });

  // ============ TERMINAL HANDLERS ============

  socket.on('terminal:start', async (data) => {
    try {
      const { rows, cols, username, password } = data;

      // Authenticate the request - user must be logged in
      if (!socket.request.session?.user) {
        socket.emit('terminal:error', { error: 'Not authenticated' });
        return;
      }

      // Validate that provided username matches session username
      if (username !== socket.request.session.user.username) {
        logger.warn(`Terminal: Username mismatch for ${socket.request.session.user.username}`);
        socket.emit('terminal:error', { error: 'Invalid username' });
        return;
      }

      // Validate credentials are provided
      if (!username || !password) {
        socket.emit('terminal:error', { error: 'Credentials required' });
        return;
      }

      const sessionId = `term-${socket.id}`;

      // Start terminal session
      await terminalService.startSession(sessionId, { username, password }, { rows, cols });

      const stream = terminalService.getStream(sessionId);

      if (stream) {
        // Send output to client
        stream.on('data', (chunk) => {
          socket.emit('terminal:output', { data: chunk.toString('utf8') });
        });

        // Handle stream close
        stream.on('close', () => {
          terminalService.closeSession(sessionId);
          socket.emit('terminal:closed');
        });

        // Handle stream errors
        stream.on('error', (err) => {
          logger.error(`Terminal stream error for ${sessionId}:`, err);
          socket.emit('terminal:error', { error: err.message });
        });
      }

      logger.info(`Terminal session started: ${sessionId} for user ${username}`);
      socket.emit('terminal:ready', { sessionId });
    } catch (error) {
      logger.error('Terminal start error:', error);
      socket.emit('terminal:error', { error: error.message });
    }
  });

  socket.on('terminal:input', (data) => {
    try {
      const sessionId = `term-${socket.id}`;
      const { input } = data;

      if (!terminalService.hasSession(sessionId)) {
        socket.emit('terminal:error', { error: 'Terminal session not active' });
        return;
      }

      terminalService.sendInput(sessionId, input);
    } catch (error) {
      logger.error('Terminal input error:', error);
      socket.emit('terminal:error', { error: error.message });
    }
  });

  socket.on('terminal:resize', (data) => {
    try {
      const sessionId = `term-${socket.id}`;
      const { rows, cols } = data;

      if (!terminalService.hasSession(sessionId)) {
        return;
      }

      terminalService.resizeTerminal(sessionId, rows, cols);
    } catch (error) {
      logger.error('Terminal resize error:', error);
    }
  });

  socket.on('terminal:close', () => {
    const sessionId = `term-${socket.id}`;
    terminalService.closeSession(sessionId);
  });

  // ============ FIREWALL HANDLERS ============

  socket.on('firewall:refresh', async () => {
    try {
      const [status, rules, ports] = await Promise.all([
        firewallService.getStatus(),
        firewallService.getRules(),
        firewallService.getExposedPorts()
      ]);
      socket.emit('firewall:update', { status, rules, ports });
    } catch (error) {
      logger.error('Firewall refresh error:', error);
      socket.emit('firewall:error', { error: 'Failed to refresh firewall data' });
    }
  });

  // ============ CLEANUP HANDLERS ============

  socket.on('disconnect', () => {
    // Cleanup metrics
    if (metricsIntervals.has(socket.id)) {
      clearInterval(metricsIntervals.get(socket.id));
      metricsIntervals.delete(socket.id);
    }

    // Cleanup terminal
    const sessionId = `term-${socket.id}`;
    if (terminalService.hasSession(sessionId)) {
      terminalService.closeSession(sessionId);
    }

    logger.info(`Client disconnected: ${socket.id}`);
  });

  socket.on('error', (error) => {
    logger.error(`Socket error for ${socket.id}:`, error);
  });
});

// ============================================================
// SERVER STARTUP
// ============================================================

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

httpServer.listen(PORT, HOST, () => {
  logger.info(`========================================`);
  logger.info(`PanelOS Server Started`);
  logger.info(`========================================`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`Server: http://${HOST}:${PORT}`);
  logger.info(`Login: http://localhost:${PORT}/login`);
  logger.info(`Dashboard: http://localhost:${PORT}/dashboard`);
  logger.info(`Health: http://localhost:${PORT}/health`);
  logger.info(`========================================`);

  // Periodic rate limiter cleanup (every 5 minutes)
  setInterval(() => {
    rateLimiter.cleanup();
  }, 5 * 60 * 1000);
});

// Graceful shutdown
const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully...`);

  // Stop accepting new connections
  httpServer.close((err) => {
    if (err) {
      logger.error('Error closing server:', err);
    } else {
      logger.info('Server closed successfully');
    }
  });

  // Cleanup services
  try {
    terminalService.cleanup();
    logger.info('Terminal service cleaned up');
  } catch (error) {
    logger.error('Error cleaning up terminal service:', error);
  }

  // Force exit after cleanup
  setTimeout(() => {
    logger.warn('Forcing shutdown after timeout');
    process.exit(0);
  }, 3000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('UNHANDLED_REJECTION');
});

export { app, httpServer, io, logger };
