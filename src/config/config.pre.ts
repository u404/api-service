import { MidwayConfig } from '@midwayjs/core';

const AlchemyKeyEthereum = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

export default {
  web3Config: {
    walletAesKey: process.env.WALLET_AES_KEY,
    walletAesIv: 'XXXXXXXX',
    chainConfigs: {
      137: {
        claimAddress: 'XXXXXXXXXXXXXXXXXXXXXXXXX',
      },
      1: {
        rpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${AlchemyKeyEthereum}`, // 预发单独配置
      },
    },
  },
  redis: {
    client: {
      port: 6379,
      host: 'redis-nodejs-pre',
      password: 'XXXXXXXXXXXXXXX',
      db: 11,
    },
  },
  sequelize: {
    options: {
      database: 'SR_ApiService_pre',
      username: 'XXXXXXXXX',
      password: 'XXXXXXXXXXXXXXXX',
      host: 'mysql-pre',
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
