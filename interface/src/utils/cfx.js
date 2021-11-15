import {
  Conflux,
  format,
  Drip,
} from "js-conflux-sdk/dist/js-conflux-sdk.umd.min.js";

import { abi as posPoolAbi } from "./../contract/PoSPool.json";
import { abi as posManagerAbi } from "./../contract/PoolManager.json";
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
  "NET8888:TYPE.CONTRACT:ACC7GGWT2M5D8VY6F9P9221TN8KB4CRH2UVW0FA9HT";
//TODO: modify mainnet address
const posPoolManagerAddressMainnet = "";
const posPoolManagerAddress = isTestNetEnv()
  ? posPoolManagerAddressTestnet
  : posPoolManagerAddressMainnet;

const getPosPoolContract = (address)=>conflux.Contract({
  abi: posPoolAbi,
  address: address,
});

const posPoolManagerContract = conflux.Contract({
  abi: posManagerAbi,
  address: posPoolManagerAddress,
});
export {
  conflux,
  format,
  Drip,
  getPosPoolContract,
  posPoolManagerContract,
  posPoolManagerAddress,
};
