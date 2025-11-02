# PanelOS

A lightweight, production-ready Linux system management dashboard built with Node.js, Express, and Socket.io. Monitor system metrics, manage firewalls, and access terminal sessions all from a modern web interface.

## Features

- **🖥️ Real-Time System Monitoring**: Live CPU, memory, disk, temperature, and network metrics
- **🔌 Web Terminal**: Full-featured SSH terminal with PTY support and resizable interface
- **🔥 Firewall Management**: GUI for managing firewall rules (ufw/iptables) with visual port exposure tracking
- **🔐 SSH Authentication**: Secure credential-based login with rate limiting
- **📊 System Information**: Comprehensive OS, kernel, and hardware details
- **📈 Daily Rotating Logs**: Automatic log rotation with 3-day retention policy

## System Monitoring

Real-time system metrics collection and visualization:

- **CPU Metrics**: Usage percentage, load averages, core temperatures
- **Memory**: RAM usage, swap usage, available memory
- **Disk**: Storage usage, read/write speeds, filesystem information
- **Network**: Interface statistics, bandwidth usage, connection counts
- **System Info**: OS details, uptime, hostname, kernel version

### Quick vs Full Metrics
- **Quick Metrics**: Lightweight polling for real-time dashboard updates
- **Full Metrics**: Comprehensive system information for detailed analysis

## SSH Terminal

Web-based terminal emulator with full PTY support:

- **Real-time Terminal**: Interactive shell access via WebSocket
- **PTY Support**: Full terminal emulation with colors and control codes
- **Session Management**: Persistent terminal sessions during user login
- **Resize Support**: Dynamic terminal resizing
- **Secure Connection**: SSH-based authentication and encryption

## Firewall Management

The firewall tab provides comprehensive firewall management:

- **Status Control**: Enable/disable the firewall with a single click
- View current firewall status (active/inactive)
- List all active firewall rules
- Add new rules with protocol, port, and source IP
- Delete existing rules
- Monitor exposed ports and their firewall status

### Supported Tools

- **ufw** (Ubuntu/Debian firewall)
- **iptables** (fallback for other distributions)

### Requirements

Firewall management requires sudo access to firewall commands. Configure passwordless sudo for the user running PanelOS:

```bash
# For ufw (Ubuntu/Debian)
echo "username ALL=(ALL) NOPASSWD: /usr/sbin/ufw" | sudo tee /etc/sudoers.d/panelos-ufw

# For iptables (other distributions)
echo "username ALL=(ALL) NOPASSWD: /usr/sbin/iptables" | sudo tee /etc/sudoers.d/panelos-iptables
```

Replace `username` with the actual username running PanelOS.

### Configuration

Set `FIREWALL_ENABLED=false` in your environment to disable firewall management entirely.

**Note**: Even with `FIREWALL_ENABLED=true`, firewall management will show "Setup Required" until sudo permissions are configured using the setup script. The web interface will display a "Show Setup Instructions" button with detailed commands.

## Authentication & Security

### SSH-Based Authentication
- **Secure Login**: Uses SSH credentials for system access
- **Session Management**: HTTP sessions with configurable timeouts
- **Rate Limiting**: Configurable login attempt limits
- **Input Sanitization**: Protection against injection attacks

### Security Features
- **Helmet.js**: Security headers and XSS protection
- **CORS**: Configurable cross-origin resource sharing
- **HTTPS Ready**: Environment-based SSL configuration
- **Logging**: Comprehensive audit logging with Winston

## Architecture

### Backend Services
- **AuthService**: Handles SSH authentication and session management
- **MetricsService**: Collects system information using systeminformation library
- **TerminalService**: Manages SSH terminal sessions with node-pty
- **FirewallService**: Interfaces with ufw/iptables for firewall management
- **RateLimiter**: Prevents brute force attacks

### API Layer
RESTful API endpoints with JSON responses and proper error handling.

