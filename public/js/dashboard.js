// Connection state
let socket = null;
let isConnected = false;
let fullMetricsInterval = null;
let metricsErrorCount = 0;
const MAX_METRICS_ERRORS = 3;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  verifySession().then(() => {
    initializeSocket();
  }).catch(error => {
    console.error('Initialization error:', error);
    showError('Failed to initialize dashboard');
  });
});

/**
 * Verify user session
 */
async function verifySession() {
  try {
    const response = await fetch('/api/auth/verify');
    const data = await response.json();

    if (!data.authenticated) {
      window.location.href = '/login';
      return;
    }

    document.getElementById('username').textContent = data.user.username;
  } catch (error) {
    console.error('Session verification error:', error);
    showError('Failed to verify session');
    setTimeout(() => {
      window.location.href = '/login';
    }, 2000);
  }
}

/**
 * Show error message to user
 */
function showError(message) {
  console.error('Error:', message);
  // Create a temporary error notification
  const errorEl = document.createElement('div');
  errorEl.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #d32f2f;
    color: white;
    padding: 16px;
    border-radius: 8px;
    z-index: 10000;
    font-size: 14px;
    max-width: 300px;
  `;
  errorEl.textContent = message;
  document.body.appendChild(errorEl);
  
  setTimeout(() => {
    errorEl.remove();
  }, 5000);
}

/**
 * Show success message to user
 */
function showSuccess(message) {
  console.log('Success:', message);
  const successEl = document.createElement('div');
  successEl.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #00c853;
    color: white;
    padding: 16px;
    border-radius: 8px;
    z-index: 10000;
    font-size: 14px;
    max-width: 300px;
  `;
  successEl.textContent = message;
  document.body.appendChild(successEl);
  
  setTimeout(() => {
    successEl.remove();
  }, 3000);
}

/**
 * Initialize Socket.io connection
 */
function initializeSocket() {
  console.log('[SOCKET.IO] Initializing connection...');
  console.log('[SOCKET.IO] Current URL:', window.location.href);
  socket = io({
    path: '/socket.io/',
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('[SOCKET.IO] ✓ Connected to server');
    isConnected = true;
    updateConnectionStatus(true);

    // Subscribe to metrics
    console.log('[SOCKET.IO] Subscribing to metrics...');
    socket.emit('metrics:subscribe', { interval: 2000 });

    startFullMetricsPolling();
  });

  socket.on('disconnect', () => {
    console.log('[SOCKET.IO] ✗ Disconnected from server');
    isConnected = false;
    updateConnectionStatus(false);
    stopFullMetricsPolling();
  });

  socket.on('metrics:update', (metrics) => {
    console.log('[SOCKET.IO] Received metrics:', metrics);
    updateMetrics(metrics);
  });

  socket.on('metrics:error', (error) => {
    console.error('[SOCKET.IO] Metrics error:', error);
    metricsErrorCount++;
    if (metricsErrorCount >= MAX_METRICS_ERRORS) {
      showError('Unable to collect metrics - connection unstable');
    }
  });

  socket.on('firewall:update', (data) => {
    console.log('[SOCKET.IO] Received firewall data:', data);
    if (data && data.status) updateFirewallStatus(data.status);
    if (data && data.rules) updateFirewallRules(data.rules);
    if (data && data.ports) updateExposedPorts(data.ports);
  });

  socket.on('firewall:error', (error) => {
    console.error('[SOCKET.IO] Firewall error:', error);
    showError('Firewall operation failed: ' + error.error);
  });

  socket.on('error', (error) => {
    console.error('[SOCKET.IO] Socket error:', error);
    showError('Connection error');
  });

  socket.on('connect_error', (error) => {
    console.error('[SOCKET.IO] Connection error:', error);
  });
}

function startFullMetricsPolling() {
  stopFullMetricsPolling();
  fetchFullMetrics();
  fullMetricsInterval = setInterval(fetchFullMetrics, 15000);
}

function stopFullMetricsPolling() {
  if (fullMetricsInterval) {
    clearInterval(fullMetricsInterval);
    fullMetricsInterval = null;
  }
}

