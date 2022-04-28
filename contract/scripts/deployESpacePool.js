/* eslint-disable prefer-const */
/* eslint-disable no-unused-vars */
/* eslint-disable prettier/prettier */
const {
  conflux,
  account
} = require('./conflux');
const { address } = require('js-conflux-sdk');
const { ethers } = require("ethers");
const coreBridgeInfo = require("../artifacts/contracts/eSpace/CoreBridge.sol/CoreBridge.json");
const eSpacePoolInfo = require("../artifacts/contracts/eSpace/eSpacePoSPool.sol/ESpacePoSPool.json");

const provider = new ethers.providers.JsonRpcProvider(process.env.ETH_RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

async function main() {
  let coreBridge = conflux.Contract({
    abi: coreBridgeInfo.abi,
    bytecode: coreBridgeInfo.bytecode
  });

  let deployReceipt = await coreBridge
    .constructor(process.env.POOL_ADDRESS)
    .sendTransaction({
      from: account.address,
    })
    .executed();

  if (deployReceipt.outcomeStatus !== 0) {
    console.log('Deploy CoreBridge failed');
    return;
  }

  const coreBridgeAddress = deployReceipt.contractCreated;
  const coreBridgeMirrorAddress = address.cfxMappedEVMSpaceAddress(coreBridgeAddress);
  console.log('CoreBridge address: ', coreBridgeAddress);
  console.log('CoreBridge mirror address: ', coreBridgeMirrorAddress);

  coreBridge = conflux.Contract({
    abi: coreBridgeInfo.abi,
    address: coreBridgeAddress
  });

  let eSpacePoolFactory = new ethers.ContractFactory(eSpacePoolInfo.abi, eSpacePoolInfo.bytecode, signer);
  let eSpacePool = await eSpacePoolFactory.deploy();
  console.log('eSpacePool address: ', eSpacePool.address);

  console.log('Setting bridge address in eSpace pool');
  await eSpacePool.setBridge(coreBridgeMirrorAddress);

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

