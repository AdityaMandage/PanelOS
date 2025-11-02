import si from 'systeminformation';
import fs from 'fs/promises';

/**
 * System Metrics Collection Service
 * Collects real-time system information
 */
class MetricsService {
  constructor(config = {}) {
    this.logger = config.logger;
    this.sampleInterval = 1000; // For CPU calculation
    this.lastCpuMeasure = null;
  }

  /**
   * Get all system metrics
   * @returns {Promise<Object>} System metrics object
   */
  async getSystemMetrics() {
    try {
      const [cpu, memory, disk, temp, uptime, osInfo, network] = await Promise.all([
        this._getCpuMetrics().catch(err => {
          this.logger?.error('CPU metrics error:', err.message);
          return { usage: 0, cores: [], model: 'Unknown' };
        }),
        this._getMemoryMetrics().catch(err => {
          this.logger?.error('Memory metrics error:', err.message);
          return { total: 0, used: 0, free: 0, cached: 0, percentage: 0 };
        }),
        this._getDiskMetrics().catch(err => {
          this.logger?.error('Disk metrics error:', err.message);
          return [];
        }),
        this._getTemperatureMetrics().catch(err => {
          this.logger?.error('Temperature metrics error:', err.message);
          return { celsius: 0, status: 'unavailable' };
        }),
        this._getUptimeMetrics().catch(err => {
          this.logger?.error('Uptime metrics error:', err.message);
          return { system: { days: 0, hours: 0, minutes: 0, total: 0 }, formatted: '0d 0h' };
        }),
        this._getOsMetrics().catch(err => {
          this.logger?.error('OS metrics error:', err.message);
          return { platform: 'Unknown', distro: 'Unknown', kernel: 'Unknown', hostname: 'Unknown', arch: 'Unknown' };
        }),
        this._getNetworkMetrics().catch(err => {
          this.logger?.error('Network metrics error:', err.message);
          return [];
        })
      ]);

      return {
        timestamp: new Date().toISOString(),
        cpu,
        memory,
        disk,
        temperature: temp,
        uptime,
        system: osInfo,
        network
      };
    } catch (error) {
      this.logger?.error('Error collecting metrics:', error);
      throw error;
    }
  }

  /**
   * Get CPU metrics
   * @private
   */
  async _getCpuMetrics() {
    try {
      const cpuData = await si.currentLoad();
      return {
        usage: parseFloat(cpuData.currentLoad.toFixed(1)),
        cores: cpuData.cpus.map(cpu => parseFloat(cpu.load.toFixed(1))),
        model: cpuData.cpuModel || 'Unknown'
      };
        } catch (error) {
      // CPU metrics unavailable - suppress logging
      return { usage: 0, cores: [], load: [0, 0, 0] };
    }
  }

  /**
   * Get memory metrics
   * @private
   */
  async _getMemoryMetrics() {
    try {
      const memData = await si.mem();
      const used = Math.round(memData.used / 1024 / 1024); // Convert to MB
      const total = Math.round(memData.total / 1024 / 1024); // Convert to MB
      const free = Math.round(memData.free / 1024 / 1024);
      const percentage = parseFloat(((used / total) * 100).toFixed(1));

      return {
        total,
        used,
        free,
        cached: Math.round((memData.buffers + memData.cached) / 1024 / 1024),
        percentage
      };
    } catch (error) {
      // Memory metrics unavailable - suppress logging
      return { total: 0, used: 0, free: 0, percentage: 0 };
    }
  }

  /**
   * Get disk metrics
   * @private
   */
  async _getDiskMetrics() {
    try {
      const diskData = await si.fsSize();
      return diskData.map(disk => ({
        device: disk.fs,
        mount: disk.mount,
        total: Math.round(disk.size / 1024 / 1024 / 1024), // GB
        used: Math.round(disk.used / 1024 / 1024 / 1024),
        free: Math.round(disk.available / 1024 / 1024 / 1024),
        percentage: parseFloat(disk.use.toFixed(1)),
        type: disk.type
      }));
    } catch (error) {
      // Disk metrics unavailable - suppress logging
      return [];
    }
  }

