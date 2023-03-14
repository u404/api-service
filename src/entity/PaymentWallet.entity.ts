import { Column, Model, DataType } from 'sequelize-typescript';
import { BaseTable } from '@midwayjs/sequelize';

@BaseTable({
  tableName: 'payment_wallet',
  modelName: 'payment_wallet',
})
export class PaymentWallet extends Model {
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
    comment: '钱包地址',
  })
  address: string;

  @Column({
    allowNull: false,
    comment: '钱包私钥',
  })
  privateKeyEncrypted: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否被使用过',
  })
  used: boolean;

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
