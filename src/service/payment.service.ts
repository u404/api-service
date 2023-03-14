import { Provide, Inject, Config } from '@midwayjs/decorator';
import { RedisService } from '@midwayjs/redis';
import { ILogger } from '@midwayjs/logger';
import { PaymentWallet } from '../entity/PaymentWallet.entity';
import { Transaction } from '../entity/Transaction.entity';
import { TransactionService } from './transaction.service';
import { LarkService } from './lark.service';
import { Web3Service } from './web3.service';
import { PaymentOrder, TransactionState, TransactionType } from '../interface';
import { ContractTransactionError, TransactionStatus, Web3Client } from '../lib/web3';
import walletUtils from '../lib/web3/walletUtils';
import { utils, BigNumber } from 'ethers';
import { ERC20 } from '@soundsright/contracts';
import * as PaymentABI from '../lib/web3/abi/Payment.abi.json';

const REDIS_KEY_LAST_UNUSED_PAYMENT_WALLET = 'lastUnusedPaymentWallet';

@Provide()
export class PaymentService {
  @Inject()
  redis: RedisService;

  @Inject()
  transactionService: TransactionService;

  @Inject()
  larkService: LarkService;

  @Inject()
  web3Service: Web3Service;

  @Inject()
  logger: ILogger;

  @Config('web3Config')
  web3Config;

  async generateWallet() {
    const wallet = walletUtils.generate();

    const res = await PaymentWallet.create({
      address: wallet.address,
      privateKeyEncrypted: walletUtils.encrypt(wallet.privateKey),
    });

    const paymentWallet = res.toJSON() as PaymentWallet;

    return paymentWallet;
  }

  async getLastUnusedPaymentWallet() {
    const paymentWallet = await PaymentWallet.findOne({
      order: [['id', 'DESC']],
    });
    if (!paymentWallet || paymentWallet.used) {
      throw new Error('未找到最新生成的未使用钱包，请先生成');
    }

    return paymentWallet.toJSON();
  }

  async getPaymentWalletByAddress(address: string) {
    const paymentWallet = await PaymentWallet.findOne({
      where: { address },
    });
    if (!paymentWallet) {
      throw new Error(`未找到地址为：${address}的钱包`);
    }

    return paymentWallet;
  }

  async setPaymentWalletUsed(address: string) {
    const redisValue = await this.redis.get(REDIS_KEY_LAST_UNUSED_PAYMENT_WALLET);
    if (redisValue) {
      const paymentWallet: PaymentWallet = JSON.parse(redisValue);
      if (paymentWallet.address === address) {
        await this.redis.del(REDIS_KEY_LAST_UNUSED_PAYMENT_WALLET);
      }
    }
    const res = await PaymentWallet.update({ used: true }, { where: { address } });
    console.log(res);
  }

  getWalletPrivateKey(privateKeyEncrypted: string) {
    return walletUtils.decrypt(privateKeyEncrypted);
  }

  private async approveErc20(contract: any, account: string, spender: string, amount: BigNumber, gasPrice: number) {
    const allowance = BigNumber.from(await contract.allowance(account, spender));

    const maxAmount = BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

    if (allowance.lt(amount)) {
      await contract.approve(spender, maxAmount, {
        gasPrice,
      });
    }
  }

  private async getWeb3ClientByPayAddress(chainId: number, payAddress: string) {
    const { rpcUrl } = this.web3Config.chainConfigs[chainId];
    const paymentWallet = await this.getPaymentWalletByAddress(payAddress);

    const privateKey = this.getWalletPrivateKey(paymentWallet.privateKeyEncrypted);

    return new Web3Client({ privateKey, rpcUrls: [rpcUrl] }, this.redis);
  }