  /**
   * Get temperature metrics
   * @private
   */
  async _getTemperatureMetrics() {
    try {
      // Try Pi-specific thermal zone first
      try {
        const tempFile = '/sys/class/thermal/thermal_zone0/temp';
        const tempRaw = await fs.readFile(tempFile, 'utf-8');
        const celsius = Math.round(parseInt(tempRaw) / 100) / 10;
        return {
          celsius: parseFloat(celsius.toFixed(1)),
          status: this._getTempStatus(celsius)
        };
      } catch {
        // Fall back to systeminformation
        const tempData = await si.cpuTemperature();
        if (tempData.main !== -1) {
          const celsius = parseFloat(tempData.main.toFixed(1));
          return {
            celsius,
            status: this._getTempStatus(celsius)
          };
        }
        return { celsius: 0, status: 'unknown' };
      }
    } catch (error) {
      // Temperature metrics unavailable on this system - suppress logging
      return { celsius: 0, status: 'unavailable' };
    }
  }

  /**
   * Determine temperature status
   * @private
   */
  _getTempStatus(celsius) {
    if (celsius < 50) return 'cool';
    if (celsius < 65) return 'normal';
    if (celsius < 80) return 'warm';
    return 'hot';
  }

  /**
   * Get uptime metrics
   * @private
   */
  async _getUptimeMetrics() {
    try {
      const uptimeSeconds = process.uptime();
      const systemUptimeData = await si.time();
      const systemUptimeSeconds = systemUptimeData.uptime;

      const formatUptime = (seconds) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return { days, hours, minutes, total: seconds };
      };

      return {
        system: formatUptime(systemUptimeSeconds),
        formatted: `${Math.floor(systemUptimeSeconds / 86400)}d ${Math.floor((systemUptimeSeconds % 86400) / 3600)}h`
      };
    } catch (error) {
      // Uptime metrics unavailable - suppress logging
      return { system: { days: 0, hours: 0, minutes: 0, total: 0 }, formatted: '0d 0h' };
    }
  }

  /**
   * Get OS information
   * @private
   */
  async _getOsMetrics() {
    try {
      const osData = await si.osInfo();
      return {
        platform: osData.platform,
        distro: osData.distro,
        kernel: osData.kernel,
        hostname: osData.hostname || 'Unknown',
        arch: osData.arch
      };
    } catch (error) {
      // OS metrics unavailable - suppress logging
      return { platform: 'Unknown', distro: 'Unknown', kernel: 'Unknown', hostname: 'Unknown', arch: 'Unknown' };
    }
  }

  /**
   * Get network information
   * @private
   */
  async _getNetworkMetrics() {
    try {
      const networkData = await si.networkInterfaces();
      return networkData
        .filter(net => net.ip4 || net.ip6) // Only interfaces with IP
        .map(net => ({
          name: net.iface,
          mac: net.mac,
          ip4: net.ip4 || null,
          ip6: net.ip6 || null,
          internal: net.internal || false
        }));
    } catch (error) {
      // Network metrics unavailable - suppress logging
      return [];
    }
  }

  /**
   * Get quick metrics (lightweight version for frequent updates)
   * @returns {Promise<Object>}
   */
  async getQuickMetrics() {
    try {
      const [cpu, memory, temp] = await Promise.all([
        this._getCpuMetrics().catch(err => {
          this.logger?.debug('CPU quick metrics error:', err.message);
          return { usage: 0, cores: [], model: 'Unknown' };
        }),
        this._getMemoryMetrics().catch(err => {
          this.logger?.debug('Memory quick metrics error:', err.message);
          return { total: 0, used: 0, free: 0, cached: 0, percentage: 0 };
        }),
        this._getTemperatureMetrics().catch(err => {
          this.logger?.debug('Temperature quick metrics error:', err.message);
          return { celsius: 0, status: 'unavailable' };
        })
      ]);

      return {
        timestamp: new Date().toISOString(),
        cpu,
        memory,
        temperature: temp
      };
    } catch (error) {
      this.logger?.error('Error collecting quick metrics:', error);
      throw error;
    }
  }
}

export default MetricsService;
