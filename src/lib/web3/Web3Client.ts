import { ethers } from 'ethers';
import { RedisService } from '@midwayjs/redis';
import { OfficialWalletType } from '../../interface';

const RK_NONCE_PREFIX = 'nonce';
const RK_TX_LOCK_PREFIX = 'tx_lock';
const RK_TX_LOCK_EXPIRES = 1;
const RK_SYNC_LOCK_PREFIX = 'sync_lock';
const RK_SYNC_LOCK_EXPIRES = 5;
const TX_TIMEOUT = 2 * 60;
const MAX_GAS_PRICE = 50 * 10 ** 9;
const GAS_PRICE_EXPIRES = 3;
const RK_GAS_PRICE_PREFIX = 'gas_price';

const formatRedisKey = (prefix: string, chainId: number, address?: string) => {
  return `${prefix}@${chainId}${address ? `#${address}` : ''}`; // 格式为：[prefix]@[chainId]#[address]，不含中括号，#address可选，例如：nonce@80001#0xabcd........
};

export enum TransactionStatus {
  Waiting = 1,
  Canceled = -1,
  Success = 100,
  Failed = -100,
}
export class TransactionNotMinedError extends Error {
  public constructor() {
    super();
    this.name = this.constructor.name;
    this.message = 'Transaction has not been mined.';
  }
}

export class ContractTransactionError extends Error {
  code: string;

  constructor(public receipt: ethers.providers.TransactionReceipt) {
    super();
    this.name = this.constructor.name;
    this.message = 'Contract transaction error.';
    this.code = 'CONTRACT_TRANSACTION_ERROR';
  }
}

export class TransactionFailedError extends Error {
  public constructor() {
    super();
    this.name = this.constructor.name;
    this.message = 'Transaction failed.';
  }
}

export type Web3ClientConfig = {
  privateKey: string;
  rpcUrls: string[] & { 0: string };
  infuraId?: string;
  network?: string;
  role?: OfficialWalletType;
};

abstract class BaseProvider {
  protected chainId: number;
  protected contractCaches: Record<string, ethers.Contract> = {};

  constructor(public provider: ethers.providers.JsonRpcProvider, protected redis: RedisService) {}

  async getBalance(address: string) {
    return ethers.utils.formatEther(await this.provider.getBalance(address));
  }

  async getChainId() {
    return this.chainId || (this.chainId = (await this.provider.getNetwork()).chainId);
  }

  getContract(address: string, abi: any) {
    if (!this.contractCaches[address]) {
      this.contractCaches[address] = new ethers.Contract(address, abi, this.provider);
    }
    return this.contractCaches[address];
  }

  async getGasPrice() {
    const rk = formatRedisKey(RK_GAS_PRICE_PREFIX, await this.getChainId());
    const res = await this.redis.get(rk);
    if (res) {
      return +res;
    }
    const gasPrice = (await this.provider.getGasPrice()).toNumber();
    await this.redis.set(rk, gasPrice, 'EX', GAS_PRICE_EXPIRES);
    return gasPrice;
  }

  increaseGasPrice(gasPrice: number, rate = 0.2) {
    let newGasPrice = Math.floor(gasPrice * (1 + rate));
    if (newGasPrice > MAX_GAS_PRICE) {
      newGasPrice = MAX_GAS_PRICE;
    }
    return newGasPrice;
  }

  async checkTransaction(hash: string, confirms = 1) {
    const receipt = await this.provider.waitForTransaction(hash, confirms, TX_TIMEOUT * 1000);
    if (!receipt) {
      throw new TransactionNotMinedError();
    }
    if (receipt.status === 1) {
      return;
    }
    throw new ContractTransactionError(receipt);
  }

  /**
   * 获取交易信息
   * @param hash - 交易hash
   * @returns 交易详情 - 如果为null，则交易被取消。否则交易处于等待挖掘或挖掘成功的状态。等待挖掘的交易，confirmations为0，blockHash和blockNumber为null
   */
  async getTransaction(hash: string) {
    return this.provider.getTransaction(hash);
  }

  async checkTransactionStatus(hash: string): Promise<TransactionStatus> {
    const receipt = await this.provider.waitForTransaction(hash, 0);
    if (!receipt) {
      const transaction = await this.provider.getTransaction(hash);
      if (!transaction) {
        return TransactionStatus.Canceled;
      }
      return TransactionStatus.Waiting;
    }
    if (receipt.status === 1) {
      return TransactionStatus.Success;
    }
    return TransactionStatus.Failed;
  }
}

export class Web3Provider extends BaseProvider {
  provider: ethers.providers.JsonRpcProvider;

  protected contractCaches: Record<string, ethers.Contract> = {};

  constructor(rpcUrl: string, redis: RedisService) {
    super(new ethers.providers.JsonRpcProvider(rpcUrl), redis);
  }
}

export class Web3Client extends BaseProvider {
  private config: Web3ClientConfig;
  private address: string;
  signer: ethers.Signer;
  id: string;

  constructor(config: Web3ClientConfig, redis: RedisService) {
    // const provider = new ethers.providers.InfuraProvider(
    //   config.network,
    //   config.infuraId
    // );

    // const provider = ethers.providers.getDefaultProvider(NETWORK, {
    //   infura: {
    //     projectId: INFURA_PROJECT_ID,
    //   },
    // });

    // const provider = new ethers.providers.StaticJsonRpcProvider(LOCAL_RPC_URL);

    const provider = new ethers.providers.JsonRpcProvider(config.rpcUrls[0]);

    super(provider, redis);

    this.config = config;
    this.signer = new ethers.Wallet(this.config.privateKey, this.provider);

    this.syncNonce();
  }

