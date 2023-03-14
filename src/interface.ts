import type { Transaction } from './entity/Transaction.entity';
import type { Web3Provider, Web3Client } from './lib/web3';
export interface IUserOptions {
  uid: number;
}

export type Part = {
  account: string;
  value: number | string;
};

export type Mint721Data = {
  tokenId: string;
  tokenURI: string;
  creators: Part[];
  royalties: Part[];
  signatures: string[];
};

export type PaymentItem = {
  account: string;
  value: number;
};

export type PaymentOrder = {
  chainId: number;
  payAddress: string;
  sourceId: string;
  list: PaymentItem[];
};

export enum TransactionType {
  MintAndTransferNFT = 1001,
  ClaimNFT = 1002,
  UpdateNFT = 1003,
  PaymentToMusicer = 2001,
  ClaimToken = 2002,
}

export enum TransactionState {
  Created = 0,
  Sended = 1, // 发送成功
  Success = 100, // 执行成功
  SendFailed = -1, // 发送失败
  Failed = -100, // 执行失败
}

export type TransactionExecuteOptions = {
  chainId: number;
  type: TransactionType;
  sourceId: string;
  handler: (params: {
    gasPrice: number;
    nonce: number | undefined;
  }) => Promise<{ trader: string; params: any[]; sendTransaction: () => Promise<{ nonce: string; hash: string }> }>;
  onHistryRecordExisted?: (records: Transaction[]) => Promise<Transaction[]>;
};

export type UpdateTokenURIParams = {
  chainId: number;
  sourceId: string;
  address: string;
  tokenId: string;
  tokenURI: string;
};

export enum OfficialWalletType {
  ContractExecutor = 0, // 授权的合约执行者，目前没有做区分，计划后面区分为：法币购买nft铸造执行者、claim nft 转账执行者、nft 更新执行者 等等类型
  NftFactoryAdmin = 1001, // 合约工厂Admin角色，用于签名创建合约
}

export type TokenClaimOptions = {
  chainId: number;
  sourceId: string;
  id: number;
  to: string;
  balance: number;
  salt: string;
};

export type MintAndTransferParams = {
  sourceId: string;
  chainId: number;
  address: string;
  data: Mint721Data;
  from: string;
  to: string;
};

export type SafeTransferFromParams = {
  chainId: number;
  nftAddress: string;
  from: string;
  to: string;
  tokenId: string;
};

export type GetArtistCreatingSignatureParams = {
  chainId: number;
  deployer: string;
};

export type Web3Instance = { clients: Record<OfficialWalletType, Web3Client>; provider: Web3Provider };

export type Web3Manager = Record<number, Web3Instance>;
