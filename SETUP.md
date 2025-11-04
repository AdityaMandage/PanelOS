# PanelOS Production Setup Guide

This guide explains how to take a fresh Linux host from a clean clone of this repository to a running PanelOS dashboard in your browser with **zero manual tinkering**. The process is driven by a single provisioning script that installs every dependency, configures the environment, and launches the service under PM2.

---

## 1. Supported Platforms & Requirements

PanelOS has been validated on the following Linux families:

- **Debian / Ubuntu** and derivatives (APT based)
- **RHEL / Rocky / AlmaLinux / CentOS Stream** (DNF or YUM)
- **Fedora** (DNF)
- **Arch / Manjaro** (Pacman)
- **openSUSE** (Zypper)

Other distributions will work if they provide a compatible package manager and systemd. If yours is not listed, follow the "Manual Fallback" section.

Baseline requirements:

- sudo/root access during setup (firewall + package installs)
- Internet connectivity (package downloads, NodeSource repository)
- Systemd available for PM2 auto-start (most modern Linux distributions)

---

## 2. Quick Start (One-Time Provisioning)

```bash
# 1. Clone the repository
git clone https://github.com/AdityaMandage/PanelOS.git
cd PanelOS

# 2. Make the provisioning script executable
chmod +x setup.sh

# 3. Run full provisioning (installs everything and starts the service)
sudo ./setup.sh
```

**Note:** The setup script is designed to be resilient to system issues:
- It will attempt to fix broken packages automatically
- If a package fails to install, it tries alternative methods and continues
- It handles network issues gracefully and retries critical steps
- If something fails, you can safely re-run the script multiple times

What the script does:

1. Detects your distribution and package manager
2. Installs required system packages (curl, openssl, git, ufw/firewalld, etc.)
3. Installs or upgrades Node.js to the latest NodeSource 20.x release (or native package on Pacman/Zypper)
4. Installs npm (bundled with Node.js) and PM2 **globally**
5. Creates/refreshes `.env.example` and `.env` with a secure `SESSION_SECRET`
6. Installs project dependencies (`npm install --omit=dev`)
7. Grants passwordless sudo access to firewall tools (ufw/iptables) for the invoking user
8. Starts the application with PM2 in production mode and saves the process list
9. Registers PM2 with systemd so PanelOS restarts automatically after reboot
10. Verifies that the dashboard is responding on `http://localhost:3000`

After the script finishes, open a browser to:

```
http://SERVER_IP:3000
```

Log in with the credentials of a valid system user (PanelOS uses SSH authentication by default).

---

## 3. Manual Fallback (Non-Standard Environments)

If you run on an unsupported distribution or need an air-gapped install, follow these steps instead of the automated script:

1. **Install packages manually**
   - Node.js v16 or newer, npm, git, curl, openssl, ufw/iptables, sysstat, lm-sensors
   - PM2 globally: `npm install -g pm2`
2. **Create the application user** (or reuse an existing sudo-capable account)
3. **Clone the repository** to the target location and `cd` into it
4. **Create the environment file**: `cp .env.example .env` and customise values
   - Generate a session secret: `openssl rand -hex 64`
5. **Install dependencies**: `npm install --omit=dev`
6. **Start with PM2**: `pm2 start ecosystem.config.cjs --env production --update-env`
7. **Persist PM2**: `pm2 save` and `pm2 startup systemd -u <user> --hp /home/<user>`
8. **Verify**: `pm2 status`, `pm2 logs panelos`, and browse to the dashboard

---

## 4. Configuration Reference (`.env`)

| Variable | Description |
| --- | --- |
| `PORT` | HTTP port for the dashboard (default `3000`) |
| `HOST` | Bind address (default `0.0.0.0` to expose on LAN) |
| `SSH_HOST` / `SSH_PORT` | System SSH endpoint used for login validation |
| `SESSION_SECRET` | Random 64-byte hex string generated during setup |
| `SESSION_TIMEOUT` | Milliseconds before idle session expires (default 30 min) |
| `RATE_LIMIT_*` | Login rate limiting thresholds |
| `FIREWALL_ENABLED` | Toggle firewall management APIs |
| `LOG_LEVEL` | `info`, `debug`, etc. (console always shows errors only) |

After editing `.env`, run `pm2 restart panelos && pm2 save` for the change to take effect.

---

## 5. PM2 Operations Cheat Sheet

```
pm2 status           # Process list & health
pm2 logs panelos     # Tail application logs
pm2 restart panelos  # Reload service with new code or config
pm2 stop panelos     # Stop but keep definition
pm2 delete panelos   # Stop and remove from PM2
pm2 save             # Persist current process list (run after changes)
pm2 startup systemd  # Regenerate auto-start (if system paths changed)
```

Application logs also rotate daily under `logs/` with a 3-day retention policy.

---

## 6. Troubleshooting

### Node.js/PM2 installation fails
- Ensure outbound HTTPS traffic is allowed (NodeSource scripts require internet access)
- Re-run the script after resolving connectivity issues
- For offline environments, download the Node.js tarball and install manually, then rerun `setup.sh`

### Firewall permissions not granted
- Some distributions disable `/etc/sudoers.d` by default; ensure `#includedir /etc/sudoers.d` exists in `/etc/sudoers`
- Re-run `sudo visudo` if validation fails and import the generated snippets (`panelos-ufw`, `panelos-iptables`)

### Service does not respond on port 3000
- Check PM2 logs: `pm2 logs panelos`
- Confirm `.env` contains correct `SSH_HOST`/`SSH_PORT` and credentials are valid
- Ensure no other service is bound to port 3000

### Systemd unavailable
- PM2 auto-start cannot be configured without systemd; consider creating a crontab or supervisor entry manually and skip the `pm2 startup` step

---

## 7. Keeping PanelOS Up-To-Date

1. `cd` into the repository directory
2. `git pull` to fetch the latest release
3. `npm install --omit=dev` to pick up dependency updates
4. `pm2 restart panelos && pm2 save`

The provisioning script can be re-run at any time; it is idempotent and will simply ensure the system stays compliant with the required baseline.

---

## 8. Support Checklist

When opening an issue or asking for help, include:

- Distribution name & version (`cat /etc/os-release`)
- Output of `node --version`, `npm --version`, `pm2 --version`
- `pm2 logs panelos` (last 50 lines)
- `ls -lah logs/` to confirm log rotation
- Any modifications to `.env` or custom firewall configurations

With this information, we can triage most problems quickly and keep your PanelOS deployment healthy.
