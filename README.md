# my_midway_project

## 快速入门

<!-- 在此次添加使用文档 -->

如需进一步了解，参见 [midway 文档][midway]。

### 本地开发

```bash
$ npm i
$ npm run dev
$ open http://localhost:7001/
```

### 部署
需要全局安装pm2：

```bash
npm install pm2 -g
```

相应环境需要配置环境变量 NODE_ENV 为以下值：
- dev环境：NODE_ENV=dev
- test环境：NODE_ENV=test
- pre环境：NODE_ENV=pre
- prod环境：NODE_ENV=prod

```bash
$ npm run deploy
```

### 内置指令

- 使用 `npm run lint` 来做代码风格检查。
- 使用 `npm test` 来执行单元测试。


[midway]: https://midwayjs.org
