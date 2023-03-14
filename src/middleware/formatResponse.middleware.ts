import { IMiddleware } from '@midwayjs/core';
import { Middleware } from '@midwayjs/decorator';
import { NextFunction, Context } from '@midwayjs/koa';

@Middleware()
export class FormatResponseMiddleware implements IMiddleware<Context, NextFunction> {
  resolve() {
    return async (ctx: Context, next: NextFunction) => {
      const result = await next();
      if (result) {
        if (result.success === true) {
          result.code = result.code || 200;
        } else if (result.success === false) {
          result.code = result.code || -1;
        }
      }
      return result;
    };
  }

  static getName(): string {
    return 'formatResponse';
  }
}
