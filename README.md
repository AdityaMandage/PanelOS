# PanelOS# PanelOS



A lightweight, production-ready Linux system management dashboard. Monitor system metrics, manage firewalls, and access terminal sessions all from a modern web interface.A lightweight, production-ready Linux system management dashboard built with Node.js, Express, and Socket.io. Monitor system metrics, manage firewalls, and access terminal sessions all from a modern web interface.



**⚠️ For Developers:** This is a foundational system—deliberately lean and focused on core functionality without bloat. If you need additional features, feel free to extend it, open an issue, or contribute. All ideas welcome!---



---**⚠️ Note for Developers:** This is a **foundational system** — deliberately lean and focused. It provides core functionality for system management without unnecessary bloat. If you need additional features, feel free to extend it or open an issue with your ideas. Contributions are welcome!



## Features## Features



- **🖥️ Real-Time System Monitoring**: Live CPU, memory, disk, temperature, and network metrics- **🖥️ Real-Time System Monitoring**: Live CPU, memory, disk, temperature, and network metrics

- **🔌 Web Terminal**: Full-featured SSH terminal with PTY support and dynamic resizing- **🔌 Web Terminal**: Full-featured SSH terminal with PTY support and resizable interface

- **🔥 Firewall Management**: Visual interface for ufw/iptables rule management- **🔥 Firewall Management**: GUI for managing firewall rules (ufw/iptables) with visual port exposure tracking

- **🔐 SSH Authentication**: Secure credential-based login with rate limiting- **🔐 SSH Authentication**: Secure credential-based login with rate limiting

- **📊 System Info**: OS details, uptime, hostname, kernel version- **📊 System Information**: Comprehensive OS, kernel, and hardware details

- **📈 Auto-Rotating Logs**: Daily rotation with 3-day retention policy- **📈 Daily Rotating Logs**: Automatic log rotation with 3-day retention policy



---## System Monitoring



## Quick StartReal-time system metrics collection and visualization:



### Automated Setup (Recommended)- **CPU Metrics**: Usage percentage, load averages, core temperatures

- **Memory**: RAM usage, swap usage, available memory

```bash- **Disk**: Storage usage, read/write speeds, filesystem information

git clone https://github.com/AdityaMandage/PanelOS.git- **Network**: Interface statistics, bandwidth usage, connection counts

cd PanelOS- **System Info**: OS details, uptime, hostname, kernel version

chmod +x setup.sh

sudo ./setup.sh### Quick vs Full Metrics

```- **Quick Metrics**: Lightweight polling for real-time dashboard updates

- **Full Metrics**: Comprehensive system information for detailed analysis

Then access the dashboard at `http://<SERVER_IP>:3000`

## SSH Terminal

**Login with any valid system user credentials** (SSH username/password).

Web-based terminal emulator with full PTY support:

### Manual Setup

- **Real-time Terminal**: Interactive shell access via WebSocket

See [SETUP.md](SETUP.md) for step-by-step instructions, manual fallback procedures, and comprehensive troubleshooting.- **PTY Support**: Full terminal emulation with colors and control codes

- **Session Management**: Persistent terminal sessions during user login

---- **Resize Support**: Dynamic terminal resizing

- **Secure Connection**: SSH-based authentication and encryption

## What It Does

## Firewall Management

### System Monitoring

- **CPU**: Usage, per-core load, temperatureThe firewall tab provides comprehensive firewall management:

- **Memory**: Total/used/free/cached RAM

- **Disk**: Storage usage per mount point- **Status Control**: Enable/disable the firewall with a single click

- **Network**: Interface stats and bandwidth- View current firewall status (active/inactive)

- **System**: Uptime, kernel, OS info- List all active firewall rules

- **Temperature**: Real-time CPU temperature- Add new rules with protocol, port, and source IP

- Delete existing rules

### Web Terminal- Monitor exposed ports and their firewall status

- SSH-based terminal with full PTY emulation

- Colors and control codes fully supported### Supported Tools

- Dynamic terminal resizing

