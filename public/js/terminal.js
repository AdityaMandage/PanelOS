// Terminal state
let terminal = null;
let terminalSocket = null;
let terminalReady = false;

/**
 * Initialize terminal on tab switch
 */
function initializeTerminal() {
  if (terminal || terminalReady) return; // Already initialized

  const terminalElement = document.getElementById('terminalContainer');
  if (!terminalElement) return;

  // Load xterm.js libraries
  loadXtermJS().then(() => {
    setupTerminal();
  }).catch(err => {
    console.error('Failed to load xterm:', err);
    terminalElement.innerHTML = '<div class="text-red-500">Failed to load terminal</div>';
  });
}

/**
 * Load xterm.js and addon scripts
 */
function loadXtermJS() {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.Terminal) {
      resolve();
      return;
    }

    // Load xterm.js
    const script1 = document.createElement('script');
    script1.src = 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js';
    script1.onload = () => {
      // Load xterm-addon-fit
      const script2 = document.createElement('script');
      script2.src = 'https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js';
      script2.onload = () => {
        // Load CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css';
        document.head.appendChild(link);
        resolve();
      };
      script2.onerror = reject;
      document.head.appendChild(script2);
    };
    script1.onerror = reject;
    document.head.appendChild(script1);
  });
}

/**
 * Setup terminal
 */
function setupTerminal() {
  const terminalElement = document.getElementById('terminalContainer');
  
  // Clear loading message
  terminalElement.innerHTML = '';

  // Create terminal instance
  if (!window.Terminal) {
    throw new Error('Terminal library missing');
  }

  terminal = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: "'Fira Code', 'Courier New', monospace",
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#adadad',
      selection: 'rgba(100, 100, 100, 0.3)'
    },
    scrollback: 1000
  });

  // Open terminal
  terminal.open(terminalElement);

  // Add fit addon
  if (!window.FitAddon || !window.FitAddon.FitAddon) {
    throw new Error('FitAddon library missing');
  }

  const fitAddon = new FitAddon.FitAddon();
  terminal.loadAddon(fitAddon);
  fitAddon.fit();

  // Handle terminal input
  terminal.onData((data) => {
    if (terminalSocket && terminalReady) {
      terminalSocket.emit('terminal:input', { input: data });
    }
  });

  // Handle terminal resize
  terminal.onResize(({ cols, rows }) => {
    if (terminalSocket && terminalReady) {
      terminalSocket.emit('terminal:resize', { cols, rows });
    }
  });

  // Connect to terminal via existing socket
  terminalSocket = socket;
  startTerminalSession();

  // Fit on window resize
  window.addEventListener('resize', () => {
    if (fitAddon) {
      fitAddon.fit();
      const { cols, rows } = terminal;
      if (terminalSocket && terminalReady) {
        terminalSocket.emit('terminal:resize', { cols, rows });
      }
    }
  });
}

/**
 * Start terminal session
 */
function startTerminalSession() {
  if (!terminalSocket) return;

  // Get current user from DOM
  const username = document.getElementById('username')?.textContent;
  
  if (!username || username === 'Loading...') {
    terminal.write('\r\n✗ Error: Username not available\r\n');
    return;
  }

  // Show password prompt
  const password = prompt('Enter your SSH password to start terminal:');
  if (!password) {
    terminal.write('\r\n✗ Terminal session cancelled\r\n');
    return;
  }

  terminalSocket.emit('terminal:start', {
    rows: terminal.rows,
    cols: terminal.cols,
    username,
    password
  });

  // Handle terminal events
  terminalSocket.on('terminal:ready', ({ sessionId }) => {
    terminalReady = true;
    terminal.write('\r\n✓ Terminal connected\r\n');
  });

  terminalSocket.on('terminal:output', ({ data }) => {
    terminal.write(data);
  });

  terminalSocket.on('terminal:error', ({ error }) => {
    terminal.write(`\r\n✗ Error: ${error}\r\n`);
    terminalReady = false;
  });

  terminalSocket.on('terminal:closed', () => {
    terminal.write('\r\n✓ Terminal closed\r\n');
    terminalReady = false;
  });
}

// Hook into tab switch to initialize terminal when needed
document.addEventListener('DOMContentLoaded', () => {
  // Monkey patch switchTab to handle terminal initialization
  const originalSwitchTab = window.switchTab;
  window.switchTab = function(tabName) {
    originalSwitchTab.call(this, tabName);
    if (tabName === 'terminal') {
      setTimeout(initializeTerminal, 100);
    }
  };
});
