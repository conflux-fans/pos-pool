import {
  format,
  Drip,
  Conflux,
} from 'js-conflux-sdk/dist/js-conflux-sdk.umd.min.js'
import {abi as posPoolAbi} from './../../../contract/ABI/IPoSPool.json'
import {abi as posManagerAbi} from './../../../contract/ABI/PoolManager.json'
import poolConfig from '../../pool.config'
import {isTestNetEnv} from './index'
import {NETWORK_ID_CORE_MAINNET, NETWORK_ID_CORE_TESTNET} from '../constants'

let cfxUrl = poolConfig[isTestNetEnv() ? 'testnet' : 'mainnet'].core.RPC
if (process.env.REACT_APP_TestNet === 'true') {
  cfxUrl = window.location.origin + `/core-rpc`
}

export const conflux = new Conflux({
  url: cfxUrl,
  networkId: isTestNetEnv() ? NETWORK_ID_CORE_TESTNET : NETWORK_ID_CORE_MAINNET,
})

export const posPoolManagerContract = conflux.Contract({
  abi: posManagerAbi,
  address:
    poolConfig[isTestNetEnv() ? 'testnet' : 'mainnet'].poolManagerAddress,
})

export const getPosAccountByPowAddress = async address => {
  const posPoolContract = conflux.Contract({
    abi: posPoolAbi,
    address: address,
  });

  const posAddress = format.hex(await posPoolContract.posAddress())
  const posAccout = await conflux.provider.call('pos_getAccount', posAddress)
  return posAccout
}

export {format, Drip}
