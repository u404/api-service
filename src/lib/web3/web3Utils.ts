import { utils } from 'ethers';

export const keccak256 = (text: string, type = 'string') => {
  return utils.solidityKeccak256([type], [text]);
};

export const encodePacked = (types: string[], values: string[]) => {
  return utils.solidityPack(types, values);
};

export const getVRS = (signature: string) => {
  const { v, r, s } = utils.splitSignature(signature);
  return { v, r, s };
};

export const toBytes = (text: string) => {
  return utils.arrayify(text);
};

export default {
  keccak256,
  encodePacked,
  getVRS,
  toBytes,
};
