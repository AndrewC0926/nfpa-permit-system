const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
  services: {
    backend: 'http://localhost:3000',
    frontend: 'http://localhost:5173',
    mongodb: 'mongodb://localhost:27017',
    prometheus: 'http://localhost:9090',
    grafana: 'http://localhost:3000',
    elasticsearch: 'http://localhost:9200',
    kibana: 'http://localhost:5601',
    loki: 'http://localhost:3100'
  },
  thresholds: {
    cpu: 85,
    memory: 85,
    disk: 85,
    responseTime: 2000
  }
};

// Utility functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const checkEndpoint = async (url, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const start = Date.now();
      const response = await axios.get(url, { timeout: 5000 });
      const responseTime = Date.now() - start;
      
      return {
        status: response.status,
        responseTime,
        healthy: response.status >= 200 && response.status < 300
      };
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(delay);
    }
  }
};

const getSystemMetrics = async () => {
  const [cpu, memory, disk] = await Promise.all([
    execPromise('top -bn1 | grep "Cpu(s)" | awk \'{print $2}\''),
    execPromise('free -m | grep Mem | awk \'{print $3/$2 * 100.0}\''),
    execPromise('df -h / | tail -1 | awk \'{print $5}\' | sed \'s/%//\'')
  ]);

  return {
    cpu: parseFloat(cpu.stdout.trim()),
    memory: parseFloat(memory.stdout.trim()),
    disk: parseFloat(disk.stdout.trim())
  };
};

const checkDockerContainers = async () => {
  const { stdout } = await execPromise('docker ps --format "{{.Names}}:{{.Status}}"');
  return stdout.split('\n')
    .filter(Boolean)
    .map(line => {
      const [name, status] = line.split(':');
      return { name, status, healthy: status.includes('healthy') };
    });
};

const checkLogs = async (container, pattern) => {
  try {
    const { stdout } = await execPromise(`docker logs ${container} 2>&1 | grep "${pattern}"`);
    return { found: true, message: stdout.trim() };
  } catch (error) {
    return { found: false, message: error.message };
  }
};

const validateSecurity = async () => {
  const results = {
    ssl: false,
    headers: {},
    ports: []
  };

  // Check SSL certificate
  try {
    const { stdout } = await execPromise('openssl x509 -enddate -noout -in certs/server.crt');
    results.ssl = {
      valid: true,
      expiry: stdout.trim().split('=')[1]
    };
  } catch (error) {
    results.ssl = { valid: false, error: error.message };
  }

  // Check security headers
  try {
    const response = await axios.get(`${config.services.backend}/health`);
    results.headers = {
      hsts: response.headers['strict-transport-security'] ? true : false,
      xss: response.headers['x-xss-protection'] ? true : false,
      frame: response.headers['x-frame-options'] ? true : false,
      contentType: response.headers['x-content-type-options'] ? true : false
    };
  } catch (error) {
    results.headers = { error: error.message };
  }

  // Check open ports
  try {
    const { stdout } = await execPromise('netstat -tuln');
    results.ports = stdout.split('\n')
      .filter(line => line.includes('LISTEN'))
      .map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          port: parts[3].split(':')[1],
          state: parts[5]
        };
      });
  } catch (error) {
    results.ports = { error: error.message };
  }

  return results;
};

const checkBackupStatus = async () => {
  try {
    const backupDir = path.join(__dirname, '..', 'backup');
    const files = await fs.readdir(backupDir);
    const latestBackup = files
      .filter(f => f.endsWith('.gz'))
      .sort()
      .pop();

    if (latestBackup) {
      const stats = await fs.stat(path.join(backupDir, latestBackup));
      return {
        exists: true,
        latest: latestBackup,
        size: stats.size,
        lastModified: stats.mtime
      };
    }
    return { exists: false };
  } catch (error) {
    return { error: error.message };
  }
};

const generateReport = (results) => {
  const report = {
    timestamp: new Date().toISOString(),
    system: results.system,
    services: results.services,
    security: results.security,
    backup: results.backup,
    containers: results.containers,
    logs: results.logs
  };

  // Save report
  const reportPath = path.join(__dirname, '..', 'reports', `health-report-${Date.now()}.json`);
  fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  return report;
};

// Main validation function
const validateHealth = async () => {
  console.log('Starting health validation...');

  try {
    // Check system metrics
    const systemMetrics = await getSystemMetrics();
    console.log('System metrics:', systemMetrics);

    // Check service health
    const serviceHealth = {};
    for (const [name, url] of Object.entries(config.services)) {
      try {
        serviceHealth[name] = await checkEndpoint(url);
      } catch (error) {
        serviceHealth[name] = { error: error.message };
      }
    }
    console.log('Service health:', serviceHealth);

    // Check Docker containers
    const containers = await checkDockerContainers();
    console.log('Container status:', containers);

    // Check logs
    const logs = {
      backend: await checkLogs('backend', 'Server started'),
      frontend: await checkLogs('frontend', 'Local:'),
      blockchain: await checkLogs('peer0.org1.example.com', 'Starting peer')
    };
    console.log('Log checks:', logs);

    // Validate security
    const security = await validateSecurity();
    console.log('Security validation:', security);

    // Check backup status
    const backup = await checkBackupStatus();
    console.log('Backup status:', backup);

    // Generate and save report
    const report = generateReport({
      system: systemMetrics,
      services: serviceHealth,
      security,
      backup,
      containers,
      logs
    });

    console.log('Health validation completed. Report saved.');
    return report;

  } catch (error) {
    console.error('Health validation failed:', error);
    throw error;
  }
};

// Run validation if called directly
if (require.main === module) {
  validateHealth()
    .then(report => {
      console.log('Validation complete. Report:', report);
      process.exit(0);
    })
    .catch(error => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

module.exports = {
  validateHealth,
  checkEndpoint,
  getSystemMetrics,
  checkDockerContainers,
  validateSecurity,
  checkBackupStatus
}; 