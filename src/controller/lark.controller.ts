import { Inject, Controller, Post, Body } from '@midwayjs/decorator';
import { Context } from '@midwayjs/koa';
import { LarkService } from '../service/lark.service';

@Controller('/lark')
export class LarkController {
  @Inject()
  ctx: Context;

  @Inject()
  larkService: LarkService;

  @Post('/sendMessage')
  async sendMessage(@Body() params) {
    try {
      const data = await this.larkService.sendMessage(params.message);
      return { success: true, code: 200, message: 'OK', data };
    } catch (e) {
      return { success: false, code: -1, message: e.message };
    }
  }

  @Post('/sendPost')
  async sendPost(@Body() params) {
    try {
      const data = await this.larkService.sendPost(params.title, params.content);
      return { success: true, code: 200, message: 'OK', data };
    } catch (e) {
      return { success: false, code: -1, message: e.message };
    }
  }

  @Post('/sendSimplePost')
  async sendSimplePost(@Body() params) {
    try {
      const data = await this.larkService.sendSimplePost(params.title, params.content, params.link, params.linkText);
      return { success: true, code: 200, message: 'OK', data };
    } catch (e) {
      return { success: false, code: -1, message: e.message };
    }
  }
}
