import { Inject, Controller, Get, Post, Body, Query } from '@midwayjs/decorator';
import { Context } from '@midwayjs/koa';
import { ILogger } from '@midwayjs/logger';
import { GetArtistCreatingSignatureParams, MintAndTransferParams, SafeTransferFromParams, UpdateTokenURIParams } from '../interface';
import { NftService } from '../service/nft.service';

@Controller('/nft')
export class NftController {
  @Inject()
  ctx: Context;

  @Inject()
  logger: ILogger;

  @Inject()
  nftService: NftService;

  /**
   * @api {post} /nft/mintAndTransfer 转移或铸造NFT到指定地址
   * @apiVersion 0.0.0
   * @apiName MintAndTransfer
   * @apiGroup NFT
   * @apiPermission none
   *
   * @apiDescription 为指定地址转移或铸造NFT，若NFT不存在则铸造，存在则转移，注意：转移时必须拥有该NFT的权限
   *
   * @apiParam {String} sourceId 业务id - 可以防止重复执行
   * @apiParam {Number} chainId 链id
   * @apiParam {String} address 合约地址
   * @apiParam {String} from NFT来源钱包地址
   * @apiParam {String} to NFT接收钱包地址
   * @apiParam {Object} data NFT数据
   * @apiParam {String} data.tokenId NFT tokenId.
   * @apiParam {String} data.tokenURI NFT tokenURI.
   * @apiParam {Object[]} data.creators NFT 创作者列表.
   * @apiParam {string} data.creators.account NFT creator 钱包地址.
   * @apiParam {number} data.creators.value NFT creator 创作权占比.
   * @apiParam {Object[]} data.royalties NFT 二次销售分账列表.
   * @apiParam {string} data.royalties.account NFT 分账人 钱包地址.
   * @apiParam {number} data.royalties.value NFT 分账人 占比.
   * @apiParam {String[]} data.signatures 数据签名.
   *
   * @apiParamExample {json} 请求参数
   * {
   *   "sourceId": "123",
   *   "chainId": 80001,
   *   "address": "0x30a6c2AD0D90AE07387D44c6a8b525eb348034c8",
   *   "data": {
   *     "tokenId": "23068060369037911579060055090953976922155136506766866534061462943149236161579",
   *     "tokenURI": "https://bafybeibqzlm7yo7gew3kzwkanyswy5mx65cgacon6vydylm26b7wh74zoe.ipfs.nftstorage.link/8690ACEE-F9D4-495C-BFBB-2378A5A6E4A6.json",
   *     "creators": [
   *         {
   *           "account": "0x33000f3a0d79ed0b252f7a95241229c0d75ff597",
   *           "value": 10000
   *         }
   *     ],
   *     "royalties": [
   *           {
   *           "account": "0x33000f3a0d79ed0b252f7a95241229c0d75ff597",
   *           "value": 1000
   *           }
   *     ],
   *     "signatures": []
   *   },
   *   "from": "0x33000f3a0d79ed0b252f7a95241229c0d75ff597",
   *   "to": "0x494A93612a9654A4161fd5eBad4c1b8F30dB3D8E"
   * }
   * @apiSuccess {Boolean}  success       成功或失败：true | false
   * @apiSuccess {String}   message       消息：失败的错误消息
   *
   */

