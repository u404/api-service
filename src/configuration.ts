import { Configuration, App, Config, Inject } from '@midwayjs/decorator';
import * as koa from '@midwayjs/koa';
import * as validate from '@midwayjs/validate';
import * as staticFile from '@midwayjs/static-file';
import * as redis from '@midwayjs/redis';
import * as info from '@midwayjs/info';
import * as sequelize from '@midwayjs/sequelize';
import { join } from 'path';
// import { DefaultErrorFilter } from './filter/default.filter';
// import { NotFoundFilter } from './filter/notfound.filter';
import { ReportMiddleware } from './middleware/report.middleware';
import { FormatResponseMiddleware } from './middleware/formatResponse.middleware';

import { Web3Provider, Web3Client } from './lib/web3';
import { OfficialWallet } from './entity/OfficialWallet.entity';
import { OfficialWalletType, Web3Manager } from './interface';
import crypto from './lib/crypto';
import { Op } from 'sequelize';

@Configuration({
  imports: [
    koa,
    validate,
    {
      component: info,
      enabledEnvironment: ['local'],
    },
    staticFile,
    redis,
    sequelize,
  ],
  importConfigs: [join(__dirname, './config')],
})
export class ContainerLifeCycle {
  @App()
  app: koa.Application;

  @Config('web3Config')
  web3Config;

  @Inject()
  redisService: redis.RedisService;

  async onReady() {
    // add middleware
    this.app.useMiddleware([ReportMiddleware, FormatResponseMiddleware]);
    // add filter
    // this.app.useFilter([NotFoundFilter, DefaultErrorFilter]);
  }

  async onServerReady() {
    await this.initWeb3();
  }

  getOfficialWalletRoles() {
    return Object.values(OfficialWalletType);
  }

  async getOfficialWalletRolePrivateKeyMap() {
    const { walletAesKey, walletAesIv } = this.web3Config;
    const roles = this.getOfficialWalletRoles();
    const walletList = await OfficialWallet.findAll({
      where: { role: { [Op.in]: roles } },
    });

    return roles.reduce((o, role) => {
      const wallet = walletList.find(w => w.role === role) || walletList.find(w => w.role === OfficialWalletType.ContractExecutor);
      o[role] = crypto.aesDecrypt(wallet.privateKeyEncrypted, walletAesKey, walletAesIv);
      return o;
    }, {} as Record<OfficialWalletType, string>);
  }

  createWeb3Client(privateKey: string, rpcUrl: string) {
    return new Web3Client({ privateKey, rpcUrls: [rpcUrl] }, this.redisService);
  }

  async initWeb3() {
    const { chainConfigs } = this.web3Config;
    const roles = this.getOfficialWalletRoles();
    const rolePrivateKeyMap = await this.getOfficialWalletRolePrivateKeyMap();
    const web3: Web3Manager = {};
    for (const chainId in chainConfigs) {
      const chainConfig = chainConfigs[chainId];
      const Web3Instance = {
        clients: roles.reduce((o, role) => {
          o[role] = this.createWeb3Client(rolePrivateKeyMap[role], chainConfig.rpcUrl);
          return o;
        }, {} as Record<OfficialWalletType, Web3Client>),
        provider: new Web3Provider(chainConfig.rpcUrl, this.redisService),
      };
      web3[chainConfig.chainId] = Web3Instance;
    }
    this.app.getApplicationContext().registerObject('web3', web3);
  }
}
