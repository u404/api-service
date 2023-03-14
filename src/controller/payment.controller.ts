import { Inject, Controller, Get, Post, Body } from '@midwayjs/decorator';
import { Context } from '@midwayjs/koa';
import { PaymentOrder } from '../interface';
import { PaymentService } from '../service/payment.service';
import { Web3Service } from '../service/web3.service';

@Controller('/payment')
export class PaymentController {
  @Inject()
  ctx: Context;

  @Inject()
  paymentService: PaymentService;

  @Inject()
  web3Service: Web3Service;

  /**
   * @api {post} /payment/wallet/generate 生成一个新的钱包
   * @apiVersion 0.0.0
   * @apiName GenerateWallet
   * @apiGroup Payment
   * @apiPermission none
   *
   * @apiDescription 生成一个新的钱包，记录到数据库中（私钥加密），并返回
   *
   * @apiSuccess {Boolean}  success       成功或失败：true | false
   * @apiSuccess {String}   message       消息：失败的错误消息
   * @apiSuccess {Object}   data          PaymentWallet，付款钱包对象
   * @apiSuccess {Number}   data.id       ID
   * @apiSuccess {String}   data.address  钱包地址
   * @apiSuccess {Boolean}  data.used     是否已使用
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "success": true,
   *     "data": {
   *       id: 1,
   *       address: "0x12345678...",
   *       used: false
   *     }
   *   }
   */

  @Post('/wallet/generate')
  async generateWallet() {
    try {
      const wallet = await this.paymentService.generateWallet();
      delete wallet.privateKeyEncrypted;
      return { success: true, message: 'OK', data: wallet };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  /**
   * @api {get} /payment/wallet/getLastUnused 获取最新创建的未使用的钱包地址
   * @apiVersion 0.0.0
   * @apiName GetLastUnused Wallet
   * @apiGroup Payment
   * @apiPermission none
   *
   * @apiDescription 获取最新创建的未使用的钱包，若为空
   *
   * @apiSuccess {Boolean}  success       成功或失败：true | false
   * @apiSuccess {String}   message       消息：失败的错误消息
   * @apiSuccess {Object}   data          PaymentWallet，付款钱包对象
   * @apiSuccess {Number}   data.id       ID
   * @apiSuccess {String}   data.address  钱包地址
   * @apiSuccess {Boolean}  data.used     是否已使用
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "success": true,
   *     "data": {
   *       id: 1,
   *       address: "0x12345678...",
   *       used: false
   *     }
   *   }
   * @apiSuccessExample {json} Failed-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "success": false,
   *     "message": "未找到最新生成的未使用钱包，请先生成"
   *   }
   */

  @Get('/wallet/getLastUnused')
  async getLastUnusedWallet() {
    try {
      const wallet = await this.paymentService.getLastUnusedPaymentWallet();
      delete wallet.privateKeyEncrypted;
      return { success: true, message: 'OK', data: wallet };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  /**
   * @api {post} /payment/transferPayments 向多个钱包地址批量转账付款
   * @apiVersion 0.0.0
   * @apiName TransferPayments
   * @apiGroup Payment
   * @apiPermission none
   *
   * @apiDescription 向多个钱包地址批量转账付款
   *
   * @apiParam {Number} chainId 链id
   * @apiParam {String} payAddress 付款钱包地址，必须是服务器生成的临时钱包
   * @apiParam {String} sourceId 业务单id
   * @apiParam {Object[]} list 转账列表
   * @apiParam {String} list.account 收款钱包地址
   * @apiParam {String} list.value 收款金额，实数类型，如：100.01
   *
   * @apiParamExample {json} 请求参数
   * {
   *   "chainId": 80001,
   *   "payAddress": "0xabcd.....",
   *   "sourceId": "123",
   *   "list": [
   *     { account: "0x49abc...", value: 100.01 },
   *     { account: "0x0000abc...", value: 99.01 },
   *   ]
   * }
   * @apiSuccess {Boolean}  success       成功或失败：true | false
   * @apiSuccess {Number}   code       成功或失败：200 | -1
   * @apiSuccess {Object}   data       数据对象，成功或失败都会返回该对象，但某些失败的情况，其中的字段可能为空
   * @apiSuccess {String}   data.hash       交易的hash，仅限交易被发送成功时
   * @apiSuccess {String}   data.url       交易的查看地址，仅限交易被发送成功时
   * @apiSuccess {String}   message       消息：失败的错误消息
   *
   */

  @Post('/transferPayments')
  async transferPayments(@Body() paymentOrder: PaymentOrder) {
    try {
      const data = await this.paymentService.transferPayments(paymentOrder);
      return { success: true, message: 'OK', data: { ...data, url: this.web3Service.getTransactionUrl(paymentOrder.chainId, data.hash) } };
    } catch (e) {
      return {
        success: false,
        message: e.message,
        data: { ...e.data, url: this.web3Service.getTransactionUrl(paymentOrder.chainId, e.data && e.data.hash) },
      };
    }
  }
}
