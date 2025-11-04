# PanelOS Quick Start - Manual Setup Steps

Complete step-by-step guide to get PanelOS running on any Linux system, with explicit commands and expected outputs.

---

## Prerequisites Check

Before starting, ensure you have:
- A Linux system (Debian, Ubuntu, Raspberry Pi OS, Fedora, Arch, etc.)
- Internet connectivity
- `sudo` access (for some steps)
- ~2GB free disk space
- ~15 minutes

### If You See dpkg Errors

If you encounter dpkg errors like `unknown system user 'netdata'`, run this first:

```bash
# Fix broken dpkg state
sudo dpkg --configure -a
sudo apt-get --fix-broken install -y
sudo apt-get install -f -y

# Remove problematic statoverrides
sudo dpkg --get-selections | grep deinstall | awk '{print $1}' | xargs -r sudo apt-get purge -y
sudo dpkg --list | grep "^rc" | awk '{print $2}' | xargs -r sudo apt-get purge -y

# If netdata user issue persists, remove it:
sudo dpkg-statoverride --remove /var/lib/netdata || true
sudo dpkg-statoverride --remove /var/cache/netdata || true

# Then retry
sudo apt-get update
sudo apt-get autoremove -y
```

---

## Step 1: Clone the Repository

```bash
cd ~
git clone https://github.com/AdityaMandage/PanelOS.git
cd PanelOS
```

**Expected output:**
```
Cloning into 'PanelOS'...
remote: Enumerating objects: X, done.
...
```

---

## Step 2: Install System Packages (Choose Your Distribution)

### For Debian/Ubuntu/Raspberry Pi OS:

```bash
# First, ensure dpkg is in good state
sudo dpkg --configure -a || true
sudo apt-get update || true

# Try to install packages one by one (better error isolation)
sudo apt-get install -y curl || true
sudo apt-get install -y wget || true
sudo apt-get install -y git || true
sudo apt-get install -y build-essential || true
sudo apt-get install -y openssl || true
sudo apt-get install -y python3 || true
sudo apt-get install -y lsof || true
sudo apt-get install -y net-tools || true

# Optional: firewall (not required for PanelOS to run)
sudo apt-get install -y ufw || true
```

**Expected output:**
```
Reading package lists... Done
Building dependency tree... Done
0 upgraded, X newly installed, 0 to remove and 0 not upgraded.
```

**If you get dpkg errors during any package install:**

```bash
# Stop and fix the system first
sudo dpkg --configure -a
sudo apt-get --fix-broken install -y
sudo apt-get install -f -y

# Clean up old/broken packages
sudo apt-get autoremove -y
sudo apt-get autoclean -y

# Retry the package installation above
```

### Minimum Required Packages (if above fails)

The absolutely minimum packages needed:
```bash
sudo apt-get install -y curl git openssl
```

The rest are optional and PanelOS will work without them (though some features may be limited).


### For Fedora/RHEL/CentOS:

```bash
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y curl wget git openssl python3 lsof net-tools
```

### For Arch/Manjaro:

```bash
sudo pacman -Syu
sudo pacman -S --noconfirm curl wget git base-devel openssl python net-tools
```

### For openSUSE:

```bash
sudo zypper refresh
sudo zypper install -y curl wget git gcc gcc-c++ make openssl python3 lsof net-tools
```

---

## Step 3: Install Node.js and npm

### Option A: Using NodeSource Repository (Debian/Ubuntu) - RECOMMENDED

```bash
# For Node.js 20.x LTS (recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

**Expected output:**
```
v20.11.0  (or similar)
10.5.2    (or similar)
```

### Option B: Using Distro Packages (Fallback)

**Debian/Ubuntu:**
```bash
sudo apt-get install -y nodejs npm
```

**Fedora/RHEL:**
```bash
sudo dnf install -y nodejs npm
```

**Arch:**
```bash
sudo pacman -S --noconfirm nodejs npm
```

**openSUSE:**
```bash
sudo zypper install -y nodejs npm
```

### Verify Node.js works:

```bash
node -e "console.log('Node.js is working!')"
```

**Expected output:**
```
Node.js is working!
```

---

## Step 4: Install PM2 Globally

```bash
sudo npm install -g pm2
pm2 --version
```

**Expected output:**
```
5.4.3  (or similar version)
```

---

## Step 5: Configure Environment Variables

### Create `.env` from template:

```bash
sudo cp .env.example .env
```

### Generate secure session secret:

```bash
openssl rand -hex 64
```

**Expected output:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f
```

