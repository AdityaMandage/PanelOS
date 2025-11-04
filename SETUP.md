# PanelOS Setup & Deployment Guide

A complete reference for setting up PanelOS on any Linux system. This guide covers automated setup, manual fallback procedures, configuration, and troubleshooting.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start (Automated)](#quick-start-automated)
- [Manual Setup (Step-by-Step)](#manual-setup-step-by-step)
- [Configuration Reference](#configuration-reference)
- [Troubleshooting](#troubleshooting)
- [Post-Install Steps](#post-install-steps)

---

## Prerequisites

### System Requirements
- **OS**: Any Linux distribution (Debian, Ubuntu, Raspberry Pi OS, Fedora, Arch, openSUSE, etc.)
- **Node.js**: v16 or newer
- **Memory**: Minimum 512MB RAM (1GB recommended)
- **Disk**: 200MB free space
- **Network**: Internet connectivity for initial setup
- **Access**: `sudo` privileges for installation and firewall configuration

### Supported Package Managers
- APT (Debian, Ubuntu, Raspberry Pi OS)
- DNF (Fedora, RHEL, CentOS Stream, Rocky, AlmaLinux)
- YUM (older RHEL/CentOS)
- Pacman (Arch, Manjaro)
- Zypper (openSUSE)

---

## Quick Start (Automated)

The fastest way to get PanelOS running:

```bash
# 1. Clone the repository
git clone https://github.com/AdityaMandage/PanelOS.git
cd PanelOS

# 2. Make setup script executable
chmod +x setup.sh

# 3. Run automated setup (installs everything and starts the service)
sudo ./setup.sh
```

The script will:
- ✅ Detect your Linux distribution and package manager
- ✅ Install required system packages
- ✅ Install/upgrade Node.js to v20 LTS
- ✅ Install PM2 globally for process management
- ✅ Generate secure `.env` configuration
- ✅ Install project dependencies
- ✅ Configure passwordless sudo for firewall tools
- ✅ Start PanelOS under PM2
- ✅ Enable auto-start on system reboot
- ✅ Verify the dashboard is responding

After completion, access the dashboard at:
```
http://<YOUR_SERVER_IP>:3000
```

Log in with any valid system user credentials (SSH username/password).

**Note:** The setup script is idempotent—you can safely re-run it multiple times.

---

## Manual Setup (Step-by-Step)

If the automated script fails or you prefer manual control, follow these steps.

### Step 1: Clone Repository

```bash
cd ~
git clone https://github.com/AdityaMandage/PanelOS.git
cd PanelOS
```

### Step 2: Install System Packages

#### For Debian/Ubuntu/Raspberry Pi OS:

```bash
sudo apt-get update
sudo apt-get install -y \
  curl \
  wget \
  git \
  build-essential \
  openssl \
  python3 \
  lsof \
  net-tools \
  ufw
```

#### For Fedora/RHEL/CentOS:

```bash
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y \
  curl \
  wget \
  git \
  openssl \
  python3 \
  lsof \
  net-tools \
  firewalld
```

#### For Arch/Manjaro:

```bash
sudo pacman -Syu
sudo pacman -S --noconfirm \
  curl \
  wget \
  git \
  base-devel \
  openssl \
  python \
  net-tools
```

#### For openSUSE:

```bash
sudo zypper refresh
sudo zypper install -y \
  curl \
  wget \
  git \
  gcc \
  gcc-c++ \
  make \
  openssl \
  python3 \
  lsof \
  net-tools
```

### Step 3: Install Node.js

**Option A: Using NodeSource Repository (Debian/Ubuntu) - RECOMMENDED**

```bash
# For Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Option B: Using Distribution Packages**

```bash
# Debian/Ubuntu
sudo apt-get install -y nodejs npm

# Fedora/RHEL
sudo dnf install -y nodejs npm

# Arch
sudo pacman -S --noconfirm nodejs npm

# openSUSE
sudo zypper install -y nodejs npm
```

**Verify installation:**

```bash
node --version  # Should be v16 or higher
npm --version
```

### Step 4: Install PM2 Process Manager

```bash
sudo npm install -g pm2
pm2 --version
```

### Step 5: Configure Environment Variables

#### Create `.env` from template:

```bash
cp .env.example .env
```

#### Generate a secure session secret:

```bash
openssl rand -hex 64
```

Copy the output and update `.env`:

```bash
nano .env
```

Update these critical values:

```ini
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# SSH Configuration (for authentication)
SSH_HOST=localhost
SSH_PORT=22
SSH_TIMEOUT=10000

# Session & Security
SESSION_SECRET=<paste-the-64-byte-hex-string-here>
SESSION_TIMEOUT=1800000

# Rate Limiting (brute force protection)
RATE_LIMIT_LOGIN=5
RATE_LIMIT_WINDOW=60000

# Features
FIREWALL_ENABLED=true

# Logging
LOG_LEVEL=info
```

Save and exit (Ctrl+X, Y, Enter in nano).

### Step 6: Install Project Dependencies

```bash
cd ~/PanelOS
npm install --omit=dev
```

Expected output:
```
added XXX packages in Xs
audited YYY packages in Zs
found 0 vulnerabilities
```

### Step 7: Configure Firewall Permissions

**This step is required for firewall management to work.**

#### For ufw (Ubuntu/Debian):

```bash
which ufw  # Find full path (usually /usr/sbin/ufw)
sudo bash -c 'echo "$(whoami) ALL=(ALL) NOPASSWD: /usr/sbin/ufw" > /etc/sudoers.d/panelos-ufw'
sudo chmod 440 /etc/sudoers.d/panelos-ufw

# Verify
sudo -n ufw status
```

#### For iptables:

```bash
which iptables  # Find full path
sudo bash -c 'echo "$(whoami) ALL=(ALL) NOPASSWD: /usr/sbin/iptables" > /etc/sudoers.d/panelos-iptables'
sudo chmod 440 /etc/sudoers.d/panelos-iptables

# Verify
sudo -n iptables -L > /dev/null 2>&1 && echo "iptables access configured"
```

### Step 8: Start PanelOS with PM2

```bash
cd ~/PanelOS
pm2 start ecosystem.config.cjs --env development
```

Expected output:
```
[PM2] App [panelos] launched (1 instances)
┌────┬──────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name     │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼──────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ panelos  │ cluster  │ 0    │ online    │ 0%       │ XX.Xmb   │
└────┴──────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

### Step 9: Enable Auto-Start on Reboot

```bash
pm2 save
pm2 startup systemd -u $(whoami) --hp $(eval echo ~$(whoami))
sudo systemctl daemon-reload
```

### Step 10: Verify Installation

```bash
# Check PM2 status
pm2 status

# Check application logs
pm2 logs panelos

# Test HTTP endpoint
curl http://localhost:3000

# Access the dashboard
# Open browser: http://localhost:3000
```

---

## Configuration Reference

### Environment Variables (`.env`)

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `PORT` | HTTP server port | 3000 | Change if port is in use |
| `HOST` | Bind address | 0.0.0.0 | 0.0.0.0 exposes to LAN |
| `NODE_ENV` | Environment | development | Set to `production` for deployment |
| `SSH_HOST` | SSH server hostname | localhost | Target system for authentication |
| `SSH_PORT` | SSH server port | 22 | Standard SSH port |
| `SSH_TIMEOUT` | SSH connection timeout (ms) | 10000 | Increase for slow networks |
| `SESSION_SECRET` | Session encryption key | (required) | Generate with `openssl rand -hex 64` |
| `SESSION_TIMEOUT` | Session idle timeout (ms) | 1800000 | 30 minutes default |
| `RATE_LIMIT_LOGIN` | Max login attempts | 5 | Per IP per window |
| `RATE_LIMIT_WINDOW` | Rate limit window (ms) | 60000 | 1 minute default |
| `FIREWALL_ENABLED` | Enable firewall management | true | Set to `false` to disable |
| `LOG_LEVEL` | Logging level | info | `debug`, `info`, `error` |

### PM2 Commands

```bash
# View status
pm2 status

# View live logs
pm2 logs panelos

# View detailed info
pm2 info panelos

# Restart application
pm2 restart panelos

# Stop application
pm2 stop panelos

# Start application
pm2 start panelos

# View real-time monitoring
pm2 monit

# Delete from PM2
pm2 delete panelos

# View all processes
pm2 list
```

---

## Troubleshooting

### Port 3000 Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**

```bash
# Find what's using the port
lsof -i :3000

# Option 1: Kill the existing process
kill -9 <PID>

# Option 2: Change port in .env
nano .env
# Change: PORT=3000 to PORT=3001

# Restart PM2
pm2 restart panelos
```

### SSH Authentication Failing

**Error:** `SSH auth timeout` or `Authentication failed`

**Solution:**

```bash
# Verify SSH service is running
sudo systemctl status ssh

# Test SSH connection manually
ssh username@localhost

# Check if SSH is listening
sudo ss -tlnp | grep :22

# Start SSH if not running
sudo systemctl start ssh
```

### Firewall Permission Denied

**Error:** `sudo access required` or firewall operations fail

**Solution:**

```bash
# Re-run setup script (handles permissions)
sudo ./setup.sh

# Or manually configure sudo access
# For ufw:
sudo bash -c 'echo "$(whoami) ALL=(ALL) NOPASSWD: /usr/sbin/ufw" > /etc/sudoers.d/panelos-ufw'
sudo chmod 440 /etc/sudoers.d/panelos-ufw

# Verify
sudo -n ufw status
```

### Node.js Not Found

**Error:** `Command not found: node` or `npm`

**Solution:**

```bash
# Check if Node.js is installed
node --version

# If not, install it
# For Debian/Ubuntu:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

### Application Not Starting / Crashing

**Error:** Application starts but immediately crashes

**Solution:**

```bash
# Check logs in detail
pm2 logs panelos --err

# View recent logs
tail -50 logs/error-*.log
tail -50 logs/app-*.log

# Check if .env file exists
cat .env

# Check Node.js version compatibility
node --version  # Must be v16+

# Try restarting
pm2 restart panelos

# Delete and restart fresh
pm2 delete panelos
pm2 start ecosystem.config.cjs --env development
```

### High CPU/Memory Usage

**Symptoms:** Dashboard is slow or system becomes sluggish

**Solution:**

```bash
# Check real-time resource usage
pm2 monit

# Check what's consuming resources
ps aux | grep node

# Restart to clear memory
pm2 restart panelos

# Check for metrics collection issues in logs
grep -i "metrics" logs/error-*.log

# Reduce metrics polling interval in dashboard.js if needed
```

### Cannot Access Dashboard from Network

**Error:** `Connection refused` when accessing from another machine

**Solution:**

```bash
# Verify server is listening on all interfaces
sudo ss -tlnp | grep 3000

# Check HOST variable in .env
cat .env | grep HOST

# Should be: HOST=0.0.0.0

# If not, update it
nano .env

# Restart
pm2 restart panelos

# Verify from local machine
curl -I http://localhost:3000

# Test from another machine
curl -I http://<SERVER_IP>:3000
```

### DPkg/APT Errors During Setup

**Error:** `unknown system user 'netdata' in statoverride file` or similar dpkg issues

**Solution:**

```bash
# Kill any stuck apt/dpkg processes
sudo killall apt apt-get dpkg 2>/dev/null || true
sleep 2

# Remove problematic statoverrides
sudo dpkg-statoverride --remove /var/lib/netdata 2>/dev/null || true
sudo dpkg-statoverride --remove /var/cache/netdata 2>/dev/null || true

# Clean dpkg state
sudo rm -f /var/lib/dpkg/lock* 2>/dev/null
sudo dpkg --configure -a

# Retry setup
sudo ./setup.sh
```

### Logs Directory Issues

**Issue:** Can't find or access logs

**Solution:**

```bash
# Check if logs directory exists
ls -la logs/

# If not, create it
mkdir -p logs

# Check log files
cat logs/app-*.log
cat logs/error-*.log

# View recent logs
tail -20 logs/app-*.log

# Search for errors
grep ERROR logs/error-*.log
```

### Terminal Session Not Working

**Error:** Terminal tab shows blank or doesn't connect

**Solution:**

```bash
# Verify SSH is accessible
ssh username@localhost

# Check terminal service logs
grep -i terminal logs/app-*.log
grep -i terminal logs/error-*.log

# Check if PTY is available
which script  # Should exist

# Verify user has shell access
grep username /etc/passwd

# Restart application
pm2 restart panelos
```

### Session Timeout Too Short/Long

**Issue:** Getting logged out too quickly or session lasts too long

**Solution:**

```bash
# Check current timeout setting
grep SESSION_TIMEOUT .env

# Update timeout (in milliseconds)
# 1800000 = 30 minutes (default)
# 3600000 = 1 hour
# 600000 = 10 minutes

nano .env
# Change: SESSION_TIMEOUT=1800000

# Restart
pm2 restart panelos
```

### Getting Rate Limited on Login

**Error:** `Too many login attempts. Please try again later.`

**Solution:**

```bash
# This is working as designed (brute force protection)
# Wait 1 minute (default window) for the rate limit to reset

# Or adjust rate limiting in .env
nano .env
RATE_LIMIT_LOGIN=10        # Increase max attempts
RATE_LIMIT_WINDOW=120000   # Increase window to 2 minutes

# Restart
pm2 restart panelos
```

---

## Post-Install Steps

### 1. Secure Your Installation

```bash
# Change system password
passwd

# Generate and update SESSION_SECRET
openssl rand -hex 64
# Update .env with new secret
nano .env

# Restart to apply changes
pm2 restart panelos
```

### 2. Enable HTTPS (Production)

For production deployments, use a reverse proxy like nginx with SSL:

```bash
# Install nginx
sudo apt-get install -y nginx

# Enable reverse proxy (point to PanelOS on 3000)
# Configure /etc/nginx/sites-available/default

# Enable SSL
sudo certbot certonly --standalone -d yourdomain.com

# Restart nginx
sudo systemctl restart nginx
```

### 3. Monitor Application

```bash
# Set up continuous monitoring
pm2 monit

# Configure PM2+ for cloud monitoring (optional)
pm2 install pm2-logrotate

# View PM2 dashboard
pm2 web  # Access at http://localhost:9615
```

### 4. Backup Configuration

```bash
# Backup .env file
cp .env .env.backup

# Backup PM2 process list
pm2 save

# Backup application logs (if needed)
tar -czf panelos-logs-backup.tar.gz logs/
```

### 5. Schedule Log Cleanup (Optional)

By default, logs are auto-rotated with 3-day retention. No action needed.

To manually clean old logs:

```bash
# Remove logs older than 7 days
find logs/ -name "*.log" -mtime +7 -delete
```

### 6. Update Application

```bash
# Pull latest code
cd ~/PanelOS
git pull origin main

# Install any new dependencies
npm install --omit=dev

# Restart
pm2 restart panelos
```

### 7. Firewall Setup (If Using System Firewall)

```bash
# Enable firewall (optional, for system security)
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow PanelOS
sudo ufw allow 3000/tcp

# Check status
sudo ufw status
```

---

## Common Workflows

### Restarting the Application

```bash
# Quick restart
pm2 restart panelos

# Hard restart (stop + start)
pm2 stop panelos && pm2 start ecosystem.config.cjs

# Graceful restart with env reload
pm2 restart panelos --update-env
```

### Stopping PanelOS

```bash
# Stop (doesn't auto-restart)
pm2 stop panelos

# Stop completely and remove from PM2
pm2 delete panelos

# Stop PM2 daemon entirely
pm2 kill
```

### Starting PanelOS Again

```bash
# If only stopped
pm2 start panelos

# If deleted from PM2
pm2 start ecosystem.config.cjs --env development

# Restart on boot (if disabled)
pm2 save
pm2 startup
```

### Viewing Logs

```bash
# Real-time logs
pm2 logs panelos

# Last 50 lines
pm2 logs panelos | tail -50

# Error logs only
pm2 logs panelos --err

# Search logs
grep "ERROR" logs/*.log
grep "username" logs/*.log
```

### Changing Port

```bash
# Edit .env
nano .env
# Change: PORT=3000 to PORT=8080

# Restart
pm2 restart panelos

# Verify
curl http://localhost:8080
```

---

## Support & Next Steps

1. **Documentation**: Read [README.md](README.md) for features and architecture
2. **Issues**: Check logs with `pm2 logs panelos`
3. **Development**: See [README.md](README.md) for development setup
4. **Contributions**: See [README.md](README.md) for contribution guidelines

For additional help, refer to the application logs and ensure all prerequisites are met.
