import { Column, Model, DataType } from 'sequelize-typescript';
import { BaseTable } from '@midwayjs/sequelize';

@BaseTable({
  tableName: 'transaction',
  modelName: 'transaction',
})
export class Transaction extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    comment: 'Id',
  })
  id: number;

  @Column({
    allowNull: false,
    comment: '链id',
  })
  chainId: number;

  @Column({
    allowNull: false,
    comment: '交易类型',
  })
  type: number;

  @Column({
    allowNull: false,
    comment: '来源ID，业务系统的该次交易单ID',
  })
  sourceId: string;

  @Column({
    allowNull: false,
    comment: '执行交易的钱包地址',
  })
  trader: string;

  @Column({
    allowNull: true,
    comment: '交易参数',
  })
  params: string;

  @Column({
    allowNull: true,
    comment: '交易nonce',
  })
  nonce: number;

  @Column({
    allowNull: true,
    comment: '交易hash',
  })
  hash: string;

  @Column({
    allowNull: true,
    comment: 'gas price',
  })
  gasPrice: number;

  @Column({
    allowNull: false,
    comment: '状态：0:已创建，1:发送成功，100:执行成功，-1:发送失败，-100:执行失败',
  })
  state: number;

  @Column({
    allowNull: true,
    comment: '交易详情',
  })
  detail: string;

  @Column({
    allowNull: true,
    comment: '错误码',
  })
  errorCode: string;

  @Column({
    allowNull: true,
    comment: '错误消息',
  })
  errorMessage: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    comment: '更新时间',
  })
  updatedAt?: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    comment: '创建时间',
  })
  createdAt?: string;
}