- Session persists while logged in- **ufw** (Ubuntu/Debian firewall)

- 30-minute idle timeout- **iptables** (fallback for other distributions)



### Firewall Management### Requirements

- Enable/disable firewall

- List active rulesFirewall management requires sudo access to firewall commands. Configure passwordless sudo for the user running PanelOS:

- Add/delete rules by port, protocol

- View exposed ports```bash

- Supports ufw (Ubuntu/Debian) and iptables# For ufw (Ubuntu/Debian)

echo "username ALL=(ALL) NOPASSWD: /usr/sbin/ufw" | sudo tee /etc/sudoers.d/panelos-ufw

---

# For iptables (other distributions)

## Architecture Overviewecho "username ALL=(ALL) NOPASSWD: /usr/sbin/iptables" | sudo tee /etc/sudoers.d/panelos-iptables

```

```

┌─────────────────────────────────────┐Replace `username` with the actual username running PanelOS.

│         Frontend (Browser)          │

│  • Vanilla JS + Tailwind CSS        │### Configuration

│  • Socket.io for real-time data     │

└──────────────┬──────────────────────┘Set `FIREWALL_ENABLED=false` in your environment to disable firewall management entirely.

               │

        Socket.io / REST API**Note**: Even with `FIREWALL_ENABLED=true`, firewall management will show "Setup Required" until sudo permissions are configured using the setup script. The web interface will display a "Show Setup Instructions" button with detailed commands.

               │

┌──────────────▼──────────────────────┐## Authentication & Security

│      Backend (Node.js/Express)      │

├──────────────────────────────────────┤### SSH-Based Authentication

│  Services:                           │- **Secure Login**: Uses SSH credentials for system access

│  • AuthService (SSH validation)      │- **Session Management**: HTTP sessions with configurable timeouts

│  • MetricsService (system info)      │- **Rate Limiting**: Configurable login attempt limits

│  • TerminalService (PTY sessions)    │- **Input Sanitization**: Protection against injection attacks

│  • FirewallService (ufw/iptables)    │

│  • RateLimiter (brute force protect) │### Security Features

└──────────────┬──────────────────────┘- **Helmet.js**: Security headers and XSS protection

               │- **CORS**: Configurable cross-origin resource sharing

        System & SSH- **HTTPS Ready**: Environment-based SSL configuration

               │- **Logging**: Comprehensive audit logging with Winston

    ┌──────────┴──────────┐

    │                     │## Architecture

  SSH (/etc/passwd)   System Files

  (auth, terminal)    (/proc, /sys)### Backend Services

```- **AuthService**: Handles SSH authentication and session management

- **MetricsService**: Collects system information using systeminformation library

### Tech Stack- **TerminalService**: Manages SSH terminal sessions with node-pty

- **Backend**: Node.js (ES modules) + Express.js- **FirewallService**: Interfaces with ufw/iptables for firewall management

- **Real-time**: Socket.io (WebSocket + polling fallback)- **RateLimiter**: Prevents brute force attacks

- **System**: systeminformation library

- **Terminal**: node-pty + SSH2### API Layer

- **Logging**: Winston with daily rotationRESTful API endpoints with JSON responses and proper error handling.

- **Auth**: SSH-based (no database)

- **Frontend**: Vanilla JS + Tailwind CSS (CDN)### Frontend

- **Vanilla JavaScript**: No heavy frameworks for lightweight performance

---- **Tailwind CSS**: Utility-first CSS framework for responsive design

- **Socket.io**: Real-time bidirectional communication

## Configuration- **Responsive Design**: Works on desktop and mobile devices



All configuration via `.env` file. See [SETUP.md](SETUP.md) for details.## How It Works



**Key Variables:**### Setup Script (`setup.sh`) - Detailed Explanation

- `PORT` - HTTP port (default: 3000)

- `SSH_HOST` - SSH target (default: localhost)The setup script automates the complete initialization of PanelOS:

- `SESSION_TIMEOUT` - Session lifetime in ms (default: 30 mins)

