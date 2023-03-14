import { Column, Model, DataType } from 'sequelize-typescript';
import { BaseTable } from '@midwayjs/sequelize';
import { OfficialWalletType } from '../interface';

@BaseTable({
  tableName: 'official_wallet',
  modelName: 'official_wallet',
})
export class OfficialWallet extends Model {
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
    type: DataType.INTEGER,
    allowNull: false,
    comment: '角色标识，用来区分钱包的用途',
  })
  role: OfficialWalletType;

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
