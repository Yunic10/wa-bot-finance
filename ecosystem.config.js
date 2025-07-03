module.exports = {
  apps: [{
    name: 'wa-finance-bot',
    script: 'src/index.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 8000,
    shutdown_with_message: true,
    source_map_support: false,
    node_args: '--max-old-space-size=2048',
    cwd: './',
    interpreter: 'node',
    interpreter_args: '',
    script_args: '',
    ignore_watch: [
      'node_modules',
      'logs',
      '.wwebjs_auth',
      '.wwebjs_cache'
    ],
    watch_options: {
      followSymlinks: false,
      usePolling: true
    }
  }],

  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/wa-finance-bot.git',
      path: '/var/www/wa-finance-bot',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
}; 