### Edit the `.env` file:

```bash
sudo nano .env
```

Or use your preferred editor. Update these values:

```ini
# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# SSH Configuration (for authentication)
SSH_HOST=localhost
SSH_PORT=22
SSH_TIMEOUT=10000

# Session
SESSION_SECRET=<paste-the-hex-string-from-above>
SESSION_TIMEOUT=1800000

# Rate limiting
RATE_LIMIT_LOGIN=5
RATE_LIMIT_WINDOW=60000

# Firewall
FIREWALL_ENABLED=true

# Logging
LOG_LEVEL=info
```

**Save and exit** (Ctrl+X, Y, Enter in nano)

---

## Step 6: Install Project Dependencies

```bash
cd ~/PanelOS
npm install --omit=dev
```

**Expected output:**
```
added X packages in Xs

up to date, audited Y packages in Z seconds
found 0 vulnerabilities
```

**If it hangs or seems stuck:**
- Press `Ctrl+C` and wait 10 seconds
- Run again: `npm install --omit=dev`

---

## Step 7: Setup Firewall Permissions (If Using ufw/iptables)

### For ufw users:

```bash
# Find the full path to ufw
which ufw
# Output: /usr/sbin/ufw

# Grant passwordless sudo access
sudo bash -c 'echo "$(whoami) ALL=(ALL) NOPASSWD: /usr/sbin/ufw" >> /etc/sudoers.d/panelos'

# Verify
sudo -n ufw status
```

### For iptables users:

```bash
which iptables
# Output: /usr/sbin/iptables

sudo bash -c 'echo "$(whoami) ALL=(ALL) NOPASSWD: /usr/sbin/iptables" >> /etc/sudoers.d/panelos'

# Verify
sudo -n iptables -L >/dev/null 2>&1 && echo "iptables access OK"
```

---

## Step 8: Start the Application with PM2

```bash
cd ~/PanelOS
pm2 start ecosystem.config.cjs --env development
```

**Expected output:**
```
[PM2] App [panelos] launched (1 instances)
┌────┬──────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name     │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼──────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ panelos  │ cluster  │ 0    │ online    │ 0%       │ 65.2mb   │
└────┴──────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

### Save PM2 process list:

```bash
pm2 save
```

**Expected output:**
```
[PM2] Successfully saved in /home/username/.pm2/dump.pm2
```

---

## Step 9: Enable Auto-Start on System Reboot

```bash
pm2 startup systemd -u $(whoami) --hp $(eval echo ~$(whoami))
```

**Expected output:**
```
[PM2] Init systemd: /etc/systemd/system/pm2-username.service
[PM2] To revoke startup script, execute 'pm2 unstartup systemd -u username --hp /home/username'
```

Then confirm by running:

```bash
sudo systemctl daemon-reload
```

---

## Step 10: Verify Everything is Running

### Check PM2 status:

```bash
pm2 status
```

**Expected output:**
```
┌────┬──────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name     │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼──────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ panelos  │ cluster  │ 0    │ online    │ 0%       │ XX.Xmb   │
└────┴──────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

### Check if server is listening:

```bash
curl http://localhost:3000
```

**Expected output:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
...
```

### Check application logs:

```bash
pm2 logs panelos
```

**Expected output:**
```
[panelos]  Server running at http://0.0.0.0:3000
[panelos]  Environment: development
```

---

## Step 11: Access the Dashboard

Open your browser and navigate to:

```
http://YOUR_SERVER_IP:3000
```

Or if running locally:

```
http://localhost:3000
```

### Login:

1. Enter your **system username** (e.g., `ubuntu`, `pi`, `root`, etc.)
2. Enter your **system password**
3. Click **Login**

**Expected result:** Dashboard loads with system metrics

---

## Troubleshooting

### App not starting?

```bash
# Check logs
pm2 logs panelos

