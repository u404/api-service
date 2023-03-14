import { Inject, Controller, Get, Query } from '@midwayjs/decorator';
import { Context } from '@midwayjs/koa';
import walletUtils from '../lib/web3/walletUtils';
import { Web3Service } from '../service/web3.service';

@Controller('/web3')
export class Web3Controller {
  @Inject()
  ctx: Context;

  @Inject()
  web3Service: Web3Service;

  /**
   * @api {get} /web3/getBalance 获取钱包余额
   * @apiVersion 0.0.0
   * @apiName GetBalance
   * @apiGroup Web3
   * @apiPermission none
   *
   * @apiParam {Number} chainId 链id
   * @apiParam {String} address 钱包地址
   *
   * @apiParamExample {json} 请求参数
   * {
   *   "chainId": 80001,
   *   "address": "0x30a6c2AD0D90AE07387D44c6a8b525eb348034c8",
   * }
   *
   * @apiDescription 获取钱包余额
   *
   * @apiSuccess {Boolean}  success       成功或失败：true | false
   * @apiSuccess {String}   message       消息：失败的错误消息
   * @apiSuccess {Object}   data          余额数据
   * @apiSuccess {Number}   data.coin     原生币余额 - 这里是MATIC
   * @apiSuccess {Number}  data.erc20    erc20代币余额 - 这里是USDC
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "success": true,
   *     "code": 200,
   *     "data": {
   *       coin: 100.01,
   *       erc20: 100.23
   *     }
   *   }
   */

  @Get('/getBalance')
  async getBalance(@Query() { chainId, address }: { chainId: number; address: string }) {
    try {
      const [coin, erc20] = await Promise.all([
        this.web3Service.getBalance(chainId, address),
        this.web3Service.getErc20Balance(chainId, address),
      ]);
      await this.web3Service.getBalance(chainId, address);
      return { success: true, code: 200, message: 'OK', data: { coin, erc20 } };
    } catch (e) {
      return { success: false, code: -1, message: e.message };
    }
  }

  @Get('/checkTransaction')
  async checkTransactionState(@Query() { chainId, hash }: { chainId: number; hash: string }) {
    try {
      const data = await this.web3Service.checkTransaction(chainId, hash);
      return { success: true, message: 'OK', data };
    } catch (e) {
      return { success: false, message: e.message, code: e.code };
    }
  }

  @Get('/getTransaction')
  async getTransaction(@Query() { chainId, hash }: { chainId: number; hash: string }) {
    try {
      const data = await this.web3Service.getTransaction(chainId, hash);
      return { success: true, message: 'OK', data };
    } catch (e) {
      return { success: false, message: e.message, code: e.code };
    }
  }

  @Get('/generateWallet')
  async generateWallet(@Query('startsWith') startsWith) {
    try {
      const wallet = startsWith ? walletUtils.generateVanityAddress(new RegExp(`^${startsWith}`)) : walletUtils.generate();
      return { success: true, data: wallet };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }
}
