#!/bin/bash

# PanelOS Automated Provisioning Script
# This script provisions a Linux host with everything required to run PanelOS.
# Usage: sudo ./setup.sh

set -euo pipefail
IFS=$'\n\t'

MIN_NODE_MAJOR=16
NODE_INSTALL_MAJOR=20

# Color helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

ensure_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run with sudo/root privileges."
        log_info "Usage: sudo ./setup.sh"
        exit 1
    fi
}

get_target_user() {
    if [[ -n "${SUDO_USER:-}" ]]; then
        echo "$SUDO_USER"
    else
        log_error "Could not determine invoking user (SUDO_USER not set)."
        exit 1
    fi
}

PKG_MANAGER=""
PKG_UPDATE_CMD=""
PKG_INSTALL_CMD=""

detect_package_manager() {
    if command -v apt-get &>/dev/null; then
        PKG_MANAGER="apt"
        PKG_UPDATE_CMD="apt-get update"
        PKG_INSTALL_CMD="apt-get install -y"
    elif command -v dnf &>/dev/null; then
        PKG_MANAGER="dnf"
        PKG_UPDATE_CMD="dnf -y update"
        PKG_INSTALL_CMD="dnf -y install"
    elif command -v yum &>/dev/null; then
        PKG_MANAGER="yum"
        PKG_UPDATE_CMD="yum -y update"
        PKG_INSTALL_CMD="yum -y install"
    elif command -v pacman &>/dev/null; then
        PKG_MANAGER="pacman"
        PKG_UPDATE_CMD="pacman -Sy --noconfirm"
        PKG_INSTALL_CMD="pacman -S --noconfirm"
    elif command -v zypper &>/dev/null; then
        PKG_MANAGER="zypper"
        PKG_UPDATE_CMD="zypper refresh"
        PKG_INSTALL_CMD="zypper install -y"
    else
        PKG_MANAGER="unknown"
    fi

    if [[ "$PKG_MANAGER" == "unknown" ]]; then
        log_error "Unsupported package manager. Install prerequisites manually and rerun."
        exit 1
    else
        log_info "Detected package manager: $PKG_MANAGER"
    fi
}

update_packages() {
    log_info "Updating package index..."
    eval "$PKG_UPDATE_CMD" >/dev/null
}

install_packages() {
    local packages=()
    while [[ $# -gt 0 ]]; do
        packages+=("$1")
        shift
    done

    [[ ${#packages[@]} -eq 0 ]] && return

    log_info "Installing packages: ${packages[*]}"
    case "$PKG_MANAGER" in
        apt)
            apt-get install -y "${packages[@]}" >/dev/null
            ;;
        pacman)
            pacman -S --noconfirm "${packages[@]}"
            ;;
        *)
            eval "$PKG_INSTALL_CMD \"${packages[@]}\"" >/dev/null
            ;;
    esac
}

check_os_release() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        log_info "Detected OS: ${PRETTY_NAME}"
    else
        log_warning "Unable to detect OS version."
    fi
}

ensure_system_prereqs() {
    update_packages

    case "$PKG_MANAGER" in
        apt)
            install_packages curl wget ca-certificates gnupg build-essential openssl git lsof net-tools
            install_packages ufw || true
            install_packages sysstat lm-sensors || true
            ;;
        dnf|yum)
            install_packages curl wget ca-certificates gnupg2 openssl git lsof net-tools
            install_packages firewalld iptables-services || true
            install_packages sysstat lm_sensors || true
            ;;
        pacman)
            install_packages curl wget ca-certificates gnupg openssl git lsof net-tools
            install_packages ufw || true
            install_packages sysstat lm_sensors || true
            ;;
        zypper)
            install_packages curl wget ca-certificates gpg2 openssl git lsof net-tools
            install_packages firewalld || true
            install_packages sysstat sensors || true
            ;;
        *)
            ;;
    esac

    if ! command -v ssh &>/dev/null; then
        log_warning "SSH client not found. Installing openssh-clients..."
        case "$PKG_MANAGER" in
            apt) install_packages openssh-client ;;
            dnf|yum|zypper) install_packages openssh-clients ;;
            pacman) install_packages openssh ;;
        esac
    fi
}

parse_node_major() {
    local version="$1"
    version=${version#v}
    echo "${version%%.*}"
}

install_node() {
    log_info "Installing Node.js ${NODE_INSTALL_MAJOR}.x ..."
    case "$PKG_MANAGER" in
        apt)
            curl -fsSL "https://deb.nodesource.com/setup_${NODE_INSTALL_MAJOR}.x" | bash - >/dev/null
            install_packages nodejs
            ;;
        dnf|yum)
            curl -fsSL "https://rpm.nodesource.com/setup_${NODE_INSTALL_MAJOR}.x" | bash - >/dev/null
            install_packages nodejs
            ;;
        pacman)
            install_packages nodejs npm
            ;;
        zypper)
            install_packages nodejs${NODE_INSTALL_MAJOR} npm${NODE_INSTALL_MAJOR} || install_packages nodejs npm
            ;;
        *)
            log_error "Automatic Node.js installation not supported on this platform."
            exit 1
            ;;
    esac
}

ensure_node() {
    if command -v node &>/dev/null; then
        local version
        version=$(node --version)
        local major
        major=$(parse_node_major "$version")
        if (( major < MIN_NODE_MAJOR )); then
            log_warning "Node.js version $version is too old. Upgrading."
            install_node
        else
            log_success "Node.js detected: $version"
        fi
    else
        install_node
        log_success "Node.js installed: $(node --version)"
    fi

    if ! command -v npm &>/dev/null; then
        log_error "npm was not found after Node.js installation."
        exit 1
    else
        log_success "npm detected: $(npm --version)"
    fi
}

