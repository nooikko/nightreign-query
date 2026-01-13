module.exports = {
  apps: [
    {
      name: 'nightreign-web',
      script: 'apps/web/.next/standalone/apps/web/server.js',
      cwd: __dirname,
      instances: 4,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      error_file: 'logs/web-error.log',
      out_file: 'logs/web-out.log',
      log_file: 'logs/web-combined.log',
      time: true,
      merge_logs: true,
    },
    {
      name: 'nightreign-scraper',
      script: 'dist/index.js',
      cwd: `${__dirname}/apps/scraper`,
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: false,
      cron_restart: '0 4 * * *',
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: '../../logs/scraper-error.log',
      out_file: '../../logs/scraper-out.log',
      log_file: '../../logs/scraper-combined.log',
      time: true,
    },
  ],
}
