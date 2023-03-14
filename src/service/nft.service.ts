import { Provide, Inject } from '@midwayjs/decorator';
import { ERC721Lyrra } from '@soundsright/contracts';
import {
  GetArtistCreatingSignatureParams,
  MintAndTransferParams,
  OfficialWalletType,
  SafeTransferFromParams,
  TransactionType,
  UpdateTokenURIParams,
  Web3Manager,
} from '../interface';
import { keccak256, encodePacked, getVRS, toBytes } from '../lib/web3/web3Utils';
import { TransactionService } from './transaction.service';

@Provide()
export class NftService {
  @Inject('web3')
  web3: Web3Manager;

  @Inject()
  transactionService: TransactionService;

  async getInfo(chainId: number, role: OfficialWalletType = OfficialWalletType.ContractExecutor) {
    const chainClient = this.web3[chainId].clients[role];
    const [id, address, balance] = await Promise.all([chainClient.id, chainClient.getAddress(), chainClient.getBalance()]);

    return {
      id,
      address,
      chainId,
      balance,
    };
  }

  async mintAndTransfer({ sourceId, chainId, address, data, from, to }: MintAndTransferParams) {
    const type = TransactionType.MintAndTransferNFT; // 当前交易类型：固定值

    const web3Client = this.web3[chainId].clients[OfficialWalletType.ContractExecutor];

    await this.transactionService.execute({
      chainId,
      type,
      sourceId,
      handler: async ({ gasPrice, nonce }) => {
        const params = [data, from, to];

        const sendTransaction = () =>
          web3Client.execContractMethod(address, ERC721Lyrra, 'transferFromOrMint', params, {
            gasPrice,
            nonce,
            gasLimit: 600000,
          });

        return { trader: await web3Client.getAddress(), params, sendTransaction };
      },
    });
  }

  async safeTransferFrom({ chainId, nftAddress, from, to, tokenId }: SafeTransferFromParams) {
    const web3Client = this.web3[chainId].clients[OfficialWalletType.ContractExecutor];

    try {
      await web3Client.execContractMethodAndWaitMined(
        nftAddress,
        ERC721Lyrra,
        'safeTransferFrom(address,address,uint256)',
        [from, to, tokenId],
        {
          gasLimit: 600000,
        }
      );
    } catch (e) {
      if (e && e.code === 'CONTRACT_TRANSACTION_ERROR') {
        try {
          const account = await web3Client.readContractMethod(nftAddress, ERC721Lyrra, 'ownerOf', [tokenId]);
          if (String(account).toLowerCase() === String(to).toLowerCase()) {
            return;
          }
        } catch (e) {}
      }
      throw e;
    }
  }

  async updateTokenURI({ chainId, sourceId, address, tokenId, tokenURI }: UpdateTokenURIParams) {
    const type = TransactionType.UpdateNFT; // 当前交易类型：固定值

    const web3Client = this.web3[chainId].clients[OfficialWalletType.ContractExecutor];

    await this.transactionService.execute({
      chainId,
      type,
      sourceId,
      handler: async ({ gasPrice, nonce }) => {
        const k1 = keccak256(tokenURI);
        const k2 = keccak256(encodePacked(['address', 'uint256', 'bytes32'], [address, tokenId, k1]), 'bytes');
        const k3 = toBytes(k2);

        const signature = await web3Client.signMessage(k3);
        const { v, r, s } = getVRS(signature);

        const params = [tokenId, tokenURI, v, r, s];

        const sendTransaction = () =>
          web3Client.execContractMethod(address, ERC721Lyrra, 'setSkuWinner', params, {
            gasPrice,
            nonce,
            gasLimit: 600000,
          });

        return { trader: await web3Client.getAddress(), params, sendTransaction };
      },
    });
  }

  async getArtistCreatingSignature({ chainId, deployer }: GetArtistCreatingSignatureParams) {
    const web3Client = this.web3[chainId].clients[OfficialWalletType.NftFactoryAdmin];

    const domain = {
      chainId,
    };

    const types = {
      Deployer: [{ name: 'wallet', type: 'address' }],
    };

    const value = {
      wallet: deployer,
    };

    const signature = (web3Client.signer as any)._signTypedData(domain, types, value);

    return signature;
  }
}
