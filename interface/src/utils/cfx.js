import {
  format,
  Drip,
  Conflux
} from "js-conflux-sdk/dist/js-conflux-sdk.umd.min.js";
import { abi as posPoolAbi } from "./../../../contract/ABI/IPoSPool.json";
import poolConfig from '../../pool.config';
import { isTestNetEnv } from "./index";
import { NETWORK_ID_CORE_MAINNET, NETWORK_ID_CORE_TESTNET } from "../constants";

const getPosPoolContract = ({ conflux, address }) =>
  conflux.Contract({
    abi: posPoolAbi,
    address: address,
  });

export const getPosAccountByPowAddress = async ({ conflux, posPoolContract, address}) => {
  if (!posPoolContract && address) {
    posPoolContract = await getPosPoolContract({ conflux, address });
  }
  const posAddress = format.hex(await posPoolContract.posAddress());
  const posAccout = await conflux.provider.call("pos_getAccount", posAddress);
  return posAccout;
};


let cfxUrl = poolConfig.core[isTestNetEnv() ? 'testnet' : 'mainnet'].RPC;
if (process.env.REACT_APP_TestNet === "true") {
  cfxUrl = window.location.origin + `/core-rpc`;
}
const coreConflux = new Conflux({
  url: cfxUrl,
  networkId: isTestNetEnv() ? NETWORK_ID_CORE_TESTNET : NETWORK_ID_CORE_MAINNET
})

export {
  format,
  Drip,
  coreConflux
};
