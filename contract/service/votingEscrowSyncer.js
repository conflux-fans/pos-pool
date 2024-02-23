/* eslint-disable node/no-unsupported-features/es-syntax */
/* eslint-disable node/no-unpublished-require */
/* eslint-disable prefer-const */
/* eslint-disable no-unused-vars */
/* eslint-disable prettier/prettier */
require('dotenv').config();
const debug = require('debug')('votingEscrowDataSyncer');
const { Conflux } = require("js-conflux-sdk");
const { loadPrivateKey } = require('../utils/index');
const coreBridgeInfo = require("../artifacts/contracts/eSpacePoolBridge.sol/CoreBridge.json");

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

async function syncGovVoteStatus() {
  setInterval(async () => {
    try {
      let lockInfoChanged = await coreBridge.isLockInfoChanged();
      debug('lockInfoChanged: ', lockInfoChanged);
      if (lockInfoChanged) {
        const receipt = await coreBridge
          .syncLockInfo()
          .sendTransaction(sendTxMeta)
          .executed();

        debug('syncLockInfo receipt: ', receipt);
      }

      let voteInfoChanged = await coreBridge.isVoteInfoChanged();
      debug('voteInfoChanged: ', voteInfoChanged);
      if (voteInfoChanged) {
        const receipt = await coreBridge
          .syncVoteInfo()
          .sendTransaction(sendTxMeta)
          .executed();

        debug('syncLockInfo receipt: ', receipt);
      }
    } catch (e) {
      console.log('crossingVotes error: ', e);
    }
    
  }, 1000 * 60 * 9.7);
}

async function main() {
  console.log('==== eSpacePool VotingEscrow Crossing Tasks Started ====');
  try {
    syncGovVoteStatus();
  } catch (e) {
    console.log(e);
  }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});