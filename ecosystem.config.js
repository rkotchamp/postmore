module.exports = {
  apps: [
    {
      name: "nextjs-app",
      script: "npm",
      args: "run dev",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
        PORT: 3001,
      },
    },
    {
      name: "standalone-worker",
      script: "app/lib/queues/standalone-worker.mjs",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "token-refresh",
      script: "app/lib/queues/tokenRefreshQueue.mjs",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
