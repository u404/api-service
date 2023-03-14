import { Inject, Controller, Post, Body } from '@midwayjs/decorator';
import { Context } from '@midwayjs/koa';
import { ILogger } from '@midwayjs/logger';
import { TokenClaimOptions } from '../interface';
import { TokenService } from '../service/token.service';

@Controller('/token')
export class TokenController {
  @Inject()
  ctx: Context;

  @Inject()
  logger: ILogger;

  @Inject()
  tokenService: TokenService;

  // id: number;
  // to: string;
  // balance: number;
  // salt: string;

  /**
   * @api {post} /token/claim 用户claim（服务器转账版）
   * @apiVersion 0.0.0
   * @apiName TokenClaim
   * @apiGroup Token
   * @apiPermission none
   *
   * @apiDescription 用户claim（服务器转账版）
   *
   * @apiParam {Number} chainId 链id
   * @apiParam {String} sourceId 业务id - sourceId是node服务内部幂等/重复校验的依据。在本接口中，可以与id相同。
   * @apiParam {Number} id 业务id - 合约内校验唯一性
   * @apiParam {String} to 目标钱包地址
   * @apiParam {String} balance 金额，支持一定的小数位，如：10.11
   * @apiParam {String} salt 加盐随机数 - 无符号整数形式的字符串，不超过2^256
   *
   * @apiParamExample {json} 请求参数
   * {
   *   "chainId": 80001,
   *   "sourceId": "1",
   *   "id": 1,
   *   "to": "0x12345.....",
   *   "balance": 0.11
   *   "salt": "19734279847923"
   * }
   * @apiSuccess {Boolean}  success       成功或失败：true | false
   * @apiSuccess {Number} code            状态码：成功 200，失败 -1
   * @apiSuccess {String}   message       消息：失败的错误消息
   *
   */
  @Post('/claim')
  async updateTokenURI(@Body() params: TokenClaimOptions) {
    try {
      await this.tokenService.claim(params);
      return { success: true, message: 'OK' };
    } catch (e) {
      this.logger.warn('\n' + JSON.stringify(e, null, 2));
      return {
        success: false,
        errorCode: e.code,
        message: e.message,
      };
    }
  }
}