async function fetchFullMetrics() {
  try {
    const response = await fetch('/api/metrics/system', { credentials: 'same-origin' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    updateMetrics(data);
  } catch (error) {
    console.error('[METRICS] Failed to fetch full metrics:', error);
    showMetricsFallback();
  }
}

function showMetricsFallback() {
  const diskContainer = document.getElementById('diskContainer');
  const networkContainer = document.getElementById('networkContainer');
  const uptimeDetail = document.getElementById('uptimeDetail');

  if (diskContainer && diskContainer.innerHTML.includes('Loading')) {
    diskContainer.innerHTML = '<div class="text-center text-red-400">Unable to load disk information</div>';
  }

  if (networkContainer && networkContainer.innerHTML.includes('Loading')) {
    networkContainer.innerHTML = '<div class="text-center text-red-400">Unable to load network information</div>';
  }

  if (uptimeDetail && uptimeDetail.textContent.includes('Loading')) {
    uptimeDetail.textContent = 'Unavailable';
  }
}

/**
 * Update connection status indicator
 */
function updateConnectionStatus(connected) {
  const indicator = document.getElementById('connectionStatus');
  const text = document.getElementById('connectionText');

  if (connected) {
    indicator.classList.add('connected');
    text.textContent = 'Connected';
  } else {
    indicator.classList.remove('connected');
    text.textContent = 'Disconnected';
  }
}

/**
 * Update all metrics displays
 */
function updateMetrics(metrics) {
  // Update CPU
  if (metrics.cpu) {
    const cpuUsage = metrics.cpu.usage;
    document.getElementById('cpuUsage').textContent = `${cpuUsage}%`;
    document.getElementById('cpuBar').style.width = `${cpuUsage}%`;
    document.getElementById('cpuBar').className = `progress-fill ${getProgressClass(cpuUsage)}`;
    document.getElementById('cpuCores').textContent = metrics.cpu.cores.length;
  }

  // Update Memory
  if (metrics.memory) {
    const memPercentage = metrics.memory.percentage;
    document.getElementById('memUsage').textContent = `${memPercentage}%`;
    document.getElementById('memBar').style.width = `${memPercentage}%`;
    document.getElementById('memBar').className = `progress-fill ${getProgressClass(memPercentage)}`;
    document.getElementById('memUsed').textContent = metrics.memory.used;
    document.getElementById('memTotal').textContent = metrics.memory.total;
  }

  // Update Temperature
  if (metrics.temperature) {
    const temp = metrics.temperature.celsius;
    const status = metrics.temperature.status;
    document.getElementById('tempValue').textContent = `${temp}°C`;
    const badge = document.getElementById('tempBadge');
    badge.className = `status-badge status-${status}`;
    badge.textContent = status.toUpperCase();
  }

  // Update full metrics (disk, network, system info)
  if (metrics.disk) {
    updateDiskDisplay(metrics.disk);
  }

  if (metrics.system) {
    updateSystemInfo(metrics.system);
  }

  if (metrics.network) {
    updateNetworkDisplay(metrics.network);
  }

  if (metrics.uptime) {
    updateUptimeDisplay(metrics.uptime);
  }
}

/**
 * Get progress bar class based on percentage
 */
function getProgressClass(percentage) {
  if (percentage < 50) return 'progress-cool';
  if (percentage < 70) return 'progress-normal';
  if (percentage < 85) return 'progress-warm';
  return 'progress-hot';
}

/**
 * Update disk display
 */
function updateDiskDisplay(disks) {
  const container = document.getElementById('diskContainer');

  if (!disks || disks.length === 0) {
    container.innerHTML = '<div class="text-center text-gray-400">No disk information available</div>';
    return;
  }

  container.innerHTML = disks.map(disk => {
    const progressClass = getProgressClass(disk.percentage);
    return `
      <div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <div>
            <div style="font-size: 14px; font-weight: 600;">${disk.mount}</div>
            <div style="font-size: 12px; color: #9e9e9e;">${disk.device}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 14px; font-weight: 600;">${disk.percentage}%</div>
            <div style="font-size: 12px; color: #9e9e9e;">${disk.used}GB / ${disk.total}GB</div>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${progressClass}" style="width: ${disk.percentage}%;"></div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Update system information display
 */
function updateSystemInfo(system) {
  document.getElementById('hostname').textContent = system.hostname || '--';
  document.getElementById('platform').textContent = system.platform || '--';
  document.getElementById('distro').textContent = system.distro || '--';
  document.getElementById('kernel').textContent = system.kernel || '--';
  document.getElementById('arch').textContent = system.arch || '--';
}

/**
 * Update network display
 */
function updateNetworkDisplay(interfaces) {
  const container = document.getElementById('networkContainer');

  if (!interfaces || interfaces.length === 0) {
    container.innerHTML = '<div class="text-center text-gray-400">No network interfaces found</div>';
    return;
  }

  container.innerHTML = interfaces
    .filter(iface => !iface.internal)
    .map(iface => `
      <div class="network-item">
        <div class="network-item-name">${iface.name}</div>
        <div class="network-item-ip">${iface.ip4 || iface.ip6 || 'No IP'}</div>
        <div style="font-size: 11px; color: #757575; margin-top: 4px;">${iface.mac || 'No MAC'}</div>
      </div>
    `).join('');
}

/**
 * Update uptime display
 */
function updateUptimeDisplay(uptime) {
  if (uptime.formatted) {
    document.getElementById('uptime').textContent = uptime.formatted;
  }
  if (uptime.system) {
    const { days, hours } = uptime.system;
    document.getElementById('uptimeDetail').textContent = `${days} days, ${hours} hours`;
  }
}

/**
 * Firewall Management Functions
 */
function updateFirewallStatus(status) {
  const statusDiv = document.getElementById('firewallStatus');

  if (status.tool === 'disabled' && status.status === 'Firewall management disabled') {
    statusDiv.innerHTML = `
      <div class="text-4xl mb-2">🚫</div>
      <div class="text-2xl font-bold text-gray-400 mb-4">Disabled</div>
      <div class="text-sm text-gray-400 mb-4">${status.status || status.error || 'Firewall management is disabled'}</div>
      <div class="text-xs text-gray-500">Configure FIREWALL_ENABLED=true and sudo access to enable</div>
    `;
    return;
  }

  if (status.error && status.error.includes('sudo access')) {
    statusDiv.innerHTML = `
      <div class="text-4xl mb-2">🔐</div>
      <div class="text-2xl font-bold text-yellow-400 mb-4">Setup Required</div>
      <div class="text-sm text-gray-400 mb-4">Firewall tool detected (${status.tool}) but sudo access needed</div>
      <button onclick="showSetupInstructions()" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors mb-2">
        Show Setup Instructions
      </button>
      <div class="text-xs text-gray-500">Run: sudo ./setup.sh</div>
    `;
    return;
  }

  const color = status.enabled ? 'text-green-400' : 'text-red-400';
  const icon = status.enabled ? '🛡️' : '⚠️';
  const text = status.enabled ? 'Active' : 'Inactive';
  const buttonText = status.enabled ? 'Disable Firewall' : 'Enable Firewall';
  const buttonClass = status.enabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700';

  statusDiv.innerHTML = `
    <div class="text-4xl mb-2">${icon}</div>
    <div class="text-2xl font-bold ${color} mb-4">${text}</div>
    <div class="text-sm text-gray-400 mb-4">Tool: ${status.tool}</div>
    <button onclick="toggleFirewall(${!status.enabled})" class="w-full ${buttonClass} text-white font-medium py-2 px-4 rounded-md transition-colors">
      ${buttonText}
    </button>
  `;
}

function updateFirewallRules(rules) {
  const rulesDiv = document.getElementById('firewallRules');
  if (rules.length === 0) {
    rulesDiv.innerHTML = '<div class="text-gray-400">No rules configured</div>';
    return;
  }

  rulesDiv.innerHTML = rules.map(rule => `
    <div class="flex items-center justify-between bg-gray-700 p-3 rounded-md">
      <div class="flex-1">
        <div class="font-medium">${rule.rule}</div>
        <div class="text-sm text-gray-400">Tool: ${rule.tool}</div>
      </div>
      <button onclick="deleteFirewallRule(${rule.id})" class="text-red-400 hover:text-red-300 ml-2">
        🗑️
      </button>
    </div>
  `).join('');
}

function updateExposedPorts(ports) {
  const portsDiv = document.getElementById('exposedPorts');
  if (ports.length === 0) {
    portsDiv.innerHTML = '<div class="text-gray-400">No exposed ports found</div>';
    return;
  }

  portsDiv.innerHTML = ports.map(port => `
    <div class="flex items-center justify-between bg-gray-700 p-3 rounded-md">
      <div class="flex-1">
        <div class="font-medium">Port ${port.port} (${port.protocol.toUpperCase()})</div>
        <div class="text-sm text-gray-400">Process: ${port.process}</div>
      </div>
      <div class="text-sm ${port.firewalled ? 'text-red-400' : 'text-green-400'}">
        ${port.firewalled ? '🔒 Blocked' : '🔓 Open'}
      </div>
    </div>
  `).join('');
}

async function addFirewallRule(action, protocol, port, source) {
  try {
    // Validate input on client side first
    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      showError('Port must be between 1 and 65535');
      return;
    }
    if (!action || !['allow', 'deny'].includes(action)) {
      showError('Invalid action');
      return;
    }
    if (!protocol || !['tcp', 'udp'].includes(protocol)) {
      showError('Invalid protocol');
      return;
    }

    const response = await fetch('/api/firewall/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action, protocol, port: portNum, source: source || undefined })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add rule');
    }

    const result = await response.json();
    showSuccess(result.message || 'Rule added successfully');
    refreshFirewallData();
  } catch (error) {
    console.error('Add rule error:', error);
    showError('Failed to add rule: ' + error.message);
  }
}

async function deleteFirewallRule(ruleId) {
  if (!confirm('Are you sure you want to delete this rule?')) return;

  try {
    const response = await fetch(`/api/firewall/rules/${ruleId}`, {
      method: 'DELETE',
      credentials: 'same-origin'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete rule');
    }

    const result = await response.json();
    showSuccess(result.message || 'Rule deleted successfully');
    refreshFirewallData();
  } catch (error) {
    console.error('Delete rule error:', error);
    showError('Failed to delete rule: ' + error.message);
  }
}

function refreshFirewallData() {
  if (socket && isConnected) {
    socket.emit('firewall:refresh');
  } else {
    showError('Not connected - cannot refresh firewall data');
  }
}

// Handle firewall toggle
async function toggleFirewall(enable) {
  const confirmMessage = enable ?
    'Are you sure you want to ENABLE the firewall? This may block existing connections.' :
    'Are you sure you want to DISABLE the firewall? This will allow all incoming connections.';

  if (!confirm(confirmMessage)) return;

  try {
    const response = await fetch('/api/firewall/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ enabled: enable })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to toggle firewall');
    }

    const result = await response.json();
    showSuccess(result.message || 'Firewall status updated successfully');
    refreshFirewallData();
  } catch (error) {
    console.error('Toggle firewall error:', error);
    showError('Failed to toggle firewall: ' + error.message);
  }
}

// Show setup instructions
function showSetupInstructions() {
  const instructions = `
PanelOS Firewall Setup Required

The firewall tool is detected but sudo access needs to be configured.

Run this command in your terminal:

    sudo ./setup.sh

This will:
• Configure passwordless sudo access for firewall commands
• Install any missing system dependencies
• Set up proper permissions

After running the setup script, refresh this page to enable firewall management.

For manual setup, configure sudo access:
• Ubuntu/Debian: echo "youruser ALL=(ALL) NOPASSWD: /usr/sbin/ufw" | sudo tee /etc/sudoers.d/panelos-ufw
• Other systems: echo "youruser ALL=(ALL) NOPASSWD: /usr/sbin/iptables" | sudo tee /etc/sudoers.d/panelos-iptables

Replace 'youruser' with your actual username.
  `;

  alert(instructions);
}

// Handle add rule form
document.addEventListener('DOMContentLoaded', () => {
  const addRuleForm = document.getElementById('addRuleForm');
  if (addRuleForm) {
    addRuleForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const action = document.getElementById('ruleAction').value;
      const protocol = document.getElementById('ruleProtocol').value;
      const port = document.getElementById('rulePort').value;
      const source = document.getElementById('ruleSource').value;

      if (!port) {
        alert('Port is required');
        return;
      }

      addFirewallRule(action, protocol, port, source);
      addRuleForm.reset();
    });
  }
});

function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // Remove active from all nav tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('active');
  });

  // Show selected tab
  document.getElementById(tabName).classList.add('active');

  // Mark nav tab as active
  event.target.classList.add('active');

  // Load data for specific tabs
  if (tabName === 'firewall') {
    refreshFirewallData();
  }
}

/**
 * Logout user
 */
async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  } catch (error) {
    console.error('Logout error:', error);
    alert('Logout failed');
  }
}
