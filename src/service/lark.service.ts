import { Provide, App, Config } from '@midwayjs/decorator';
import { makeHttpRequest } from '@midwayjs/core';
import { Application } from '@midwayjs/koa';

export type LarkMessageType = 'text' | 'post' | 'image' | 'share_chat' | 'interactive';

export type LarkPostTextTag = {
  tag: 'text';
  text: string;
  un_escape?: boolean;
};

export type LarkPostLinkTag = {
  tag: 'a';
  text: string;
  href: string;
};

export type LarkPostImageTag = {
  tag: 'img';
  image_key: string;
  width: number;
  height: number;
};

export type LarkPostTag = LarkPostTextTag | LarkPostLinkTag | LarkPostImageTag;

export type LarkPostContent = LarkPostTag[][];

@Provide()
export class LarkService {
  @Config('lark')
  larkConfig;

  @App()
  app: Application;

  private async sendWebhookMessage(messageType: LarkMessageType, content: object) {
    if (!this.larkConfig.enabled) return;
    const { data } = await makeHttpRequest(this.larkConfig.webhook, {
      method: 'POST',
      contentType: 'json',
      data: {
        msg_type: messageType,
        content,
      },
      dataType: 'json',
    });
    if (data.code && data.code > 0) {
      throw new Error(data.msg);
    }
  }

  async sendMessage(message: string) {
    return this.sendWebhookMessage('text', {
      text: `【${this.app.getEnv()}】${message}`,
    });
  }

  async sendPost(title: string, content: LarkPostContent) {
    return this.sendWebhookMessage('post', {
      post: {
        zh_cn: {
          title: `【${this.app.getEnv()}】${title}`,
          content,
        },
      },
    });
  }

  async sendSingleTagLinePost(title: string, tags: LarkPostTag[]) {
    return this.sendPost(
      title,
      tags.filter(Boolean).map(tag => [tag])
    );
  }

  async sendSimplePost(title: string, content: string, link: string, linkText = '') {
    return this.sendSingleTagLinePost(title, [
      {
        tag: 'text',
        text: content,
      },
      {
        tag: 'a',
        text: linkText || link,
        href: link,
      },
    ]);
  }
}
