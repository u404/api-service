import { MidwayConfig } from '@midwayjs/core';

export default {
  midwayLogger: {
    default: {
      level: 'info',
    },
  },
  redis: {
    client: {
      port: 6379,
      host: 'XXXXXXXXXXXX',
      password: 'XXXXXXXXXXXXXXX',
      db: 11,
    },
  },
  sequelize: {
    options: {
      database: 'SR_ApiService_dev',
      username: 'XXXXXXXX',
      password: 'XXXXXXXXXXXXX',
      host: 'mysql-dev-test',
      port: 3306,
      encrypt: false,
      dialect: 'mysql',
      logging: console.log,
    },
    sync: false,
  },
} as MidwayConfig;
