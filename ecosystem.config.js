module.exports = {
  apps: [{
    name: 'lapzone',
    script: './build/src/server.js',
    interpreter: 'node',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env_development: {
      NODE_ENV: 'development',
      BUILD_MODE: 'dev',
      PORT: 8020
    },
    env_production: {
      NODE_ENV: 'production',
      BUILD_MODE: 'production',
      PORT: 8020
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_size: '10M',
    retain: 7,
    compress: true,
    // Bật combine logs để dễ theo dõi
    combine_logs: true
  }]
}
