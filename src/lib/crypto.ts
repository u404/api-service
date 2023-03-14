import * as crypto from 'crypto';

export default {
  encrypt(alg: string, text: string, key: string, iv: string = null) {
    const cipher = crypto.createCipheriv(alg, key, iv);
    let c = cipher.update(text, 'utf8', 'base64');
    c += cipher.final('base64');
    return c;
  },

  decrypt(alg: string, cipherText: string, key: string, iv: string = null) {
    const cipher = crypto.createDecipheriv(alg, key, iv);
    let t = cipher.update(cipherText, 'base64', 'utf8');
    t += cipher.final('utf8');
    return t;
  },

  desEncrypt(text: string, key: string) {
    return this.encrypt('des-ecb', text, key.slice(0, 8));
  },

  desDecrypt(cipherText: string, key: string) {
    return this.decrypt('des-ecb', cipherText, key.slice(0, 8));
  },

  genkey(secret, length = 32) {
    return crypto.createHash('sha256').update(String(secret)).digest('base64').slice(0, length);
  },

  aesEncrypt(text: string, key: string, iv: string) {
    return this.encrypt('aes-256-cbc', text, this.genkey(key), this.genkey(iv, 16));
  },

  aesDecrypt(cipherText: string, key: string, iv: string) {
    return this.decrypt('aes-256-cbc', cipherText, this.genkey(key), this.genkey(iv, 16));
  },
};