# Restart
pm2 restart panelos

# Delete and restart fresh
pm2 delete panelos
pm2 start ecosystem.config.cjs --env development
```

### Port 3000 already in use?

```bash
# Find what's using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Restart PM2 app
pm2 restart panelos
```

### Login not working?

```bash
# Verify SSH is running
sudo systemctl status ssh

# Test SSH login from terminal
ssh username@localhost

# Check application logs
pm2 logs panelos
```

### Node.js version issue?

```bash
# Check your Node.js version
node --version

# Should be v16.0.0 or higher
# If not, reinstall from Step 3
```

### Cannot find npm?

```bash
# Verify npm is in PATH
which npm

# If not found, add to PATH
export PATH="/usr/local/bin:$PATH"

# Then try again
npm --version
```

### dpkg Errors During Setup?

**Error:** `unknown system user 'netdata' in statoverride file`

This happens when a system user (netdata) was removed but dpkg still references it.

**Quick Fix:**

```bash
# Kill any stuck apt/dpkg processes
sudo killall apt apt-get dpkg 2>/dev/null || true
sleep 2

# List all statoverrides to see the problem
sudo dpkg-statoverride --list

# Remove the problematic netdata statoverride
sudo dpkg-statoverride --remove /var/lib/netdata 2>/dev/null || true
sudo dpkg-statoverride --remove /var/cache/netdata 2>/dev/null || true

# Remove ALL bad statoverrides at once
sudo dpkg-statoverride --list | awk '{print $NF}' | while read path; do
    sudo dpkg-statoverride --remove "$path" 2>/dev/null || true
done

# Clean dpkg lock files
sudo rm -f /var/lib/dpkg/lock* 2>/dev/null || true

# Reconfigure dpkg
sudo dpkg --configure -a

# Try your install again
sudo apt-get update
sudo apt-get install -y ufw
```

**Expected output after fix:**
```
Setting up ufw (0.36.x) ...
Processing triggers for man-db (2.x.x) ...
```

If you still get lock errors, wait a moment and try again:
```bash
sleep 5
sudo apt-get install -y ufw
```


---

## Common PM2 Commands

```bash
# View real-time logs
pm2 logs panelos

# View detailed info
pm2 info panelos

# Restart app
pm2 restart panelos

# Stop app
pm2 stop panelos

# Start app again
pm2 start panelos

# View all processes
pm2 status

# View CPU/Memory usage in real-time
pm2 monit

# Delete app from PM2
pm2 delete panelos

# Save current state
pm2 save

# Clear all processes
pm2 kill
```

---

## Next Steps After Setup

1. **Change Default Credentials:** Update your system password for better security
2. **Configure Firewall:** Adjust `FIREWALL_ENABLED` in `.env` based on your needs
3. **Set Custom Port:** Change `PORT` in `.env` if port 3000 conflicts with other services
4. **Enable HTTPS:** Use reverse proxy (nginx) for production HTTPS access
5. **Monitor Logs:** Check `logs/` directory for application diagnostics

---

## If Automated Script Fails

If you prefer to run the automated setup script:

```bash
cd ~/PanelOS
chmod +x setup.sh
sudo ./setup.sh
```

But if it has issues, fall back to the manual steps above. The manual steps are **guaranteed to work** on any Linux system.

---

## Support

If you encounter issues:

1. Check the logs: `pm2 logs panelos`
2. Verify Node.js: `node --version` (should be v16+)
3. Verify npm: `npm --version`
4. Verify PM2: `pm2 --version`
5. Check `.env` file values
6. Ensure port 3000 is not in use: `lsof -i :3000`

For more details, see [SETUP.md](SETUP.md) or create an issue on GitHub.
