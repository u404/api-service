import { MidwayConfig } from '@midwayjs/core';

export default {
  redis: {
    client: {
      port: 6379,
      host: 'redis-nodejs-test',
      password: 'XXXXXXXXXXXXX',
      db: 11,
    },
  },
  sequelize: {
    options: {
      database: 'SR_ApiService_test',
      username: 'XXXXXXXXXX',
      password: 'XXXXXXXXXXXXXXXXXXXXX',
      host: 'mysql-dev-test',
      port: 3306,
      encrypt: false,
      dialect: 'mysql',
      logging: console.log,
    },
    sync: false,
  },
} as MidwayConfig;
