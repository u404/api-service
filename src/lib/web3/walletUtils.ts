import EthereumWallet from 'ethereumjs-wallet';
import * as crypto from 'crypto';

const encryptKey = 'GHZ';
const encryptIV = 'lyrra.io';

export type Wallet = {
  address: string;
  privateKey: string;
};

const genkey = (secret, length = 32) => {
  return crypto.createHash('sha256').update(String(secret)).digest('base64').slice(0, length);
};

export default {
  /**
   * 生成一个钱包
   */
  generate(): Wallet {
    const eWallet = EthereumWallet.generate();
    return {
      address: eWallet.getAddressString(),
      privateKey: eWallet.getPrivateKeyString().replace(/^0x/, ''),
    };
  },

  generateVanityAddress(regex: RegExp): Wallet {
    const eWallet = EthereumWallet.generateVanityAddress(regex);
    return {
      address: eWallet.getAddressString(),
      privateKey: eWallet.getPrivateKeyString().replace(/^0x/, ''),
    };
  },

  encrypt(text: string) {
    const cipher = crypto.createCipheriv('aes-256-cbc', genkey(encryptKey), genkey(encryptIV, 16));
    let enc = cipher.update(text, 'utf8', 'hex');
    enc += cipher.final('hex');
    return enc;
  },

  decrypt(ciphertext: string) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', genkey(encryptKey), genkey(encryptIV, 16));
    let dec = decipher.update(ciphertext, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  },
};
