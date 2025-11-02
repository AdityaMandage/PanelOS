/**
 * PM2 Ecosystem Configuration
 * This file defines how PM2 should run and manage the PanelOS application
 * 
 * Usage:
 *   npm run start:pm2          # Start in development mode
 *   npm run start:pm2:prod     # Start in production mode
 *   npm run restart:pm2        # Restart the application
 *   npm run pm2:status         # View application status
 *   npm run pm2:logs           # View live logs
 *   npm run stop:pm2           # Stop the application
 *   npm run pm2:kill           # Stop PM2 daemon and all apps
 */

module.exports = {
  apps: [
    {
      // ============================================================
      // Application Name & Entry Point
      // ============================================================
      name: 'panelos',
      script: './server.js',
      
      // ============================================================
      // Process Management
      // ============================================================
      instances: 1,           // Run single instance (multiple not needed for system dashboard)
      exec_mode: 'cluster',   // Use cluster mode for better process management
      max_restarts: 10,       // Max restarts before giving up
      min_uptime: '10s',      // Minimum uptime before restart counts down
      max_memory_restart: '500M', // Restart if memory exceeds 500MB
      
      // ============================================================
      // Environment Variables
      // ============================================================
      env: {
        // Development environment
        NODE_ENV: 'development',
        PORT: 3000,
        HOST: '0.0.0.0',
        LOG_LEVEL: 'debug'
      },
      
      env_production: {
        // Production environment
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0',
        LOG_LEVEL: 'info'
      },
      
      // ============================================================
      // Logging Configuration
      // ============================================================
      out_file: './logs/pm2-out.log',      // Standard output
      error_file: './logs/pm2-error.log',  // Standard error
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z', // Log timestamp format
      
      // ============================================================
      // Graceful Shutdown
      // ============================================================
      kill_timeout: 5000,     // Wait 5 seconds before force killing
      listen_timeout: 3000,   // Wait 3 seconds for app to bind
      shutdown_delay: 1000,   // Delay shutdown by 1 second
      
      // ============================================================
      // Monitoring & Auto-Restart
      // ============================================================
      watch: false,           // Don't watch files (use nodemon for dev)
      ignore_watch: [         // Files/dirs to ignore if watch is enabled
        'node_modules',
        'logs',
        '.git',
        '.env'
      ],
      
      // ============================================================
      // Auto-Start & Persistence
      // ============================================================
      autorestart: true,      // Auto-restart on crash
      max_exits: 3,           // Max exits within 1 minute before stopping
      
      // ============================================================
      // Health Checks
      // ============================================================
      error_file: './logs/pm2-error.log',
      combine_logs: false,    // Don't combine logs from multiple instances
      
      // ============================================================
      // Merge env with loaded .env
      // ============================================================
      merge_logs: true,
    }
  ],
  
  // ============================================================
  // Deploy Configuration (Optional for multi-server setups)
  // ============================================================
  deploy: {
    production: {
      user: 'node',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/panelos.git',
      path: '/var/www/panelos',
      'post-deploy': 'npm install && npm run start:pm2:prod'
    }
  }
};