  async transferPayments(paymentOrder: PaymentOrder) {
    const { chainId, payAddress, sourceId, list } = paymentOrder;

    const type = TransactionType.PaymentToMusicer; // 当前交易类型：固定值

    if (!(await this.transactionService.setLock(chainId, type, sourceId))) {
      throw new Error('执行失败：检测到相同的请求正在执行，请勿重复操作');
    }

    let transaction: Transaction = undefined;
    let tx = undefined;

    try {
      const { paymentAddress, usdcAddress } = this.web3Config.chainConfigs[chainId];

      const web3Client = await this.getWeb3ClientByPayAddress(chainId, payAddress);

      const balance = await web3Client.provider.getBalance(payAddress);
      if (balance.lte(0)) {
        throw new Error('执行失败：钱包中没有ETH/MATIC支付Gas');
      }

      const records = await this.transactionService.findAllRecordByTypeAndSourceId(chainId, type, sourceId);

      const validRecords = records.filter(r => r.state !== TransactionState.SendFailed && r.state !== TransactionState.Failed);

      let replaceTransaction: Transaction = undefined;

      if (validRecords.length) {
        const lastRecord = validRecords[0];

        if (payAddress !== lastRecord.trader) {
          throw new Error('执行失败：付款地址与上次操作不一致');
        }
        if (lastRecord.state === TransactionState.Created) {
          throw new Error('执行失败：检测到存在未知状态的同一笔交易，请联系技术确认');
        }
        const successRecord = validRecords.find(r => r.state === TransactionState.Success);
        if (successRecord) {
          return successRecord.toJSON<Transaction>();
        }

        // 查询已发送的所有交易的状态
        const sendedRecords = validRecords.filter(r => r.state === TransactionState.Sended);
        if (sendedRecords.length) {
          let successRecord: Transaction = null;
          await Promise.all(
            sendedRecords.map(async r => {
              const status = await web3Client.checkTransactionStatus(r.hash);
              if (status === TransactionStatus.Success) {
                successRecord = await r.update({ state: TransactionState.Success });
              } else if (status === TransactionStatus.Failed) {
                const err = new ContractTransactionError(null);
                await r.update({ state: TransactionState.Failed, errorCode: err.code, errorMessage: err.message });
              } else if (status === TransactionStatus.Canceled) {
                await r.update({ state: TransactionState.SendFailed, errorCode: 'TRANSACTION_CANCELED', errorMessage: '' });
              }
            })
          );
          if (successRecord) {
            return successRecord.toJSON<Transaction>();
          }
          replaceTransaction = sendedRecords[0];
        }
      }

      const contract = web3Client.getContract(paymentAddress, PaymentABI);

      const erc20Contract = web3Client.getContract(usdcAddress, ERC20);

      const decimals = await erc20Contract.decimals();

      const addressList = [];
      const amountList = [];
      let amountTotal = BigNumber.from(0);

      list.forEach(item => {
        addressList.push(item.account);
        const bn = utils.parseUnits(String(item.value), decimals);
        amountList.push(bn.toString());
        amountTotal = amountTotal.add(bn);
      });

      const erc20Balance: BigNumber = await erc20Contract.balanceOf(payAddress);

      if (erc20Balance.lt(amountTotal)) {
        throw new Error('执行失败：钱包中的ERC20余额不足，无法完成付款');
      }

      let gasPrice = await web3Client.getGasPrice();

      await this.approveErc20(erc20Contract, payAddress, paymentAddress, amountTotal, gasPrice);

      const replaceGasPrice = replaceTransaction ? web3Client.increaseGasPrice(replaceTransaction.gasPrice) : 0;
      if (gasPrice < replaceGasPrice) {
        gasPrice = replaceGasPrice;
      }

      const nonce = replaceTransaction && replaceTransaction.nonce;

      const params = [payAddress, addressList, amountList];

      transaction = await this.transactionService.create({
        chainId,
        type,
        sourceId,
        trader: payAddress,
        params: JSON.stringify(params),
      });

      try {
        tx = await contract.batchTransferFrom(payAddress, addressList, amountList, {
          gasPrice,
          gasLimit: 70000 + addressList.length * 15000,
          nonce,
        });
      } catch (e) {
        const updateData: any = { gasPrice, state: TransactionState.SendFailed, errorCode: e.code, errorMessage: e.message };
        if (nonce) {
          updateData.nonce = nonce;
        }
        transaction = await transaction.update(updateData);
        throw e;
      }

      transaction = await transaction.update({
        nonce: tx.nonce,
        hash: tx.hash,
        gasPrice,
        state: TransactionState.Sended,
        detail: JSON.stringify(tx),
      });

      await web3Client.checkTransaction(tx.hash).catch(async e => {
        const errorCode = e.code;
        const errorMessage = e.message;
        if (e.code === 'CONTRACT_TRANSACTION_ERROR') {
          transaction.update({ state: TransactionState.Failed, errorCode, errorMessage });
        } else if (e.code === 'TIMEOUT') {
          e.message = '查询超时：交易已发送，但无法确认链上状态';
        }
        throw e;
      });

      transaction = await transaction.update({ state: TransactionState.Success });

      await this.setPaymentWalletUsed(payAddress);
    } catch (err) {
      err.data = transaction && transaction.toJSON<Transaction>();
      const errInfo = JSON.stringify({ name: err.name, code: err.code, message: err.message }, null, 2);
      const paramInfo = JSON.stringify(paymentOrder, null, 2);
      const transactionInfo = JSON.stringify(transaction || {}, null, 2);
      this.logger.error(`TransferPayments 方法执行失败，错误信息：\n${errInfo}\n入参：${paramInfo}\n交易信息：\n${transactionInfo}`);
      this.larkService
        .sendSingleTagLinePost(`交易执行失败 - ${TransactionType[type]}`, [
          {
            tag: 'text',
            text: `错误信息：${err.message}`,
          },
          {
            tag: 'text',
            text: JSON.stringify(transaction ? { ...transaction.toJSON(), detail: '' } : {}, null, 2),
          },
          tx.hash && {
            tag: 'a',
            text: `交易信息：${tx.hash}`,
            href: this.web3Service.getTransactionUrl(chainId, tx.hash),
          },
        ])
        .catch(() => {});
      throw err;
    } finally {
      await this.transactionService.setUnlock(chainId, type, sourceId);
    }

    return transaction.toJSON<Transaction>();
  }
}