ensure_pm2() {
    if command -v pm2 &>/dev/null; then
        log_success "PM2 detected: $(pm2 --version)"
    else
        log_info "Installing PM2 globally..."
        npm install -g pm2 >/dev/null
        hash -r
        if command -v pm2 &>/dev/null; then
            log_success "PM2 installed: $(pm2 --version)"
        else
            log_error "Failed to install PM2."
            exit 1
        fi
    fi
}

run_as_user() {
    local user="$1"
    local command="$2"
    sudo -u "$user" bash -c "$command"
}

setup_firewall_permissions() {
    local user="$1"
    local created=false

    if command -v ufw &>/dev/null; then
        local ufw_path
        ufw_path=$(command -v ufw)
        cat > /etc/sudoers.d/panelos-ufw <<EOF
$user ALL=(ALL) NOPASSWD: $ufw_path
EOF
        chmod 0440 /etc/sudoers.d/panelos-ufw
        log_success "Granted passwordless sudo for ufw"
        created=true
    fi

    if command -v iptables &>/dev/null; then
        local iptables_path
        iptables_path=$(command -v iptables)
        cat > /etc/sudoers.d/panelos-iptables <<EOF
$user ALL=(ALL) NOPASSWD: $iptables_path
EOF
        chmod 0440 /etc/sudoers.d/panelos-iptables
        log_success "Granted passwordless sudo for iptables"
        created=true
    fi

    if [[ "$created" == false ]]; then
        log_warning "No supported firewall command detected; skipping sudoers configuration."
    fi
}

generate_session_secret() {
    if command -v openssl &>/dev/null; then
        openssl rand -hex 64
    else
        python3 - <<'PY'
import secrets
print(secrets.token_hex(64))
PY
    fi
}

ensure_env_files() {
    local dir="$1"

    if [[ ! -f "$dir/.env.example" ]]; then
        log_info "Creating .env.example template..."
        cat > "$dir/.env.example" <<'EOF'
# PanelOS Environment Configuration

# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# SSH (used for authentication/terminal)
SSH_HOST=localhost
SSH_PORT=22
SSH_TIMEOUT=10000

# Session
SESSION_SECRET=REPLACE_ME
SESSION_TIMEOUT=1800000

# Rate limiting
RATE_LIMIT_LOGIN=5
RATE_LIMIT_WINDOW=60000

# Firewall
FIREWALL_ENABLED=true

# Logging
LOG_LEVEL=info
EOF
        log_success "Created .env.example"
    fi

    if [[ ! -f "$dir/.env" ]]; then
        cp "$dir/.env.example" "$dir/.env"
        local secret
        secret=$(generate_session_secret)
        sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=${secret}/" "$dir/.env"
        log_success "Created .env with secure SESSION_SECRET (review after setup)."
    else
        log_info ".env already exists; leaving in place."
    fi
}

install_node_modules() {
    local user="$1"
    local dir="$2"
    log_info "Installing Node.js dependencies (omit dev)..."
    run_as_user "$user" "cd '$dir' && npm install --omit=dev"
    log_success "Dependencies installed."
}

start_with_pm2() {
    local user="$1"
    local dir="$2"

    log_info "Starting PanelOS with PM2 (production mode)..."
    run_as_user "$user" "cd '$dir' && pm2 start ecosystem.config.cjs --env production --update-env"
    run_as_user "$user" "pm2 save"

    if command -v systemctl &>/dev/null; then
        log_info "Configuring PM2 to launch on boot..."
        pm2 startup systemd -u "$user" --hp "$(eval echo ~$user)" >/dev/null
        run_as_user "$user" "pm2 save"
        log_success "PM2 startup hook configured."
    else
        log_warning "systemd not detected; skipping PM2 startup configuration."
    fi
}

verify_service() {
    if curl -fsS http://localhost:3000 >/dev/null 2>&1; then
        log_success "PanelOS is reachable at http://localhost:3000"
    else
        log_warning "PanelOS did not respond on port 3000 yet. Check pm2 logs panelos"
    fi
}

main() {
    echo "===================================================="
    echo "           PanelOS Automated Setup (Production)     "
    echo "===================================================="

    ensure_root
    detect_package_manager
    check_os_release

    local target_user
    target_user=$(get_target_user)
    local script_dir
    script_dir=$(dirname "$(readlink -f "$0")")

    log_info "Provisioning PanelOS in $script_dir for user $target_user"

    ensure_system_prereqs
    ensure_node
    ensure_pm2
    setup_firewall_permissions "$target_user"
    ensure_env_files "$script_dir"
    install_node_modules "$target_user" "$script_dir"
    start_with_pm2 "$target_user" "$script_dir"
    verify_service

    echo
    log_success "PanelOS setup complete!"
    echo
    log_info "Useful PM2 commands:"
    echo "  pm2 status"
    echo "  pm2 logs panelos"
    echo "  pm2 restart panelos"
    echo "  pm2 stop panelos"
    echo
    log_info "Configuration file: $script_dir/.env"
    log_info "Dashboard URL   : http://$(hostname -I | awk '{print $1}'):${PORT:-3000}"
    echo
    log_info "If you update environment variables, run:"
    echo "  pm2 restart panelos && pm2 save"
}

main "$@"