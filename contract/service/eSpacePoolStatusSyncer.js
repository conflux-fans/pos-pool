/* eslint-disable node/no-unsupported-features/es-syntax */
/* eslint-disable node/no-unpublished-require */
/* eslint-disable prefer-const */
/* eslint-disable no-unused-vars */
/* eslint-disable prettier/prettier */
require('dotenv').config();
const { Conflux } = require("js-conflux-sdk");
const coreBridgeInfo = require("../artifacts/contracts/eSpace/CoreBridge.sol/CoreBridge.json");
const debug = require('debug')('espacePoolStatusSyncer');

const conflux = new Conflux({
  url: process.env.CFX_RPC_URL,
  networkId: parseInt(process.env.CFX_NETWORK_ID),
});

// NOTE: make sure sender account have enough balance to pay gasFee and storageFee
const account = conflux.wallet.addPrivateKey(process.env.PRIVATE_KEY);

const coreBridge = conflux.Contract({
  abi: coreBridgeInfo.abi,
  address: process.env.ESPACE_POOL_CORE_PROXY,
});

const sendTxMeta = {
  from: account.address
};

async function syncAPYandClaimInterest() {
  setInterval(async () => {
    let interest = await coreBridge.queryInterest();
    debug('syncAPYandClaimInterest: ', interest);
    if (interest === 0n) return;
    const receipt = await coreBridge
      .syncAPYandClaimInterest()
      .sendTransaction(sendTxMeta)
      .executed();
    debug(`syncAPYandClaimInterest finished: `, receipt.transactionHash, receipt.outcomeStatus);
  }, 1000 * 60 * 30);  // 30 minutes once
}

async function syncVoteStatus() {
  setInterval(async () => {
    let crossingVotes = await coreBridge.queryCrossingVotes();
    debug('crossStake: ', crossingVotes);
    if (crossingVotes > 0) {
      const receipt = await coreBridge
        .crossStake()
        .sendTransaction(sendTxMeta)
        .executed();
      debug(`crossStake finished: `, receipt.transactionHash, receipt.outcomeStatus);
    }
    
    let userSummary = await coreBridge.queryUserSummary();
    debug('withdrawVotes: ', userSummary.unlocked);
    if (userSummary.unlocked > 0) {
      const receipt = await coreBridge
        .withdrawVotes()
        .sendTransaction(sendTxMeta)
        .executed();
      debug(`withdrawVotes finished: `, receipt.transactionHash, receipt.outcomeStatus);
    }

    let unstakeLen = await coreBridge.queryUnstakeLen();
    debug('handleUnstake: ', unstakeLen);
    if (unstakeLen > 0) {
      const receipt = await coreBridge
        .handleUnstake()
        .sendTransaction(sendTxMeta)
        .executed();
      debug(`handleUnstake finished: `, receipt.transactionHash, receipt.outcomeStatus);
    }
  }, 1000 * 60 * 5);
}

/* async function handleUnstake() {
  setInterval(async () => {
    let unstakeLen = await coreBridge.queryUnstakeLen();
    debug('handleUnstake: ', unstakeLen);
    if (unstakeLen === 0n) return;
    const receipt = await coreBridge
      .handleUnstake()
      .sendTransaction(sendTxMeta)
      .executed();
    debug(`handleUnstake finished: `, receipt.transactionHash, receipt.outcomeStatus);
  }, 1000 * 60 * 5);
} */

async function main() {
  try {
    syncAPYandClaimInterest();
    syncVoteStatus();
    console.log('==== eSpacePool Crossing Tasks Started ====');
  } catch (e) {
    console.log(e);
  }
}

main().catch(console.log);