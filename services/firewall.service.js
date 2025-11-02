import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

/**
 * Firewall Management Service
 * Handles firewall operations using ufw or iptables
 */
class FirewallService {
  constructor(config = {}) {
    this.logger = config.logger;
    this.firewallTool = null; // 'ufw' or 'iptables'
    this.enabled = config.enabled !== false; // Default to enabled
  }

  /**
   * Detect available firewall tool and check sudo access
   * @private
   */
  async _detectFirewallTool() {
    if (this.firewallTool) return this.firewallTool;

    try {
      // Try ufw first
      try {
        await execAsync('which ufw > /dev/null 2>&1');
        // Tool exists, test sudo access
        try {
          await execAsync('sudo -n ufw status > /dev/null 2>&1');
          this.firewallTool = 'ufw';
          this.logger?.info('Detected ufw firewall tool with sudo access');
          return this.firewallTool;
        } catch (sudoError) {
          // Tool exists but no sudo access
          this.firewallTool = 'ufw';
          this.logger?.warn('Detected ufw firewall tool but sudo access not configured: ' + sudoError.message);
          throw new Error('sudo access required');
        }
      } catch (ufwError) {
        // Try iptables
        try {
          await execAsync('which iptables > /dev/null 2>&1');
          // Tool exists, test sudo access
          try {
            await execAsync('sudo -n iptables -L > /dev/null 2>&1');
            this.firewallTool = 'iptables';
            this.logger?.info('Detected iptables firewall tool with sudo access');
            return this.firewallTool;
          } catch (sudoError) {
            // Tool exists but no sudo access
            this.firewallTool = 'iptables';
            this.logger?.warn('Detected iptables firewall tool but sudo access not configured: ' + sudoError.message);
            throw new Error('sudo access required');
          }
        } catch (iptablesError) {
          // Neither tool found
          this.logger?.error('No firewall tools found on system');
          throw new Error('No supported firewall tool found (ufw or iptables)');
        }
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Enable or disable firewall
   * @param {boolean} enable - Whether to enable or disable
   * @returns {Promise<Object>} Success status
   */
  async setStatus(enable) {
    if (!this.enabled) {
      throw new Error('Firewall management is disabled');
    }

    try {
      const tool = await this._detectFirewallTool();

      let command;
      if (tool === 'ufw') {
        command = enable ? 'sudo ufw --force enable' : 'sudo ufw --force disable';
      } else {
        // For iptables, enabling/disabling is more complex
        // We'll use iptables-save/restore or basic rules
        if (enable) {
          command = 'sudo iptables -P INPUT ACCEPT && sudo iptables -P FORWARD ACCEPT && sudo iptables -P OUTPUT ACCEPT && sudo iptables -F';
        } else {
          command = 'sudo iptables -P INPUT DROP && sudo iptables -P FORWARD DROP && sudo iptables -P OUTPUT ACCEPT && sudo iptables -F';
        }
      }

      await execAsync(command);
      this.logger?.info(`${enable ? 'Enabled' : 'Disabled'} firewall using ${tool}`);
      return { success: true, message: `Firewall ${enable ? 'enabled' : 'disabled'} successfully` };
    } catch (error) {
      this.logger?.error('Error setting firewall status:', error);
      throw new Error(`Failed to ${enable ? 'enable' : 'disable'} firewall: ${error.message}`);
    }
  }
  async getStatus() {
    if (!this.enabled) {
      return { enabled: false, tool: 'disabled', status: 'Firewall management disabled' };
    }

    try {
      const tool = await this._detectFirewallTool();

      if (tool === 'ufw') {
        const { stdout } = await execAsync('sudo ufw status');
        const enabled = stdout.includes('Status: active');
        return { enabled, tool: 'ufw' };
      } else {
        // For iptables, check if any rules exist
        const { stdout } = await execAsync('sudo iptables -L -n');
        const hasRules = stdout.trim().length > 0;
        return { enabled: hasRules, tool: 'iptables' };
      }
    } catch (error) {
      // If sudo access fails, return status indicating configuration needed
      if (error.message.includes('sudo')) {
        return {
          enabled: false,
          tool: this.firewallTool || 'unknown',
          status: 'Sudo access required. Run: sudo ./setup.sh',
          error: 'Firewall management requires sudo access configuration'
        };
      }
      this.logger?.error('Error getting firewall status:', error);
      throw new Error(`Failed to get firewall status: ${error.message}`);
    }
  }

  /**
   * Get firewall rules
   * @returns {Promise<Array>} Array of rule objects
   */
  async getRules() {
    if (!this.enabled) {
      return [];
    }

    try {
      const tool = await this._detectFirewallTool();
      const rules = [];

      if (tool === 'ufw') {
        const { stdout } = await execAsync('sudo ufw status numbered');
        const lines = stdout.split('\n').filter(line => line.trim() && /^\[\s*\d+\]/.test(line));

        for (const line of lines) {
          const match = line.match(/^\[\s*(\d+)\]\s*(.+)$/);
          if (match) {
            const [, num, ruleText] = match;
            rules.push({
              id: parseInt(num),
              rule: ruleText.trim(),
              tool: 'ufw'
            });
          }
        }
      } else {
        // iptables parsing is more complex
        const { stdout } = await execAsync('sudo iptables -L -n --line-numbers');
        // Parse iptables output - this is simplified
        const chains = stdout.split(/^Chain\s+/m);
        for (const chain of chains.slice(1)) {
          const lines = chain.split('\n').filter(line => /^\d+/.test(line.trim()));
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 6) {
              rules.push({
                id: `${parts[0]}-${parts[1]}`, // chain-num
                rule: line.trim(),
                tool: 'iptables'
              });
            }
          }
        }
      }

      return rules;
    } catch (error) {
      this.logger?.error('Error getting firewall rules:', error);
      if (error.message.includes('sudo access')) {
        return [];
      }
      throw new Error(`Failed to get firewall rules: ${error.message}`);
    }
  }

  /**
   * Add a firewall rule
   * @param {Object} rule - { action: 'allow'|'deny', protocol: 'tcp'|'udp', port: number, source?: string }
   * @returns {Promise<Object>} Success status
   */
  async addRule(rule) {
    if (!this.enabled) {
      throw new Error('Firewall management is disabled');
    }

    try {
      const { action, protocol, port, source = 'any' } = rule;

      // Validate input
      if (!action || !['allow', 'deny'].includes(action)) {
        throw new Error('Invalid action. Must be "allow" or "deny"');
      }
      if (!protocol || !['tcp', 'udp'].includes(protocol)) {
        throw new Error('Invalid protocol. Must be "tcp" or "udp"');
      }
      if (!port || isNaN(port) || port < 1 || port > 65535) {
        throw new Error('Invalid port. Must be between 1 and 65535');
      }

      // Validate source if provided
      if (source && source !== 'any') {
        // Basic IP/CIDR validation
        const ipCidrRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$|^[a-zA-Z0-9\-\.]+$/;
        if (!ipCidrRegex.test(source)) {
          throw new Error('Invalid source IP or CIDR notation');
        }
      }

      const tool = await this._detectFirewallTool();

      let command;
      if (tool === 'ufw') {
        command = `sudo ufw ${action} ${protocol}/${port}`;
        if (source && source !== 'any') {
          command += ` from ${source}`;
        }
      } else {
        // iptables command
        const chain = 'INPUT';
        const target = action === 'allow' ? 'ACCEPT' : 'DROP';
        command = `sudo iptables -I ${chain} -p ${protocol} --dport ${port} -j ${target}`;
        if (source && source !== 'any') {
          command += ` -s ${source}`;
        }
      }

      await execAsync(command);
      this.logger?.info(`Added firewall rule: ${action} ${protocol}/${port}`);
      return { success: true, message: 'Rule added successfully' };
    } catch (error) {
      this.logger?.error('Error adding firewall rule:', error);
      throw new Error(`Failed to add firewall rule: ${error.message}`);
    }
  }

  /**
   * Delete a firewall rule
   * @param {string|number} ruleId - Rule ID to delete
   * @returns {Promise<Object>} Success status
   */
  async deleteRule(ruleId) {
    if (!this.enabled) {
      throw new Error('Firewall management is disabled');
    }

    try {
      const tool = await this._detectFirewallTool();

      let command;
      if (tool === 'ufw') {
        command = `sudo ufw --force delete ${ruleId}`;
      } else {
        // For iptables, ruleId is "chain-num"
        const [chain, num] = ruleId.split('-');
        command = `sudo iptables -D ${chain} ${num}`;
      }

      await execAsync(command);
      this.logger?.info(`Deleted firewall rule: ${ruleId}`);
      return { success: true, message: 'Rule deleted successfully' };
    } catch (error) {
      this.logger?.error('Error deleting firewall rule:', error);
      throw new Error(`Failed to delete firewall rule: ${error.message}`);
    }
  }

  /**
   * Get exposed ports (listening ports with firewall context)
   * @returns {Promise<Array>} Array of port objects
   */
  async getExposedPorts() {
    if (!this.enabled) {
      return [];
    }

    try {
      // Get listening ports
      const { stdout: netstat } = await execAsync('netstat -tlnp 2>/dev/null || ss -tlnp 2>/dev/null');
      const ports = [];

      const lines = netstat.split('\n').filter(line => line.includes('LISTEN'));
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          const address = parts[3];
          const portMatch = address.match(/:(\d+)$/);
          if (portMatch) {
            const port = parseInt(portMatch[1]);
            const process = parts[parts.length - 1];
            ports.push({
              port,
              protocol: address.includes('tcp') ? 'tcp' : 'udp',
              process: process.split('/')[1] || process,
              address
            });
          }
        }
      }

      // Get firewall rules to check if ports are allowed
      const rules = await this.getRules();
      const allowedPorts = new Set();

      for (const rule of rules) {
        if (rule.tool === 'ufw') {
          const allowMatch = rule.rule.match(/ALLOW\s+(tcp|udp)?\/?(\d+)/i);
          if (allowMatch) {
            allowedPorts.add(parseInt(allowMatch[2]));
          }
        } else {
          // iptables parsing
          const allowMatch = rule.rule.match(/ACCEPT.*dport\s+(\d+)/i);
          if (allowMatch) {
            allowedPorts.add(parseInt(allowMatch[1]));
          }
        }
      }

      // Mark ports as firewalled or not
      for (const portInfo of ports) {
        portInfo.firewalled = !allowedPorts.has(portInfo.port);
      }

      return ports;
    } catch (error) {
      this.logger?.error('Error getting exposed ports:', error);
      if (error.message.includes('sudo access')) {
        return [];
      }
      throw new Error(`Failed to get exposed ports: ${error.message}`);
    }
  }
}

export default FirewallService;