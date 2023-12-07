/* eslint-disable node/no-unsupported-features/es-syntax */
/* eslint-disable node/no-unpublished-require */
/* eslint-disable prefer-const */
/* eslint-disable no-unused-vars */
/* eslint-disable prettier/prettier */
require('dotenv').config();
const debug = require('debug')('espacePoolStatusSyncer');
const { Conflux, Drip } = require("js-conflux-sdk");
const coreBridgeInfo = require("../artifacts/contracts/eSpacePoolBridge.sol/CoreBridge.json");
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
  address: process.env.CORE_BRIDGE,
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

async function checkBalance() {
  let balance = await conflux.cfx.getBalance(account.address);
  let oneCfx = Drip.fromCFX(1);
  if (balance < BigInt(oneCfx)) {
    dingAlert('eSpacePoolStatusSyncer: ' + `${account.address} balance is not enough`);
  }
}

async function main() {
  console.log('==== eSpacePool Crossing Tasks Started ====');
  try {
    syncAPYandClaimInterest();
  } catch (e) {
    console.log(e);
  }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});