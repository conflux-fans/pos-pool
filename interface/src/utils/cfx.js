import {
  Conflux,
  format,
  Drip,
} from "js-conflux-sdk/dist/js-conflux-sdk.umd.min.js";

import { abi as posPoolAbi } from "./../../../contract/ABI/IPoSPool.json";
import { abi as posManagerAbi } from "./../../../contract/ABI/PoolManager.json";
import { isTestNetEnv } from "./index";
import { NETWORK_ID_MAINNET, NETWORK_ID_TESTNET } from "../constants";
import poolConfig from '../../pool.config';

const networkId = isTestNetEnv() ? NETWORK_ID_TESTNET : NETWORK_ID_MAINNET;
let cfxUrl = isTestNetEnv() ? poolConfig.testnet.RPC : poolConfig.mainnet.RPC;
if (process.env.REACT_APP_TestNet === "true") {
  cfxUrl = window.location.origin + "/rpc";
}

const conflux = new Conflux({
  url: cfxUrl,
  networkId,
});

const posPoolManagerAddressTestnet = poolConfig.testnet.poolManagerAddress;
const posPoolManagerAddressMainnet = poolConfig.mainnet.poolManagerAddress;
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

console.log('Config: ', isTestNetEnv(), posPoolManagerAddress, cfxUrl, networkId);

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
