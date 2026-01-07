// PM2 Ecosystem Configuration
// This file is used by PM2 to manage the Node.js application

module.exports = {
  apps: [
    {
      name: 'bs-consultoria',
      script: './server/production.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'sdr-agent',
      script: './server/sdr-server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        SDR_PORT: 3002
      },
      error_file: './logs/sdr-error.log',
      out_file: './logs/sdr-out.log',
      log_file: './logs/sdr-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
