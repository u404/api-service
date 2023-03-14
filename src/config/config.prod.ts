import { MidwayConfig } from '@midwayjs/core';

export default {
  web3Config: {
    walletAesKey: process.env.WALLET_AES_KEY,
    walletAesIv: 'XXXXXXXXXX',
  },
  redis: {
    client: {
      port: 6379,
      host: 'redis-nodejs',
      password: 'XXXXXXXXXXXXX',
      db: 11,
    },
  },
  sequelize: {
    options: {
      database: 'SR_ApiService_prod',
      username: 'XXXXXXXXXXX',
      password: 'XXXXXXXXXXXXXXX',
      host: 'mysql-nodejs-prod',
      port: 3306,
      encrypt: false,
      dialect: 'mysql',
      logging: console.log,
    },
    sync: false,
  },
  lark: {
    enabled: true,
  },
} as MidwayConfig;
