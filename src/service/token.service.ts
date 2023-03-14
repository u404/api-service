import { Provide, Inject, Config } from '@midwayjs/decorator';
import * as CapitalDepot from '../lib/web3/abi/CapitalDepot.json';
import { TokenClaimOptions, TransactionType, Web3Manager, OfficialWalletType } from '../interface';
import { keccak256, encodePacked, getVRS, toBytes } from '../lib/web3/web3Utils';
import { TransactionService } from './transaction.service';
import { ERC20 } from '@soundsright/contracts';
import { utils } from 'ethers';

@Provide()
export class TokenService {
  @Config('web3Config')
  web3Config;

  @Inject('web3')
  web3: Web3Manager;

  @Inject()
  transactionService: TransactionService;

  async claim({ chainId, sourceId, id, to, balance, salt }: TokenClaimOptions) {
    const type = TransactionType.ClaimToken; // 当前交易类型：固定值

    const web3Provider = this.web3[chainId].provider;
    const web3Client = this.web3[chainId].clients[OfficialWalletType.ContractExecutor];

    const { claimAddress, usdcAddress } = this.web3Config.chainConfigs[chainId];

    await this.transactionService.execute({
      chainId,
      type,
      sourceId,
      handler: async ({ gasPrice, nonce }) => {
        const decimals = await web3Provider.getContract(usdcAddress, ERC20).decimals();
        const idStr = String(id);
        const balanceStr = utils.parseUnits(String(balance), decimals).toString();

        const hash = keccak256(
          encodePacked(
            ['address', 'address', 'address', 'uint256', 'uint256', 'uint256'],
            [claimAddress, usdcAddress, to, idStr, balanceStr, salt]
          ),
          'bytes'
        );
        const hashBytes = toBytes(hash);

        const signature = await web3Client.signMessage(hashBytes);
        const { v, r, s } = getVRS(signature);

        const params = [to, idStr, balanceStr, salt, v, r, s];

        const sendTransaction = () =>
          web3Client.execContractMethod(claimAddress, CapitalDepot, 'withdrawTo', params, {
            gasPrice,
            nonce,
            gasLimit: 600000,
          });

        return { trader: await web3Client.getAddress(), params, sendTransaction };
      },
    });
  }
}
