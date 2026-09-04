/**
 * Print Bazzar — PM2 Enterprise Process Manager Configuration
 * 
 * Usage:
 * Start:   pm2 start ecosystem.config.cjs --env production
 * Status:  pm2 status
 * Logs:    pm2 logs printbazzar-api
 * Reload:  pm2 reload printbazzar-api --update-env
 */

module.exports = {
  apps: [
    {
      name: 'printbazzar-api',
      script: './src/server.js',
      instances: 1, // Fork or cluster (use 1 for single-node or 'max' for multi-core VPS)
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      time: true,
    },
  ],
};