### Frontend
- **Vanilla JavaScript**: No heavy frameworks for lightweight performance
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Socket.io**: Real-time bidirectional communication
- **Responsive Design**: Works on desktop and mobile devices

## How It Works

### Setup Script (`setup.sh`) - Detailed Explanation

The setup script automates the complete initialization of PanelOS:

1. **Root Permission Verification**
   - Checks if script is run with `sudo`
   - Extracts the non-root user who invoked sudo using `$SUDO_USER`
   - This allows operations to be performed with root privileges while tracking the actual user

2. **System Requirements Check**
   - Detects OS and kernel version from `/etc/os-release`
   - Searches for Node.js in multiple locations:
     - System-wide installation
     - User's `.nvm` directory (Node Version Manager)
     - User's `.fnm` directory (Fast Node Manager)
     - User's `.volta` directory (Volta version manager)
     - Fallback paths: `/usr/local/bin/node`, `/usr/bin/node`
   - Warns if Node.js not found (but doesn't fail - users can install it manually)
   - Checks for SSH client and firewall tools (ufw/iptables)

3. **Firewall Permission Setup**
   - Creates sudoers files for passwordless execution:
     - `/etc/sudoers.d/panelos-ufw` - Allows `ufw` commands without password
     - `/etc/sudoers.d/panelos-iptables` - Allows `iptables` commands without password
   - Format: `username ALL=(ALL) NOPASSWD: /path/to/command`
   - Verifies sudo access works with a test command
   - Sets proper permissions (0440) on sudoers files

4. **System Monitoring Permissions**
   - Verifies read access to `/sys/class/thermal` for temperature monitoring
   - Checks read access to `/proc/cpuinfo` for CPU information
   - These files are typically readable without special permissions

5. **Dependency Installation**
   - Updates apt package cache
   - Installs system tools: `curl`, `wget`, `sysstat`, `lm-sensors`, `net-tools`, `lsof`
   - These provide data for system monitoring

6. **Environment Template Creation**
   - Creates `.env.example` with all required environment variables
   - Includes comments about security recommendations
   - Users copy and modify this to create `.env`

7. **Optional Systemd Service Setup** (with `--systemd` flag)
   - Creates `/etc/systemd/system/panelos.service`
   - Enables auto-start on system boot
   - Can manage service with `systemctl`

### Firewall Service - Sudo Access Mechanism

The firewall service uses a multi-step approach to gain necessary privileges:

1. **Tool Detection**
   ```javascript
   await execAsync('which ufw');           // Check if ufw exists
   await execAsync('sudo -n ufw status');  // Test sudo access (non-interactive)
   ```

2. **Passwordless Sudo Configuration**
   - Setup script creates sudoers files with `NOPASSWD` directive
   - Example: `user ALL=(ALL) NOPASSWD: /usr/sbin/ufw`
   - The `-n` flag in `sudo -n` means non-interactive (fails if password needed)

3. **Privilege Escalation**
   - When running firewall commands, they're prefixed with `sudo`
   - The sudoers configuration allows these without password prompt
   - Commands are executed via `child_process.exec()`

4. **Security Considerations**
   - Credentials are never stored for firewall operations
   - Only the specific tools (ufw/iptables) can be run without password
   - All firewall commands are logged
   - User must still be authenticated via SSH for firewall operations

### Logging System - Daily Rotation & Retention

The improved logging uses Winston with daily rotation:

1. **Three Log Destinations**
   - **Console**: ERROR level only (clean terminal output)
   - **Error Log**: `logs/error-YYYY-MM-DD.log` - Error messages only
   - **App Log**: `logs/app-YYYY-MM-DD.log` - All messages (info+)

2. **Daily Rotation**
   - New log files created daily with date in filename
   - Rotation happens at midnight automatically
   - Files follow pattern: `error-2024-11-02.log`, `app-2024-11-03.log`, etc.

3. **3-Day Retention Policy**
   - `maxDays: '3d'` automatically deletes logs older than 3 days
   - No manual cleanup needed
   - Prevents unlimited disk usage growth

4. **File Size Management**
   - `maxSize: '20m'` rotates file if it exceeds 20MB
   - Combined with daily rotation for comprehensive log management

### Authentication & Credential Flow

1. **Login Phase**
   - User enters SSH username and password
   - Credentials are validated and tested via SSH connection
   - On success, HTTP session is created
   - **Credentials NOT stored** in session (security improvement)

2. **Terminal Access Phase**
   - When user opens terminal, UI prompts for password again
   - Password is sent with `terminal:start` socket event
   - Server validates user is authenticated before accepting
   - Terminal session uses provided credentials for SSH

3. **Secure Handling**
   - Passwords only transmitted over HTTPS in production
   - No password logging
   - Session timeout (default 30 minutes)
   - Rate limiting on failed login attempts (5 attempts per minute)

### Metrics Collection Strategy

1. **Real-Time Updates** (every 2 seconds)
   - CPU usage, memory usage, temperature
   - Transmitted via WebSocket (low overhead)
   - Limited data to keep network traffic minimal

2. **Detailed Metrics** (every 15 seconds)
   - Full system information
   - Disk usage, network interfaces
   - OS details, uptime
   - Fetched via HTTP REST API

3. **Error Resilience**
   - If individual metric collection fails, others continue
   - Fallback values prevent UI crashes
   - Errors logged but not displayed to user

## Installation

### Prerequisites
- Node.js 16+
- Linux system with SSH access
- ufw or iptables (for firewall management)

### Setup Steps
1. Run the setup script as root:
   ```bash
   sudo ./setup.sh
   ```

2. Copy environment configuration:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. Install dependencies and start:
   ```bash
   npm install
   npm start
   ```

   The server will start and display connection information. Press `Ctrl+C` to stop gracefully.

### Server Management

#### Option 1: Simple Script (Development)
- `npm start` - Start the server with proper signal handling
- `npm run stop` - Stop any running server instances  
- `npm run restart` - Restart the server
- `npm run dev` - Start in development mode with auto-reload

#### Option 2: PM2 Process Manager (Recommended for Production) ⭐

PM2 provides professional process management with auto-restart, log rotation, and resource monitoring.

**Installation & Quick Start:**
```bash
# Install PM2 (local or global)
npm install  # Already installed as dev dependency

# Start PanelOS with PM2 (background process)
npm run start:pm2         # Development mode
npm run start:pm2:prod    # Production mode

# View status
npm run pm2:status

# View logs
npm run pm2:logs

# Restart
npm run restart:pm2

# Stop
npm run stop:pm2
```

**PM2 Benefits:**
- ✅ Runs in background as a daemon
- ✅ Auto-restarts on crash
- ✅ Memory limits (500MB max)
- ✅ Built-in log management
- ✅ Process monitoring and health checks
- ✅ Graceful shutdown handling
- ✅ Perfect for 24/7 operation

**Production Setup with Auto-Start:**
```bash
# Start in production mode
npm run start:pm2:prod

# Save configuration
pm2 save

# Enable auto-start on system reboot
pm2 startup

# View setup instructions
npm run pm2:status
```

**All PM2 Commands:**
```bash
npm run start:pm2          # Start in development
npm run start:pm2:prod     # Start in production
npm run restart:pm2        # Restart PanelOS
npm run stop:pm2           # Stop PanelOS
npm run pm2:status         # View status
npm run pm2:logs           # View live logs (Ctrl+C to exit)
npm run pm2:kill           # Stop PM2 daemon
```

**Manual PM2 Commands:**
```bash
pm2 start ecosystem.config.cjs                   # Start app
pm2 start ecosystem.config.cjs --env production  # Production mode
pm2 stop panelos                                 # Stop app
pm2 restart panelos                              # Restart app
pm2 delete panelos                               # Remove from PM2
pm2 logs panelos                                 # View logs
pm2 monit                                        # Real-time monitoring
pm2 info panelos                                 # Detailed info
pm2 save                                         # Persist process list
```

### Setup Script Features

The `setup.sh` script automatically:
- ✅ Detects distro package manager and installs base dependencies (curl, git, openssl, sensors, firewall tools)
- ✅ Installs or upgrades Node.js (16+) plus npm automatically
- ✅ Installs PM2 globally and configures it to start PanelOS on boot
- ✅ Creates `.env.example`, generates `.env` with a secure session secret, and installs Node modules as the invoking user
- ✅ Grants passwordless sudo for firewall commands (ufw/iptables) and launches PanelOS immediately under PM2
- ✅ Verifies the dashboard is reachable on port 3000 and prints PM2 usage reminders

For a complete step-by-step provisioning walkthrough, including manual fallbacks, read [`SETUP.md`](SETUP.md).

### Manual Setup (Alternative)

If you prefer manual setup, configure sudo access for firewall commands:

```bash
# For ufw (Ubuntu/Debian)
echo "username ALL=(ALL) NOPASSWD: /usr/sbin/ufw" | sudo tee /etc/sudoers.d/panelos-ufw

# For iptables (other distributions)
echo "username ALL=(ALL) NOPASSWD: /usr/sbin/iptables" | sudo tee /etc/sudoers.d/panelos-iptables
```

Replace `username` with your actual username.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SSH_HOST` | SSH server hostname | localhost |
| `SSH_PORT` | SSH server port | 22 |
| `SSH_TIMEOUT` | SSH connection timeout (ms) | 10000 |
| `SESSION_SECRET` | Session encryption key | (required) |
| `SESSION_TIMEOUT` | Session timeout (ms) | 1800000 (30min) |
| `RATE_LIMIT_LOGIN` | Max login attempts | 5 |
| `RATE_LIMIT_WINDOW` | Rate limit window (ms) | 60000 |
| `PORT` | Server port | 3000 |
| `HOST` | Server host | 0.0.0.0 |
| `FIREWALL_ENABLED` | Enable/disable firewall management | true |
| `LOG_LEVEL` | Logging level | info |

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify session

### System Monitoring
- `GET /api/metrics/system` - Full system metrics
- `GET /api/metrics/quick` - Quick metrics for real-time updates

### Firewall
- `GET /api/firewall/status` - Get firewall status
- `POST /api/firewall/status` - Enable/disable firewall
- `GET /api/firewall/rules` - Get active rules
- `POST /api/firewall/rules` - Add new rule
- `DELETE /api/firewall/rules/:id` - Delete rule
- `GET /api/firewall/ports` - Get exposed ports

### System
- `GET /health` - Health check endpoint

## Development

### Available Scripts
- `npm start` - Start production server with graceful shutdown
- `npm run start:direct` - Start server directly (bypass wrapper)
- `npm run dev` - Start development server with nodemon
- `npm run stop` - Stop any running server instances
- `npm run restart` - Restart the server
- `npm run lint` - Run ESLint code analysis
- `npm test` - Run Jest test suite

### Project Structure
```
├── server.js              # Main application server
├── services/              # Business logic services
│   ├── auth.service.js
│   ├── metrics.service.js
│   ├── terminal.service.js
│   └── firewall.service.js
├── public/                # Frontend assets
│   ├── index.html
│   ├── login.html
│   └── js/
│       ├── dashboard.js
│       └── terminal.js
├── logs/                  # Application logs
└── package.json
```

## Security Considerations

- **SSH Keys**: Consider using SSH key authentication for better security
- **Firewall**: Keep ufw/iptables properly configured
- **Environment**: Use strong session secrets in production
- **HTTPS**: Enable SSL/TLS in production environments
- **Updates**: Keep dependencies updated for security patches

## Systemd Service (Optional)

For production deployment, set up PanelOS as a systemd service:

```bash
# Run setup with systemd support
sudo ./setup.sh --systemd

# Or manually enable the service
sudo systemctl enable panelos
sudo systemctl start panelos
sudo systemctl status panelos
```

## Troubleshooting

### Firewall Permission Errors
If you see firewall-related errors, run the setup script:
```bash
sudo ./setup.sh
```

### Port Already in Use
If port 3000 is busy, change the PORT in your `.env` file.

### SSH Connection Issues
Ensure SSH service is running and accessible:
```bash
sudo systemctl status ssh
```

## Recent Improvements (v1.1.0)

### Security & Robustness Enhancements
- ✅ **Enhanced Logging**: Winston-based logging with daily rotation and 3-day retention
  - Console: ERROR level only (clean output during operation)
  - Files: All logs automatically rotated daily
  - Prevents unlimited disk usage growth
- ✅ **Credential Security**: Credentials no longer stored in sessions
  - Passwords are validated once at login
  - Terminal sessions require fresh credentials
  - Reduces attack surface significantly
- ✅ **Input Validation**: Enhanced validation on firewall rules and terminal dimensions
  - Port range validation (1-65535)
  - Terminal size bounds checking (5x10 to 500x500)
  - IP/CIDR notation validation for firewall rules
- ✅ **Session Timeout**: Terminal sessions now timeout after 30 minutes of inactivity
  - Automatic cleanup of idle sessions
  - Prevents resource leaks
- ✅ **Error Handling**: Comprehensive error handling across all services
  - Better error messages for users
  - Improved error logging for debugging
  - Graceful degradation when features unavailable

### Code Quality Improvements
- ✅ **Service Robustness**: All services improved with better error recovery
  - Metrics continue if one metric type fails
  - Terminal service handles edge cases
  - Firewall service validates all inputs
- ✅ **Frontend Error UI**: User-friendly error notifications
  - Non-blocking error/success messages
  - Auto-dismiss after timeout
  - Clear, actionable error text
- ✅ **Documentation**: Comprehensive inline comments
  - Setup script fully documented
  - Firewall sudo mechanism explained
  - Logging strategy clarified
  - Credential flow documented

### Configuration Improvements
- ✅ **Environment File Cleanup**: Removed unused configuration options
  - Streamlined .env for production use
  - Clear documentation for each variable
  - Warnings for sensitive values
- ✅ **Dependency Management**: Added winston-daily-rotate-file for log rotation
- ✅ **.gitignore Review**: Verified sensitive files are excluded

## Future Enhancements & Roadmap

### Short Term (Next Release)
- **Process Manager**: View, monitor, and manage system processes
  - List running processes with CPU/memory usage
  - Kill process functionality
  - Process restart on crash
- **Docker Integration** (optional): Monitor Docker containers
  - List running containers
  - View container resource usage
  - Basic container management
- **Service Status Page**: Display status of critical services
  - SSH service status
  - Firewall service status
  - Custom service monitoring

### Medium Term
- **User Authentication & RBAC**: Multi-user support with role-based access control
  - Different permission levels (admin, user, viewer)
  - User management interface
  - Audit trail of user actions
- **Database Backend**: Persistent storage for audit logs and configuration
  - SQLite for lightweight deployments
  - Configurable log retention
  - Query logs by date/user/action
- **API Documentation**: Auto-generated API docs
  - Swagger/OpenAPI specification
  - Interactive API explorer
  - Authentication examples
- **System Alerts**: Threshold-based alerting
  - CPU/memory usage alerts
  - Disk space warnings
  - Temperature monitoring with alerts
  - Email/webhook notifications

### Long Term
- **Distributed Monitoring**: Monitor multiple systems from one dashboard
  - Remote agent deployment
  - Aggregated metrics view
  - Cross-system health checks
- **Mobile Application**: Native mobile apps for system monitoring
  - Push notifications for alerts
  - Simplified interface for mobile
  - Offline viewing of cached metrics
- **Advanced Analytics**: Historical data analysis and trending
  - Performance trending over time
  - Usage pattern analysis
  - Predictive alerting based on trends
  - Export reports (PDF, CSV)
- **High Availability**: Cluster support and failover
  - Multiple PanelOS instances
  - Shared configuration backend
  - Automatic failover
  - Load balancing

### Community Contributions
We welcome contributions! Areas looking for help:
- [ ] Unit tests (Jest test coverage)
- [ ] Integration tests for API endpoints
- [ ] Frontend component testing
- [ ] Internationalization (i18n)
- [ ] Dark/light theme toggle
- [ ] Additional language support in terminal
- [ ] Support for more firewall tools (firewalld, nftables)
- [ ] Performance optimizations
- [ ] Docker containerization

## Architecture Notes

### Design Principles
1. **Lightweight**: Minimal dependencies, runs on modest hardware
2. **Security First**: No credential storage, rate limiting, input validation
3. **Resilient**: Services continue operating even when some metrics fail
4. **Observable**: Comprehensive logging for debugging and auditing
5. **Maintainable**: Clean code structure, well-documented services

### Technology Stack
- **Backend**: Node.js + Express.js (ES6 modules)
- **Real-time Communication**: Socket.io over WebSocket
- **System Queries**: systeminformation library
- **Terminal Emulation**: xterm.js (frontend) + node-pty (backend)
- **Logging**: Winston with daily rotation
- **Authentication**: SSH-based validation
- **Styling**: Tailwind CSS framework

### Service Layer Architecture
Each service is independently testable and follows the singleton pattern:
- `AuthService`: Validates credentials via SSH
- `MetricsService`: Collects system information
- `TerminalService`: Manages SSH terminal sessions with TTY
- `FirewallService`: Interfaces with system firewall tools
- `RateLimiter`: In-memory rate limiting with cleanup

═══════════════════════════════════════════════════════════════════════════════
                        QUICK REFERENCE GUIDE
═══════════════════════════════════════════════════════════════════════════════

🚀 STARTING THE APPLICATION
  npm start          # Start with proper signal handling (recommended)
  npm run dev        # Development with auto-reload (nodemon)
  npm run stop       # Stop any running instances
  npm run restart    # Restart the server

📝 INITIAL SETUP
  1. sudo ./setup.sh            # Configure system permissions & install deps
  2. cp .env.example .env       # Create environment file
  3. npm install                # Install Node.js dependencies
  4. npm start                  # Start the server
  5. Visit http://localhost:3000/login

🔐 SECURITY POINTS TO REMEMBER
  • Session secret should be strong (use: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
  • Credentials are NOT stored - users must enter password to use terminal
  • Firewall requires sudo setup via setup.sh or manual sudoers configuration
  • Always use HTTPS in production (enable via reverse proxy or env config)

📊 MONITORING & LOGS
  • Console shows only ERROR level (clean output)
  • Logs stored in logs/ directory with daily rotation
  • 3-day retention policy (auto-cleanup)
  • Files: logs/error-YYYY-MM-DD.log and logs/app-YYYY-MM-DD.log

🔧 CONFIGURATION
  Key variables in .env:
  - PORT: Server port (default 3000)
  - SSH_HOST: Target SSH host (localhost for local system)
  - SESSION_TIMEOUT: Session duration (default 30 mins)
  - FIREWALL_ENABLED: Enable/disable firewall management
  - LOG_LEVEL: Logging level (debug, info, error)

⚠️  TROUBLESHOOTING
  Port conflict?        → Change PORT in .env
  SSH auth failing?     → Verify SSH is running: sudo systemctl status ssh
  Firewall denied?      → Run: sudo ./setup.sh
  Can't see logs?       → Check ls -la logs/
  High CPU usage?       → Check metrics collection: grep metrics logs/
  Terminal not working? → Verify SSH credentials and user permissions

═══════════════════════════════════════════════════════════════════════════════