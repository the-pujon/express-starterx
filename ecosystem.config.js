module.exports = {
  apps: [
    {
      name: 'express-server',
      script: 'dist/server.js',
      env: {
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'verysecrateyahoo!!!!!!!!!!',
        JWT_REFRESH_SECRET: 'your_refresh_secret',
        JWT_ACCESS_EXPIRES_IN: '1d',
        JWT_REFRESH_EXPIRES_IN: '7d',
      },
    },
  ],
};
