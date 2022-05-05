/* eslint-disable node/no-unsupported-features/es-syntax */
/* eslint-disable node/no-unpublished-require */
/* eslint-disable prefer-const */
/* eslint-disable no-unused-vars */
/* eslint-disable prettier/prettier */
require('dotenv').config();
const debug = require('debug')('espacePoolStatusSyncer');
const { Conflux, Drip } = require("js-conflux-sdk");
const coreBridgeInfo = require("../artifacts/contracts/eSpace/CoreBridge.sol/CoreBridge.json");
const { loadPrivateKey } = require('../utils/index');
const { dingAlert } = require('../utils/dingAlert');

const conflux = new Conflux({
  url: process.env.CFX_RPC_URL,
  networkId: parseInt(process.env.CFX_NETWORK_ID),
});

// NOTE: make sure sender account have enough balance to pay gasFee and storageFee
const account = conflux.wallet.addPrivateKey(loadPrivateKey());

const coreBridge = conflux.Contract({
  abi: coreBridgeInfo.abi,
  address: process.env.ESPACE_POOL_CORE_PROXY,
});

const sendTxMeta = {
  from: account.address
};

async function syncAPYandClaimInterest() {
  setInterval(async () => {
    // check and alert
    await checkBalance();

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
    try {
      let crossingVotes = await coreBridge.queryCrossingVotes();
      debug('crossStake: ', crossingVotes);
      if (crossingVotes > 0) {
        const receipt = await coreBridge
          .crossStake()
          .sendTransaction(sendTxMeta)
          .executed();
        debug(`crossStake finished: `, receipt.transactionHash, receipt.outcomeStatus);
      }
    } catch (e) {
      console.log('crossingVotes error: ', e);
    }
    
    try {
      let userSummary = await coreBridge.queryUserSummary();
      debug('withdrawVotes: ', userSummary.unlocked);
      if (userSummary.unlocked > 0) {
        const receipt = await coreBridge
          .withdrawVotes()
          .sendTransaction(sendTxMeta)
          .executed();
        debug(`withdrawVotes finished: `, receipt.transactionHash, receipt.outcomeStatus);
      }
    } catch(e) {
      console.log('withdrawVotes error: ', e);
    }

    try {
      let unstakeLen = await coreBridge.queryUnstakeLen();
      debug('handleUnstake: ', unstakeLen);
      let userSummary = await coreBridge.queryUserSummary();
      if (unstakeLen > 0 && userSummary.locked > 0) {
        const receipt = await coreBridge
          .handleUnstake()
          .sendTransaction(sendTxMeta)
          .executed();
        debug(`handleUnstake finished: `, receipt.transactionHash, receipt.outcomeStatus);
      }
    } catch (e) {
      console.log("unstake error: ", e);
    }
  }, 1000 * 60 * 5);
}

async function checkBalance() {
  let balance = await conflux.cfx.getBalance(account.address);
  let oneCfx = Drip.fromCFX(1);
  if (balance < BigInt(oneCfx)) {
    dingAlert('eSpacePoolStatusSyncer: ' + `${account.address} balance is not enough`);
  }
}

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