- `FIREWALL_ENABLED` - Enable firewall management (default: true)1. **Root Permission Verification**

- `LOG_LEVEL` - Logging verbosity (default: info)   - Checks if script is run with `sudo`

   - Extracts the non-root user who invoked sudo using `$SUDO_USER`

**Generate a secure SESSION_SECRET:**   - This allows operations to be performed with root privileges while tracking the actual user

```bash

openssl rand -hex 642. **System Requirements Check**

```   - Detects OS and kernel version from `/etc/os-release`

   - Searches for Node.js in multiple locations:

---     - System-wide installation

     - User's `.nvm` directory (Node Version Manager)

## Security Model     - User's `.fnm` directory (Fast Node Manager)

     - User's `.volta` directory (Volta version manager)

### Authentication     - Fallback paths: `/usr/local/bin/node`, `/usr/bin/node`

- Uses SSH credentials (no separate user database)   - Warns if Node.js not found (but doesn't fail - users can install it manually)

- Credentials validated at login, not stored   - Checks for SSH client and firewall tools (ufw/iptables)

- HTTP sessions with configurable timeout

- Rate limiting: 5 attempts per minute per IP3. **Firewall Permission Setup**

   - Creates sudoers files for passwordless execution:

### Data Protection     - `/etc/sudoers.d/panelos-ufw` - Allows `ufw` commands without password

- No password logging     - `/etc/sudoers.d/panelos-iptables` - Allows `iptables` commands without password

- Session cookies: HTTP-only, SameSite=Lax   - Format: `username ALL=(ALL) NOPASSWD: /path/to/command`

- Input validation on all endpoints   - Verifies sudo access works with a test command

- SQL injection/XSS prevention via input sanitization   - Sets proper permissions (0440) on sudoers files



### Firewall Access4. **System Monitoring Permissions**

- Requires passwordless `sudo` for firewall commands   - Verifies read access to `/sys/class/thermal` for temperature monitoring

- Only specific tools (ufw/iptables) have sudo access   - Checks read access to `/proc/cpuinfo` for CPU information

- All firewall actions logged   - These files are typically readable without special permissions



### Logging5. **Dependency Installation**

- Console: ERROR level only (clean output)   - Updates apt package cache

- Files: Error and app logs with daily rotation   - Installs system tools: `curl`, `wget`, `sysstat`, `lm-sensors`, `net-tools`, `lsof`

- 3-day retention, auto-cleanup   - These provide data for system monitoring

- Location: `logs/error-YYYY-MM-DD.log`, `logs/app-YYYY-MM-DD.log`

6. **Environment Template Creation**

---   - Creates `.env.example` with all required environment variables

   - Includes comments about security recommendations

## API Reference   - Users copy and modify this to create `.env`



### Authentication7. **Optional Systemd Service Setup** (with `--systemd` flag)

- `POST /api/auth/login` - Login   - Creates `/etc/systemd/system/panelos.service`

- `POST /api/auth/logout` - Logout   - Enables auto-start on system boot

- `GET /api/auth/verify` - Check session   - Can manage service with `systemctl`



### Metrics### Firewall Service - Sudo Access Mechanism

- `GET /api/metrics/system` - Full system metrics

- `GET /api/metrics/quick` - Real-time metrics (CPU, memory, temp)The firewall service uses a multi-step approach to gain necessary privileges:



### Firewall1. **Tool Detection**

- `GET /api/firewall/status` - Firewall enabled/disabled   ```javascript

- `POST /api/firewall/status` - Enable/disable firewall   await execAsync('which ufw');           // Check if ufw exists

- `GET /api/firewall/rules` - List active rules   await execAsync('sudo -n ufw status');  // Test sudo access (non-interactive)

- `POST /api/firewall/rules` - Add rule   ```

- `DELETE /api/firewall/rules/:id` - Delete rule

- `GET /api/firewall/ports` - View exposed ports2. **Passwordless Sudo Configuration**

   - Setup script creates sudoers files with `NOPASSWD` directive

### Health   - Example: `user ALL=(ALL) NOPASSWD: /usr/sbin/ufw`

- `GET /health` - Server status + uptime   - The `-n` flag in `sudo -n` means non-interactive (fails if password needed)



---3. **Privilege Escalation**

   - When running firewall commands, they're prefixed with `sudo`

## Development   - The sudoers configuration allows these without password prompt

   - Commands are executed via `child_process.exec()`

### Available Scripts

```bash4. **Security Considerations**

npm start          # Production server with signal handling   - Credentials are never stored for firewall operations

npm run dev        # Development mode with auto-reload (nodemon)   - Only the specific tools (ufw/iptables) can be run without password

npm run stop       # Stop any running server   - All firewall commands are logged

npm run restart    # Restart the server   - User must still be authenticated via SSH for firewall operations

npm run lint       # ESLint code analysis

npm test           # Jest test suite### Logging System - Daily Rotation & Retention

```

The improved logging uses Winston with daily rotation:

### Project Structure

```1. **Three Log Destinations**

.   - **Console**: ERROR level only (clean terminal output)

├── server.js                 # Main Express + Socket.io server   - **Error Log**: `logs/error-YYYY-MM-DD.log` - Error messages only

├── services/   - **App Log**: `logs/app-YYYY-MM-DD.log` - All messages (info+)

│   ├── auth.service.js       # SSH authentication

│   ├── metrics.service.js    # System metrics collection2. **Daily Rotation**

│   ├── terminal.service.js   # PTY session management   - New log files created daily with date in filename

│   ├── firewall.service.js   # Firewall operations   - Rotation happens at midnight automatically

│   └── rate-limiter.js       # Brute force protection   - Files follow pattern: `error-2024-11-02.log`, `app-2024-11-03.log`, etc.

├── public/

│   ├── index.html            # Dashboard UI3. **3-Day Retention Policy**

│   ├── login.html            # Login page   - `maxDays: '3d'` automatically deletes logs older than 3 days

│   └── js/   - No manual cleanup needed

│       ├── dashboard.js      # Dashboard logic   - Prevents unlimited disk usage growth

│       └── terminal.js       # Terminal emulator

├── logs/                     # Application logs (auto-rotated)4. **File Size Management**

├── ecosystem.config.cjs      # PM2 configuration   - `maxSize: '20m'` rotates file if it exceeds 20MB

├── setup.sh                  # Automated setup script   - Combined with daily rotation for comprehensive log management

└── SETUP.md                  # Complete setup guide

```### Authentication & Credential Flow



---1. **Login Phase**

   - User enters SSH username and password

## Process Management   - Credentials are validated and tested via SSH connection

   - On success, HTTP session is created

### Using PM2 (Recommended for Production)   - **Credentials NOT stored** in session (security improvement)



```bash2. **Terminal Access Phase**

# Start   - When user opens terminal, UI prompts for password again

pm2 start ecosystem.config.cjs --env development   - Password is sent with `terminal:start` socket event

   - Server validates user is authenticated before accepting

# View status   - Terminal session uses provided credentials for SSH

pm2 status

3. **Secure Handling**

# View logs   - Passwords only transmitted over HTTPS in production

pm2 logs panelos   - No password logging

   - Session timeout (default 30 minutes)

# Restart   - Rate limiting on failed login attempts (5 attempts per minute)

pm2 restart panelos

### Metrics Collection Strategy

# Stop

pm2 stop panelos1. **Real-Time Updates** (every 2 seconds)

   - CPU usage, memory usage, temperature

# Enable auto-start on reboot   - Transmitted via WebSocket (low overhead)

pm2 save   - Limited data to keep network traffic minimal

pm2 startup systemd -u $(whoami) --hp $(eval echo ~$(whoami))

```2. **Detailed Metrics** (every 15 seconds)

   - Full system information

### Using npm (Simple)   - Disk usage, network interfaces

   - OS details, uptime

```bash   - Fetched via HTTP REST API

npm start    # Run in foreground

npm run dev  # With auto-reload3. **Error Resilience**

npm run stop # Stop background process   - If individual metric collection fails, others continue

```   - Fallback values prevent UI crashes

   - Errors logged but not displayed to user

---

## Installation

## Monitoring & Logs

### Prerequisites

### View Logs- Node.js 16+

```bash- Linux system with SSH access

# Real-time- ufw or iptables (for firewall management)

pm2 logs panelos

### Setup Steps

# Historical (past errors)1. Run the setup script as root:

tail -50 logs/error-*.log   ```bash

   sudo ./setup.sh

# Search logs   ```

grep "ERROR\|WARN" logs/*.log

```2. Copy environment configuration:

   ```bash

### Monitor Resources   cp .env.example .env

```bash   # Edit .env with your settings

# PM2 real-time monitoring   ```

pm2 monit

3. Install dependencies and start:

# System resource usage   ```bash

ps aux | grep node   npm install

```   npm start

   ```

---

   The server will start and display connection information. Press `Ctrl+C` to stop gracefully.

## Troubleshooting

### Server Management

### Common Issues

#### Option 1: Simple Script (Development)

**Port 3000 already in use?**- `npm start` - Start the server with proper signal handling

```bash- `npm run stop` - Stop any running server instances  

lsof -i :3000              # Find process- `npm run restart` - Restart the server

kill -9 <PID>              # Kill it- `npm run dev` - Start in development mode with auto-reload

# Or change PORT in .env

```#### Option 2: PM2 Process Manager (Recommended for Production) ⭐



**SSH authentication failing?**PM2 provides professional process management with auto-restart, log rotation, and resource monitoring.

```bash

ssh username@localhost     # Test SSH works**⚡ QUICKEST WAY TO RUN:**

sudo systemctl status ssh  # Check SSH service

```See **[QUICKSTART.md](QUICKSTART.md)** for step-by-step instructions on all Linux distributions, or use the automated setup:



**Firewall errors?**```bash

```bashgit clone https://github.com/AdityaMandage/PanelOS.git

sudo ./setup.sh            # Re-run setupcd PanelOS

sudo -n ufw status         # Test sudo accesschmod +x setup.sh

```sudo ./setup.sh

```

**Application won't start?**

```bash**Manual PM2 Commands:**

pm2 logs panelos           # Check logs```bash

tail logs/error-*.log      # View errors# Install PM2 globally

```npm install -g pm2



**Cannot access from another machine?**# Start PanelOS in development mode

```bashpm2 start ecosystem.config.cjs --env development

grep HOST .env             # Should be 0.0.0.0

curl -I http://localhost:3000  # Test locally# View status

```pm2 status



**For more details**, see [SETUP.md](SETUP.md) - comprehensive troubleshooting guide.# View logs

pm2 logs panelos

---

# Restart

## Roadmap & Contributionspm2 restart panelos



### Planned Features# Stop

- Process manager (view/kill processes)pm2 stop panelos

- Docker container monitoring

- Service status page# Auto-start on boot

- Multi-user + RBACpm2 startup systemd -u $(whoami) --hp $(eval echo ~$(whoami))

- Database backend for logspm2 save

- Distributed monitoring (multiple systems)```

- Mobile app

- Advanced analytics & trending**PM2 Benefits:**

- ✅ Runs in background as a daemon

### Contributing- ✅ Auto-restarts on crash

We welcome contributions in any form:- ✅ Memory limits (500MB max)

- **Bug reports**: Open an issue with logs and environment- ✅ Built-in log management

- **Features**: Suggest ideas or implement them- ✅ Process monitoring and health checks

- **Tests**: Unit/integration tests appreciated- ✅ Graceful shutdown handling

- **Documentation**: Clarifications and examples````

- **Performance**: Optimization suggestions- ✅ Perfect for 24/7 operation



**Areas looking for help:****Production Setup with Auto-Start:**

- Test coverage (Jest)```bash

- Additional firewall tool support (firewalld, nftables)# Start in production mode

- Dark/light theme togglenpm run start:pm2:prod

- Internationalization (i18n)

- Docker containerization# Save configuration

- Reverse proxy examples (nginx + SSL)pm2 save



---# Enable auto-start on system reboot

pm2 startup

## Requirements

# View setup instructions

- **OS**: Any Linux distributionnpm run pm2:status

- **Node.js**: v16 or newer```

- **RAM**: 512MB minimum (1GB recommended)

- **Disk**: 200MB free**All PM2 Commands:**

- **Internet**: For initial setup only```bash

- **Privileges**: `sudo` access for setup + firewall confignpm run start:pm2          # Start in development

npm run start:pm2:prod     # Start in production

**Supported Distros:**npm run restart:pm2        # Restart PanelOS

- Debian / Ubuntu / Raspberry Pi OSnpm run stop:pm2           # Stop PanelOS

- Fedora / RHEL / CentOS / Rocky / AlmaLinuxnpm run pm2:status         # View status

- Arch / Manjaronpm run pm2:logs           # View live logs (Ctrl+C to exit)

- openSUSEnpm run pm2:kill           # Stop PM2 daemon

```

---

**Manual PM2 Commands:**

## Important Notes```bash

pm2 start ecosystem.config.cjs                   # Start app

### Security Considerationspm2 start ecosystem.config.cjs --env production  # Production mode

- **Production**: Use HTTPS with reverse proxy (nginx + certbot)pm2 stop panelos                                 # Stop app

- **Credentials**: Use strong SSH passwords or SSH keyspm2 restart panelos                              # Restart app

- **Updates**: Keep Node.js and dependencies updatedpm2 delete panelos                               # Remove from PM2

- **Firewall**: Properly configure system firewall in addition to PanelOSpm2 logs panelos                                 # View logs

- **Access Control**: Restrict network access to dashboard via firewallpm2 monit                                        # Real-time monitoring

pm2 info panelos                                 # Detailed info

### Performancepm2 save                                         # Persist process list

- Designed for single system (Raspberry Pi 3B+ and up)```

- ~50-100MB memory footprint

- Minimal CPU overhead### Setup Script Features

- Not suitable for large-scale multi-system monitoring (use Prometheus/Grafana instead)

The `setup.sh` script automatically:

### Limitations- ✅ Detects distro package manager and installs base dependencies (curl, git, openssl, sensors, firewall tools)

- Single-instance only (no clustering)- ✅ Installs or upgrades Node.js (16+) plus npm automatically

- In-memory sessions (lost on restart)- ✅ Installs PM2 globally and configures it to start PanelOS on boot

- SSH-only authentication (no LDAP/AD)- ✅ Creates `.env.example`, generates `.env` with a secure session secret, and installs Node modules as the invoking user

- Metrics not persisted (no historical data)- ✅ Grants passwordless sudo for firewall commands (ufw/iptables) and launches PanelOS immediately under PM2

- One user per terminal session- ✅ Verifies the dashboard is reachable on port 3000 and prints PM2 usage reminders



---For a complete step-by-step provisioning walkthrough, including manual fallbacks, read [`SETUP.md`](SETUP.md).



## License### Manual Setup (Alternative)



MIT License - See LICENSE file for detailsIf you prefer manual setup, configure sudo access for firewall commands:



---```bash

# For ufw (Ubuntu/Debian)

## Supportecho "username ALL=(ALL) NOPASSWD: /usr/sbin/ufw" | sudo tee /etc/sudoers.d/panelos-ufw



1. **Setup Issues**: See [SETUP.md](SETUP.md) for comprehensive guide# For iptables (other distributions)

2. **Logs**: Check `pm2 logs panelos` and `logs/` directoryecho "username ALL=(ALL) NOPASSWD: /usr/sbin/iptables" | sudo tee /etc/sudoers.d/panelos-iptables

3. **Documentation**: Read inline code comments and architecture notes below```

4. **Issues**: GitHub issues with error logs and environment details

Replace `username` with your actual username.

---

## Environment Variables

## Architecture Deep Dive

| Variable | Description | Default |

### Request Flow: Authentication|----------|-------------|---------|

```| `SSH_HOST` | SSH server hostname | localhost |

1. User submits login form (username + password)| `SSH_PORT` | SSH server port | 22 |

2. Server validates input format| `SSH_TIMEOUT` | SSH connection timeout (ms) | 10000 |

3. Server tests SSH connection with credentials| `SESSION_SECRET` | Session encryption key | (required) |

4. If successful: HTTP session created| `SESSION_TIMEOUT` | Session timeout (ms) | 1800000 (30min) |

5. If failed: Return 401 with error| `RATE_LIMIT_LOGIN` | Max login attempts | 5 |

→ Credentials NOT stored anywhere| `RATE_LIMIT_WINDOW` | Rate limit window (ms) | 60000 |

```| `PORT` | Server port | 3000 |

| `HOST` | Server host | 0.0.0.0 |

### Request Flow: Terminal Session| `FIREWALL_ENABLED` | Enable/disable firewall management | true |

```| `LOG_LEVEL` | Logging level | info |

1. User clicks "Terminal" tab

2. Frontend prompts for password (fresh credentials)## API Endpoints

3. Send terminal:start event with user/pass/rows/cols

4. Server validates user is authenticated### Authentication

5. Server opens SSH shell + PTY- `POST /api/auth/login` - User login

6. Bi-directional stream: client ↔ terminal- `POST /api/auth/logout` - User logout

7. On disconnect: cleanup session- `GET /api/auth/verify` - Verify session

→ SSH connection persists while tab open

```### System Monitoring

- `GET /api/metrics/system` - Full system metrics

### Request Flow: Firewall Management- `GET /api/metrics/quick` - Quick metrics for real-time updates

```

1. User clicks firewall rule action### Firewall

2. Server calls FirewallService- `GET /api/firewall/status` - Get firewall status

3. Service auto-detects ufw vs iptables- `POST /api/firewall/status` - Enable/disable firewall

4. Executes `sudo -n <tool>` (non-interactive)- `GET /api/firewall/rules` - Get active rules

5. Returns result or error- `POST /api/firewall/rules` - Add new rule

→ Requires passwordless sudo setup- `DELETE /api/firewall/rules/:id` - Delete rule

```- `GET /api/firewall/ports` - Get exposed ports



### Metrics Collection Strategy### System

```- `GET /health` - Health check endpoint

Real-time (every 2s via Socket.io):

  • CPU usage %## Development

  • Memory usage %

  • Temperature### Available Scripts

- `npm start` - Start production server with graceful shutdown

Full metrics (every 15s via REST API):- `npm run start:direct` - Start server directly (bypass wrapper)

  • CPU per-core- `npm run dev` - Start development server with nodemon

  • Memory details- `npm run stop` - Stop any running server instances

  • Disk per mount- `npm run restart` - Restart the server

  • Network interfaces- `npm run lint` - Run ESLint code analysis

  • System info- `npm test` - Run Jest test suite



If metric collection fails:### Project Structure

  • Return fallback value (0, N/A)```

  • Log error internally├── server.js              # Main application server

  • Continue with other metrics├── services/              # Business logic services

```│   ├── auth.service.js

│   ├── metrics.service.js

### Service Lifecycle│   ├── terminal.service.js

```│   └── firewall.service.js

Server Startup:├── public/                # Frontend assets

  1. Load environment variables (.env)│   ├── index.html

  2. Initialize all services (Auth, Metrics, Terminal, Firewall)│   ├── login.html

  3. Setup logging (Winston + daily rotation)│   └── js/

  4. Setup session management (in-memory store)│       ├── dashboard.js

  5. Start Express server + Socket.io│       └── terminal.js

  6. Print startup info├── logs/                  # Application logs

└── package.json

User Connects:```

  1. Browser makes WebSocket connection

  2. Socket.io establishes connection## Security Considerations

  3. Session middleware validates HTTP cookie

  4. Client emits 'metrics:subscribe'- **SSH Keys**: Consider using SSH key authentication for better security

  5. Server starts metrics polling interval- **Firewall**: Keep ufw/iptables properly configured

- **Environment**: Use strong session secrets in production

User Closes Terminal:- **HTTPS**: Enable SSL/TLS in production environments

  1. Browser disconnects Socket.io- **Updates**: Keep dependencies updated for security patches

  2. Server cleanup handler triggered

  3. Terminal session closed + SSH connection ended## Systemd Service (Optional)

  4. Metrics polling stopped

  5. Interval clearedFor production deployment, set up PanelOS as a systemd service:



Server Shutdown:```bash

  1. SIGTERM/SIGINT received# Run setup with systemd support

  2. Stop accepting new connectionssudo ./setup.sh --systemd

  3. Cleanup services (terminate PTYs, etc.)

  4. Close server# Or manually enable the service

  5. Exit gracefullysudo systemctl enable panelos

```sudo systemctl start panelos

sudo systemctl status panelos

### Error Handling Philosophy```

- **User Errors** (bad input): Return 4xx with clear message

- **Service Errors** (SSH timeout): Return 5xx with generic message, log details## Troubleshooting

- **Partial Failures** (one metric fails): Continue with others, return fallbacks

- **Session Errors**: Redirect to login### Firewall Permission Errors

- **Rate Limit**: Return 429If you see firewall-related errors, run the setup script:

```bash

---sudo ./setup.sh

```

## For System Administrators

### Port Already in Use

### Recommended Production SetupIf port 3000 is busy, change the PORT in your `.env` file.



```bash### SSH Connection Issues

# 1. Create dedicated userEnsure SSH service is running and accessible:

sudo useradd -m -s /bin/bash panelos```bash

sudo systemctl status ssh

# 2. Clone and setup```

sudo -u panelos git clone https://github.com/AdityaMandage/PanelOS.git

cd /home/panelos/PanelOS## Recent Improvements (v1.1.0)

sudo ./setup.sh

### Security & Robustness Enhancements

# 3. Setup reverse proxy (nginx)- ✅ **Enhanced Logging**: Winston-based logging with daily rotation and 3-day retention

# - SSL termination  - Console: ERROR level only (clean output during operation)

# - Hostname binding  - Files: All logs automatically rotated daily

# - Rate limiting  - Prevents unlimited disk usage growth

- ✅ **Credential Security**: Credentials no longer stored in sessions

# 4. Enable firewall (system level)  - Passwords are validated once at login

sudo ufw enable  - Terminal sessions require fresh credentials

sudo ufw allow 22/tcp  - Reduces attack surface significantly

sudo ufw allow 443/tcp  # For nginx- ✅ **Input Validation**: Enhanced validation on firewall rules and terminal dimensions

  - Port range validation (1-65535)

# 5. Monitor  - Terminal size bounds checking (5x10 to 500x500)

pm2 monit  - IP/CIDR notation validation for firewall rules

tail -f logs/app-*.log- ✅ **Session Timeout**: Terminal sessions now timeout after 30 minutes of inactivity

```  - Automatic cleanup of idle sessions

  - Prevents resource leaks

### Scaling Beyond Single System- ✅ **Error Handling**: Comprehensive error handling across all services

  - Better error messages for users

For monitoring multiple systems, consider:  - Improved error logging for debugging

- Deploy PanelOS on each system separately  - Graceful degradation when features unavailable

- Use centralized logging (ELK, Loki)

- Or use Prometheus + Grafana for distributed monitoring### Code Quality Improvements

- ✅ **Service Robustness**: All services improved with better error recovery

PanelOS is intentionally single-system focused for simplicity and security.  - Metrics continue if one metric type fails

  - Terminal service handles edge cases

---  - Firewall service validates all inputs

- ✅ **Frontend Error UI**: User-friendly error notifications

**Last Updated:** November 4, 2025  - Non-blocking error/success messages

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