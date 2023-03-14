import { MidwayConfig } from '@midwayjs/core';

const AlchemyKeyGoerli = 'XXXXXXXXXXXXXXXXXXXXXXX';
const AlchemyKeyEthereum = 'XXXXXXXXXXXXXXXXXXXXXXXXXX';

export default {
  // use for cookie sign key, should change to your own and keep security
  keys: '1652858348048_4361',
  koa: {
    port: 7001,
    contextLoggerFormat: info => {
      return `[SERVICE_LOG:] ${info.timestamp} ${info.LEVEL} ${info.pid} ${info.labelText}${info.message}`;
    },
  },
  midwayLogger: {
    default: {
      dir: '/logs/node-api',
      format: info => {
        return `[SERVICE_LOG:] ${info.timestamp} ${info.LEVEL} ${info.pid} ${info.labelText}${info.message}`;
      },
    },
    // ...
  },
  web3Config: {
    walletAesKey: 'XXXXXXXXX',
    walletAesIv: 'XXXXXXX',
    // rpcUrls: [
    //   'https://matic-mumbai.chainstacklabs.com',
    //   'https://polygontestapi.terminet.io/rpc',
    //   'https://rpc-mumbai.maticvigil.com',
    //   'https://polygon-mumbai.g.alchemy.com/v2/XXXXXXXXXXXXXXXx',
    //   'https://rpc-mumbai.maticvigil.com',
    //   'https://matic-testnet-archive-rpc.bwarelabs.com',
    // ],
    // infuraId: 'XXXXXXXXXXXXXXXXXXXXXXXXX',
    chainConfigs: {
      80001: {
        chainId: 80001,
        name: 'Polygon Mumbai',
        symbol: 'MATIC',
        browserUrl: 'https://mumbai.polygonscan.com',
        rpcUrl: 'https://matic-mumbai.chainstacklabs.com',
        usdcAddress: 'XXXXXXXXXXXXXXXXXXXXXXXXXXX',
        paymentAddress: 'XXXXXXXXXXXXXXXXXXXXXXXXXXX',
        claimAddress: 'XXXXXXXXXXXXXXXXXXXXXXXXXXX',
      },
      137: {
        chainId: 137,
        name: 'Polygon',
        symbol: 'MATIC',
        browserUrl: 'https://polygonscan.com',
        rpcUrl: 'https://polygon-rpc.com',
        usdcAddress: 'XXXXXXXXXXXXXXXXXXXXXXXXXXX',
        paymentAddress: 'XXXXXXXXXXXXXXXXXXXXXXXXXXX',
        claimAddress: 'XXXXXXXXXXXXXXXXXXXXXXXXXXX', // 这是正式地址
        //   // 注：claimAddress多个环境不同的，需分别配置
        //   pre: 'XXXXXXXXXXXXXXXXXXXXXXXXXXX',
        //   prod: 'XXXXXXXXXXXXXXXXXXXXXXXXXXX',
      },
      5: {
        chainId: 5,
        name: 'Goerli',
        symbol: 'GoerliETH',
        browserUrl: 'https://goerli.etherscan.io',
        rpcUrl: `https://eth-goerli.g.alchemy.com/v2/${AlchemyKeyGoerli}`, // `https://goerli.infura.io/v3/${InfuraKey}`, // 注：需要稳定的infura key或 https://www.alchemy.com/ 的key
        usdcAddress: '待定',
        paymentAddress: '待定',
        claimAddress: '待定',
      },
      1: {
        chainId: 1,
        name: 'Ethereum',
        symbol: 'ETH',
        browserUrl: 'https://etherscan.io',
        rpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${AlchemyKeyEthereum}`, // `https://mainnet.infura.io/v3/${InfuraKey}`, // 注：需要稳定的infura key或 https://www.alchemy.com/ 的key
        usdcAddress: 'XXXXXXXXXXXXXXXXXXXXXXXXXXX',
        paymentAddress: '待定',
        claimAddress: '待定',
      },
    },
  },
  lark: {
    enabled: true,
    webhook: 'https://open.larksuite.com/open-apis/bot/v2/hook/XXXXXXXXXXXXXXX',
  },
} as MidwayConfig;