  async getAddress(): Promise<string> {
    return this.address || (this.address = await this.signer?.getAddress());
  }

  // 发送消息
  async signMessage(msg: string | ethers.utils.Bytes): Promise<string> {
    return await this.signer?.signMessage(msg);
  }

  getContract(address, abi) {
    if (!this.contractCaches[address]) {
      this.contractCaches[address] = new ethers.Contract(address, abi, this.signer || this.provider);
    }
    return this.contractCaches[address];
  }

  async readContractMethod(address: string, abi: any, method: string, params: any[]) {
    const contract = this.getContract(address, abi);
    const value = await contract[method](...params);
    return value;
  }

  async execContractMethod(
    address: string,
    abi: any,
    method: string,
    params: any[],
    override?: {
      gasPrice?: string | number;
      gasLimit?: string | number;
      value?: string | number;
      nonce?: string | number;
    }
  ) {
    const txLock = await this.getTxLock();

    const nonce = (override && override.nonce) || (await this.getOrSyncNonce());

    await txLock.unlock();

    const gasPrice = (override && override.gasPrice) || (await this.getGasPrice());

    const contract = this.getContract(address, abi);

    try {
      const tx = await contract[method](...params, {
        nonce,
        gasPrice,
        ...override,
      });
      return tx;
    } catch (e) {
      if (['NONCE_EXPIRED'].includes(e.code)) {
        this.removeNonceCache(nonce);
      }
      throw e;
    }
  }

  async execContractMethodAndWaitMined(
    address: string,
    abi: any,
    method: string,
    params: any[],
    override?: {
      gasPrice?: string | number;
      gasLimit?: string | number;
      value?: string | number;
      nonce?: string | number;
    }
  ) {
    const tx = await this.execContractMethod(address, abi, method, params, override);

    try {
      await this.checkTransaction(tx.hash);
    } catch (e) {
      if (['TIMEOUT'].includes(e.code)) {
        this.removeNonceCache(tx.nonce);
      }
      throw e;
    }
  }

  // 获取账户余额 ETH
  async getBalance(address?: string) {
    return super.getBalance(address || (await this.getAddress()));
  }

  setId(id: string) {
    this.id = id;
  }

  private async waitNextTick() {
    await new Promise(resolve => {
      process.nextTick(() => resolve(true));
    });
  }

  // 获取交易锁
  private async getTxLock(): Promise<{ unlock: () => Promise<void> }> {
    const rk = formatRedisKey(RK_TX_LOCK_PREFIX, await this.getChainId(), await this.getAddress());
    const id = Math.random().toString();
    const success = await this.redis.set(rk, id, 'EX', RK_TX_LOCK_EXPIRES, 'NX');
    if (success) {
      return {
        unlock: async () => {
          if ((await this.redis.get(rk)) === id) await this.redis.del(rk);
        },
      };
    }
    await this.waitNextTick();
    return this.getTxLock();
  }

  // 获取同步锁
  private async getSyncLock(wait = true): Promise<{ unlock: () => Promise<void> }> {
    const rk = formatRedisKey(RK_SYNC_LOCK_PREFIX, await this.getChainId(), await this.getAddress());
    const id = Math.random().toString();
    const success = await this.redis.set(rk, id, 'EX', RK_SYNC_LOCK_EXPIRES, 'NX');
    if (success) {
      return {
        unlock: async () => {
          if ((await this.redis.get(rk)) === id) await this.redis.del(rk);
        },
      };
    }
    if (!wait) {
      throw new Error('获取同步锁失败，当前锁正在被使用');
    }

    await this.waitNextTick();
    return this.getSyncLock(wait);
  }

  // 等待同步锁解锁
  private async waitSyncLockUnlocked() {
    const rk = formatRedisKey(RK_SYNC_LOCK_PREFIX, await this.getChainId(), await this.getAddress());
    const locked = await this.redis.get(rk);
    if (!locked) {
      return;
    }
    await this.waitNextTick();
    return this.waitSyncLockUnlocked();
  }

  // 获取或同步nonce
  async getOrSyncNonce() {
    await this.waitSyncLockUnlocked();
    const rk = formatRedisKey(RK_NONCE_PREFIX, await this.getChainId(), await this.getAddress());
    const nonceCache = await this.redis.get(rk);
    if (nonceCache) {
      const nonceData = JSON.parse(nonceCache);
      nonceData.nonce += 1;
      await this.redis.set(rk, JSON.stringify(nonceData));
      return nonceData.nonce;
    }
    return this.syncNonce();
  }

  // 同步nonce
  async syncNonce() {
    const rk = formatRedisKey(RK_NONCE_PREFIX, await this.getChainId(), await this.getAddress());
    const { unlock } = await this.getSyncLock();
    const nonce = await this.signer.getTransactionCount();
    await this.redis.set(
      rk,
      JSON.stringify({
        nonce,
        syncTime: Date.now(),
      })
    );
    await unlock();
    return nonce;
  }

  // 删除nonce 缓存 - 在当前nonce无效的情况下执行
  async removeNonceCache(nonce?: number) {
    const rk = formatRedisKey(RK_NONCE_PREFIX, await this.getChainId(), await this.getAddress());
    if (nonce) {
      const nonceCache = await this.redis.get(rk);
      if (nonceCache) {
        const nonceData = JSON.parse(nonceCache);
        if (nonceData.nonce !== nonce) {
          return;
        }
      }
    }
    await this.redis.del(rk);
  }
}
