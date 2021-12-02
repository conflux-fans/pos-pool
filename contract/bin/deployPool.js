/* eslint-disable no-unused-vars */
/* eslint-disable node/no-unpublished-require */
/* eslint-disable prettier/prettier */
const {Conflux, Drip, format} = require('js-conflux-sdk');
require('dotenv').config();
const poolContractInfo = require("../artifacts/contracts/PoSPool.sol/PoSPool.json");
const poolManagerInfo = require("../artifacts/contracts/PoolManager.sol/PoolManager.json");
const poolProxyInfo = require("../artifacts/contracts/PoSPoolProxy1967.sol/PoSPoolProxy1967.json");

const conflux = new Conflux({
  url: process.env.CFX_RPC_URL,
  networkId: parseInt(process.env.CFX_NETWORK_ID),
});
const account = conflux.wallet.addPrivateKey(process.env.PRIVATE_KEY);

const managerContract = conflux.Contract({
  address: process.env.POOL_MANAGER_ADDRESS,
  abi: poolManagerInfo.abi,
});

async function main() {
  const posRegistData = process.argv[2];
  if (!posRegistData) {
    console.log("Please input posRegistData");
    return;
  }

  let poolContract = conflux.Contract({
    abi: poolContractInfo.abi,
    bytecode: poolContractInfo.bytecode,
  });

  console.log("======== Start deploying pool...");
  const deployPoolReceipt = await poolContract
    .constructor()
    .sendTransaction({
      from: account.address,
    })
    .executed();

  if (deployPoolReceipt.outcomeStatus !== 0) {
    console.log("Deploy pool failed");
    return;
  }
  console.log(
    "Deploy pool success, address is: ",
    deployPoolReceipt.contractCreated
  );

  console.log("======== Start deploying pool proxy...");
  const poolProxyContract = conflux.Contract({
    abi: poolProxyInfo.abi,
    bytecode: poolProxyInfo.bytecode,
  });
  const deployProxyContract = await poolProxyContract
    .constructor(deployPoolReceipt.contractCreated)
    .sendTransaction({
      from: account.address,
    })
    .executed();

  if (deployProxyContract.outcomeStatus !== 0) {
    console.log("Deploy pool proxy failed");
    return;
  }
  console.log(
    "Deploy pool proxy success, address is: ",
    deployProxyContract.contractCreated
  );

  console.log("======== Start register pool...");
  /* poolContract = conflux.Contract({
    abi: poolContractInfo.abi,
    bytecode: deployProxyContract.contractCreated,
  }); */

  const registerPoolReceipt = await conflux.cfx
    .sendTransaction({
      from: account.address,
      value: Drip.fromCFX(1000),
      to: deployProxyContract.contractCreated,
      data: posRegistData,
    })
    .executed();
  if (registerPoolReceipt.outcomeStatus !== 0) {
    console.log("Pool register failed");
    return;
  }
  console.log("Pool register successed");

  console.log("======== Add pool to pool manager...");
  const addReceipt = await managerContract
    .addPool(deployProxyContract.contractCreated)
    .sendTransaction({
      from: account.address,
    })
    .executed();
  if (addReceipt.outcomeStatus !== 0) {
    console.log("Pool add failed");
    return;
  }
  console.log("Pool deploy successed");
}

main().catch(console.log);
