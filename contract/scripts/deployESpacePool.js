/* eslint-disable prefer-const */
/* eslint-disable no-unused-vars */
/* eslint-disable prettier/prettier */
require('dotenv').config();
const {
  conflux,
  account
} = require('./conflux');
const { address } = require('js-conflux-sdk');
const { ethers } = require("ethers");
const coreBridgeInfo = require("../artifacts/contracts/eSpace/CoreBridge.sol/CoreBridge.json");
const eSpacePoolInfo = require("../artifacts/contracts/eSpace/eSpacePoSPool.sol/ESpacePoSPool.json");
const proxyInfo = require("../artifacts/contracts/eSpace/Proxy1967.sol/Proxy1967.json");
const { loadPrivateKey } = require('../utils');

const INITIALIZE_METHOD_DATA = '0x8129fc1c';

const provider = new ethers.providers.JsonRpcProvider(process.env.ETH_RPC_URL);
const signer = new ethers.Wallet(loadPrivateKey(), provider);

async function main() {
  let coreBridge = conflux.Contract({
    abi: coreBridgeInfo.abi,
    bytecode: coreBridgeInfo.bytecode
  });

  let deployReceipt = await coreBridge
    .constructor()
    .sendTransaction({
      from: account.address,
    })
    .executed();

  if (deployReceipt.outcomeStatus !== 0) {
    console.log('Deploy CoreBridge failed');
    return;
  }

  const coreBridgeAddressImpl = deployReceipt.contractCreated;
  console.log('CoreBridge impl address: ', coreBridgeAddressImpl);

  let coreProxy = conflux.Contract({
    abi: proxyInfo.abi,
    bytecode: proxyInfo.bytecode
  });

  let proxyDeployReceipt = await coreProxy
    .constructor(coreBridgeAddressImpl, INITIALIZE_METHOD_DATA)
    .sendTransaction({
      from: account.address,
    })
    .executed();

  if (proxyDeployReceipt.outcomeStatus !== 0) {
    console.log('Deploy proxy failed');
    return;
  }
  
  const coreBridgeAddress = proxyDeployReceipt.contractCreated;
  console.log('CoreBridge address: ', coreBridgeAddress);
  const coreBridgeMirrorAddress = address.cfxMappedEVMSpaceAddress(coreBridgeAddress);
  console.log('CoreBridge mirror address: ', coreBridgeMirrorAddress);

  coreBridge = conflux.Contract({
    abi: coreBridgeInfo.abi,
    address: coreBridgeAddress
  });

  console.log('Setting Core PoolAddress in CoreBridge');
  await coreBridge
    .setPoolAddress(process.env.POOL_ADDRESS)
    .sendTransaction({
      from: account.address
    })
    .executed();


  // =================================================================

  let eSpacePoolFactory = new ethers.ContractFactory(eSpacePoolInfo.abi, eSpacePoolInfo.bytecode, signer);
  let eSpacePoolImpl = await eSpacePoolFactory.deploy();
  await eSpacePoolImpl.deployed();
  console.log('eSpacePool impl address: ', eSpacePoolImpl.address);

  await waitNS();

  // let code = await provider.getCode(eSpacePoolImpl.address);
  // console.log(code);

  let proxyFactory = new ethers.ContractFactory(proxyInfo.abi, proxyInfo.bytecode, signer);
  let eSpacePool = await proxyFactory.deploy(eSpacePoolImpl.address, INITIALIZE_METHOD_DATA);
  await eSpacePool.deployed();
  console.log('eSpacePool address: ', eSpacePool.address);

  console.log('Setting bridge address in eSpace pool');
  eSpacePool = new ethers.Contract(eSpacePool.address, eSpacePoolInfo.abi, signer);
  let tx = await eSpacePool.setBridge(coreBridgeMirrorAddress);
  await tx.wait();

  // testnet use 54000
  // tx = await eSpacePool.setLockPeriod(54000);
  // await tx.wait();

  console.log('Setting eSpacePool in CoreBridge');
  await coreBridge
    .setESpacePoolAddress(eSpacePool.address)
    .sendTransaction({
      from: account.address
    })
    .executed();

  console.log('Deploy Finished');
}

main().catch(console.log);

async function waitNS() {
  return new Promise(resolve => {
    setTimeout(() => resolve(), 5000);
  });
}