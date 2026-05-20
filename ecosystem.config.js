module.exports = {
  apps: [
    {
      name: 'las-gaviotas-book',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3005',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--use-system-ca',
        PORT: '3005',
      },
    },
  ],
};
