import {
  Conflux,
  format,
  Drip,
} from "js-conflux-sdk/dist/js-conflux-sdk.umd.min.js";

import { abi as posPoolAbi } from "./../../../contract/ABI/IPoSPool.json";
import { abi as posManagerAbi } from "./../../../contract/ABI/PoolManager.json";
import { isTestNetEnv } from "./index";
import { NETWORK_ID_MAINNET, NETWORK_ID_TESTNET } from "../constants";

const networkId = isTestNetEnv() ? NETWORK_ID_TESTNET : NETWORK_ID_MAINNET;

const cfxUrl = window.location.origin + "/rpc";

const conflux = new Conflux({
  url: cfxUrl,
  networkId,
});

// const posPoolAddressTestnet =
//   "NET8888:TYPE.CONTRACT:ACCHHA25SM4P7C0WXC778MMBTVNE99X53PXFWE26UN";
// //TODO: modify mainnet address
// const posPoolAddressMainnet = "";
// const posPoolAddress = isTestNetEnv()
//   ? posPoolAddressTestnet
//   : posPoolAddressMainnet;
const posPoolManagerAddressTestnet =
  "cfxtest:acarejybbjfhs6uyaxdjcnex5rf8t1k2h6zw7kmw45";
//TODO: modify mainnet address
const posPoolManagerAddressMainnet = "";
const posPoolManagerAddress = isTestNetEnv()
  ? posPoolManagerAddressTestnet
  : posPoolManagerAddressMainnet;

const getPosPoolContract = (address) =>
  conflux.Contract({
    abi: posPoolAbi,
    address: address,
  });

const posPoolManagerContract = conflux.Contract({
  abi: posManagerAbi,
  address: posPoolManagerAddress,
});

export const getPosAccountByPowAddress = async (address) => {
  const posPoolContract = await getPosPoolContract(address);
  const posAddress = format.hex(await posPoolContract.posAddress());
  const posAccout = await conflux.provider.call("pos_getAccount", posAddress);
  return posAccout;
};
export {
  conflux,
  format,
  Drip,
  getPosPoolContract,
  posPoolManagerContract,
  posPoolManagerAddress,
};
