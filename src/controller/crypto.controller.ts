import { Inject, Controller, Get, Query } from '@midwayjs/decorator';
import { Context } from '@midwayjs/koa';
import crypto from '../lib/crypto';

@Controller('/crypto')
export class CryptoController {
  @Inject()
  ctx: Context;

  @Get('/aesEncrypt')
  async aesEncrypt(@Query() query) {
    try {
      const t = crypto.aesEncrypt(query.text, query.key, query.iv);
      return { success: true, message: 'OK', data: t };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  @Get('/aesDecrypt')
  async aesDecrypt(@Query() query) {
    try {
      const t = crypto.aesDecrypt(query.text, query.key, query.iv);
      return { success: true, message: 'OK', data: t };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }
}
