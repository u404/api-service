import { Provide, Inject } from '@midwayjs/decorator';
import { RedisService } from '@midwayjs/redis';
import { ILogger } from '@midwayjs/logger';
import { Transaction } from '../entity/Transaction.entity';
import { TransactionExecuteOptions, TransactionState, TransactionType, Web3Manager } from '../interface';
import { ContractTransactionError, TransactionStatus } from '../lib/web3';
import { LarkService } from './lark.service';
import { Web3Service } from './web3.service';

const RK_TRANSACTION_LOCK_KEY_PREFIX = 'transaction_lock';
const RK_TRANSACTION_LOCK_EXPIRES = 10 * 60;

@Provide()
export class TransactionService {
  @Inject()
  redis: RedisService;

  @Inject()
  logger: ILogger;

  @Inject()
  larkService: LarkService;

  @Inject()
  web3Service: Web3Service;

  @Inject('web3')
  web3: Web3Manager;

  async findLastRecordByChainIdAndTypeAndSourceId(chainId: number, type: TransactionType, sourceId: string) {
    const record = await Transaction.findOne({
      where: { chainId, type, sourceId },
      order: [['updatedAt', 'DESC']],
    });
    return record;
  }

  async findAllRecordByTypeAndSourceId(chainId: number, type: TransactionType, sourceId: string) {
    const record = await Transaction.findAll({
      where: { chainId, type, sourceId },
      order: [['updatedAt', 'DESC']],
    });
    return record;
  }

  async create({
    chainId,
    type,
    sourceId,
    trader,
    params,
  }: {
    chainId: number;
    type: TransactionType;
    sourceId: string;
    trader: string;
    params: string;
  }) {
    const transaction = await Transaction.create({ chainId, type, sourceId, trader, params, state: 0 });
    return transaction;
  }

  async update(id: number, data: { nonce?: number; hash?: string; gasPrice?: number; state: TransactionState; detail?: string }) {
    await Transaction.update(data, {
      where: { id },
    });
  }

  private getLockKey(chainId: number, type: TransactionType, sourceId: string) {
    return `${RK_TRANSACTION_LOCK_KEY_PREFIX}_${chainId}_${type}_${sourceId}`;
  }

  async setLock(chainId: number, type: TransactionType, sourceId: string) {
    const success = await this.redis.set(this.getLockKey(chainId, type, sourceId), 1, 'EX', RK_TRANSACTION_LOCK_EXPIRES, 'NX');
    if (success === 'OK') {
      return true;
    }
    return false;
  }

  async setUnlock(chainId: number, type: TransactionType, sourceId: string) {
    await this.redis.del(this.getLockKey(chainId, type, sourceId));
  }

  async execute({ chainId, type, sourceId, handler, onHistryRecordExisted }: TransactionExecuteOptions) {
    if (!(await this.setLock(chainId, type, sourceId))) {
      throw new Error('Execution failed: Detected that the same request is being executed, do not repeat the operation.');
    }

    let transaction: Transaction = undefined;
    let tx = undefined;

    try {
      const web3Provider = this.web3[chainId].provider;

      const records = await this.findAllRecordByTypeAndSourceId(chainId, type, sourceId);

      let validRecords = records.filter(r => r.state !== TransactionState.SendFailed && r.state !== TransactionState.Failed);

      let replaceTransaction: Transaction = undefined;

      if (validRecords.length) {
        if (onHistryRecordExisted) {
          validRecords = await onHistryRecordExisted(validRecords);
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
              const status = await web3Provider.checkTransactionStatus(r.hash);
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

      let gasPrice = await web3Provider.getGasPrice();

      const replaceGasPrice = replaceTransaction ? web3Provider.increaseGasPrice(replaceTransaction.gasPrice) : 0;
      if (gasPrice < replaceGasPrice) {
        gasPrice = replaceGasPrice;
      }

      const nonce = replaceTransaction && replaceTransaction.nonce;

      const { trader, params, sendTransaction } = await handler({ gasPrice, nonce });

      transaction = await this.create({
        chainId,
        type,
        sourceId,
        trader,
        params: JSON.stringify(params),
      });

      try {
        tx = await sendTransaction();
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

      await web3Provider.checkTransaction(tx.hash).catch(async e => {
        const errorCode = e.code;
        const errorMessage = e.message;
        if (e.code === 'CONTRACT_TRANSACTION_ERROR') {
          transaction.update({ state: TransactionState.Failed, errorCode, errorMessage });
        } else if (e.code === 'TIMEOUT') {
          e.message = 'Query Timeout: The transaction was sent, but the on-chain status could not be confirmed.';
        }
        throw e;
      });

      transaction = await transaction.update({ state: TransactionState.Success });
    } catch (err) {
      err.data = transaction && transaction.toJSON<Transaction>();
      this.logger.error(
        `交易执行失败，错误信息：\n${JSON.stringify(
          { name: err.name, code: err.code, message: err.message },
          null,
          2
        )}\n交易信息：\n${JSON.stringify(transaction || {}, null, 2)}`
      );
      err.message = err.message.split(/ \[| \(/)[0];

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
      await this.setUnlock(chainId, type, sourceId);
    }

    return transaction.toJSON<Transaction>();
  }
}