  @Post('/mintAndTransfer')
  async mintAndTrasfer(@Body() params: MintAndTransferParams) {
    try {
      await this.nftService.mintAndTransfer(params);
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
  /**
   * @api {post} /nft/safeTransferFrom 代理操作转移NFT
   * @apiVersion 0.0.0
   * @apiName SafeTransferFrom
   * @apiGroup NFT
   * @apiPermission none
   *
   * @apiDescription 将NFT从from钱包转移到to钱包，from钱包已经授予了服务器钱包approve权限
   *
   * @apiParam {Number} chainId 链id
   * @apiParam {String} address 合约地址
   * @apiParam {String} from NFT来源钱包地址
   * @apiParam {String} to NFT接收钱包地址
   * @apiParam {String} tokenId NFT tokenId.
   *
   * @apiParamExample {json} 请求参数
   * {
   *   "chainId": 80001,
   *   "address": "0x30a6c2AD0D90AE07387D44c6a8b525eb348034c8",
   *   "from": "0x33000f3a0d79ed0b252f7a95241229c0d75ff597",
   *   "to": "0x494A93612a9654A4161fd5eBad4c1b8F30dB3D8E",
   *   "tokenId": "12345"
   * }
   * @apiSuccess {Boolean}  success       成功或失败：true | false
   * @apiSuccess {String}   message       消息：失败的错误消息
   *
   */

  @Post('/safeTransferFrom')
  async safeTransferFrom(@Body() params: SafeTransferFromParams) {
    try {
      await this.nftService.safeTransferFrom(params);
      return { success: true, message: 'OK' };
    } catch (e) {
      this.logger.warn('\n' + JSON.stringify(e, null, 2));
      return {
        success: false,
        errorCode: e.code,
        message: e?.message,
      };
    }
  }

  /**
   * @api {post} /nft/updateTokenURI 更新某个nft的tokenURI
   * @apiVersion 0.0.0
   * @apiName UpdateTokenURI
   * @apiGroup NFT
   * @apiPermission none
   *
   * @apiDescription 更新某个nft的tokenURI
   *
   * @apiParam {Number} chainId 链id
   * @apiParam {String} sourceId 业务id - 可以防止重复执行
   * @apiParam {String} address 合约地址
   * @apiParam {String} tokenId NFT tokenId
   * @apiParam {String} tokenURI NFT tokenURI
   *
   * @apiParamExample {json} 请求参数
   * {
   *   "chainId": 80001,
   *   "sourceId": "1",
   *   "address": "0x30a6c2AD0D90AE07387D44c6a8b525eb348034c8",
   *   "tokenId": "1234....",
   *   "tokenURI": "ipfs://xxxxxx...."
   * }
   * @apiSuccess {Boolean}  success       成功或失败：true | false
   * @apiSuccess {String}   message       消息：失败的错误消息
   *
   */
  @Post('/updateTokenURI')
  async updateTokenURI(@Body() params: UpdateTokenURIParams) {
    try {
      await this.nftService.updateTokenURI(params);
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

  @Get('/getInfo')
  async getInfo(@Query() params: any) {
    try {
      const data = await this.nftService.getInfo(params.chainId, params.role);
      return { success: true, message: 'OK', data };
    } catch (e) {
      return { success: false, errorCode: e.code, message: e.message };
    }
  }

  /**
   * @api {get} /nft/getArtistCreatingSignature 获取音乐人创建合约时的必要签名，用于执行合约
   * @apiVersion 0.0.0
   * @apiName Get Artist Creating Signature
   * @apiGroup NFT
   * @apiPermission none
   * @apiDescription 获取音乐人创建合约时的必要签名，用于执行合约
   *
   * @apiParam {Number} chainId 链id
   * @apiParam {String} deployer 音乐人钱包地址（执行合约的钱包地址）
   *
   * @apiParamExample {json} 请求参数
   * {
   *   "chainId": 80001,
   *   "deployer": "0x30a6c2AD0D90AE07387D44c6a8b525eb348034c8",
   * }
   *
   * @apiSuccess {Boolean}  success       成功或失败：true | false
   * @apiSuccess {String}   message       消息：失败的错误消息
   * @apiSuccess {String}   data          签名signature
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "success": true,
   *     "data": "0x12345678abcdef............."
   *   }
   */
  @Get('/getArtistCreatingSignature')
  async getArtistCreatingSignature(@Query() params: GetArtistCreatingSignatureParams) {
    try {
      const signature = await this.nftService.getArtistCreatingSignature(params);
      return { success: true, message: 'OK', data: signature };
    } catch (e) {
      return { success: false, errorCode: e.code, message: e.message };
    }
  }
}
