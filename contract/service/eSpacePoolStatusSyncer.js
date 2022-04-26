/* eslint-disable node/no-unsupported-features/es-syntax */
/* eslint-disable node/no-unpublished-require */
/* eslint-disable prefer-const */
/* eslint-disable no-unused-vars */
/* eslint-disable prettier/prettier */
require('dotenv').config();
const { Conflux, Drip } = require("js-conflux-sdk");
const coreProxyInfo = require("../artifacts/contracts/eSpace/CoreProxy.sol/CoreProxy.json");

const conflux = new Conflux({
  url: process.env.CFX_RPC_URL,
  networkId: parseInt(process.env.CFX_NETWORK_ID),
});

// NOTE: make sure sender account have enough balance to pay gasFee and storageFee
const account = conflux.wallet.addPrivateKey(process.env.PRIVATE_KEY);

const coreProxy = conflux.Contract({
  abi: coreProxyInfo.abi,
  address: process.env.ESPACE_POOL_CORE_PROXY,
});

const sendTxMeta = {
  from: account.address
};

async function syncAPYandClaimInterest() {
  setInterval(async () => {
    let interest = await coreProxy.queryInterest();
    if (interest === 0n) return;
    const receipt = await coreProxy
      .syncAPYandClaimInterest()
      .sendTransaction(sendTxMeta)
      .executed();
    console.log(`syncAPYandClaimInterest: `, receipt.transactionHash, receipt.outcomeStatus);
  }, 1000 * 60 * 30);  // 30 minutes once
}

async function crossStakeAndWithdrawVotes() {
  setInterval(async () => {
    let crossingVotes = await coreProxy.queryCrossingVotes();
    if (crossingVotes > 0) {
      const receipt = await coreProxy
        .crossStake()
        .sendTransaction(sendTxMeta)
        .executed();
      console.log(`crossStakeAndWithdrawVotes: `, receipt.transactionHash, receipt.outcomeStatus);
    }
    
    let userSummary = await coreProxy.queryUserSummary();
    if (userSummary.unlocked > 0) {
      const receipt = await coreProxy
        .withdrawVotes()
        .sendTransaction(sendTxMeta)
        .executed();
      console.log(`crossStakeAndWithdrawVotes: `, receipt.transactionHash, receipt.outcomeStatus);
    }
  }, 1000 * 60 * 5);
}

async function handleUnstake() {
  setInterval(async () => {
    let unstakeLen = await coreProxy.queryUnstakeLen();
    if (unstakeLen === 0n) return;
    const receipt = await coreProxy
      .handleUnstake()
      .sendTransaction(sendTxMeta)
      .executed();
    console.log(`handleUnstake: `, receipt.transactionHash, receipt.outcomeStatus);
  }, 1000 * 60 * 5);
}

async function main() {
  syncAPYandClaimInterest();
  crossStakeAndWithdrawVotes();
  handleUnstake();
  console.log('==== eSpacePool Crossing Tasks Started ====');
}

main().catch(console.log);