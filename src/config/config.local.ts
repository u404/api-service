import { MidwayConfig } from '@midwayjs/core';

export default {
  redis: {
    client: {
      port: 6379, // Redis port
      host: 'X.X.X.X', // Redis host
      password: 'XXXXXXXXXXXXXXX',
      db: 11,
    },
  },
  sequelize: {
    options: {
      database: 'SR_ApiService_dev',
      username: 'XXXXXXXXX',
      password: 'XXXXXXXXXXXXXXXX',
      host: 'x.x.x.x',
      port: 3306,
      encrypt: false,
      dialect: 'mysql',
      logging: console.log,
    },
    sync: false,
  },
  web3Config: {},
} as MidwayConfig;
