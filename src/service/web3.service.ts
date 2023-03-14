import { Provide, Inject, Config } from '@midwayjs/decorator';
import { RedisService } from '@midwayjs/redis';
import { BigNumber, ethers, utils } from 'ethers';
import { ERC20 } from '@soundsright/contracts';
import { Web3Manager } from '../interface';

@Provide()
export class Web3Service {
  @Inject()
  redis: RedisService;

  @Config('web3Config')
  web3Config;

  @Inject('web3')
  web3: Web3Manager;

  contractCaches: ethers.Contract[] = [];

  async getBalance(chainId: number, address: string) {
    const web3Provider = this.web3[chainId].provider;
    return await web3Provider.getBalance(address);
  }

  async getErc20Balance(chainId: number, address: string) {
    const { usdcAddress } = this.web3Config.chainConfigs[chainId];

    const web3Provider = this.web3[chainId].provider;
    const contract = await web3Provider.getContract(usdcAddress, ERC20);
    const bnBalance: BigNumber = await contract.balanceOf(address);
    const decimals = await contract.decimals();
    return utils.formatUnits(bnBalance, decimals);
  }

  async checkTransaction(chainId: number, hash: string) {
    const web3Provider = this.web3[chainId].provider;
    return web3Provider.checkTransaction(hash);
  }

  async getTransaction(chainId: number, hash: string) {
    const web3Provider = this.web3[chainId].provider;
    return web3Provider.getTransaction(hash);
  }

  getTransactionUrl(chainId: number, hash: string) {
    if (!hash) return '';
    const { browserUrl } = this.web3Config.chainConfigs[chainId];
    return `${browserUrl}/tx/${hash}`;
  }
}
