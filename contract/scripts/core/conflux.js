/* eslint-disable prettier/prettier */
require('dotenv').config();
const { Conflux, Drip } = require("js-conflux-sdk");
const { loadPrivateKey } = require('../../utils');

const conflux = new Conflux({
  url: process.env.CFX_RPC_URL,
  networkId: parseInt(process.env.CFX_NETWORK_ID),
  // logger: console
});

let account = conflux.wallet.addPrivateKey(loadPrivateKey());
// console.log('Account address: ', account.address);

function logReceipt (receipt, msg) {
    console.log(`${msg} status: ${receipt.outcomeStatus === 0 ? 'success' : 'failed'}`, 'Tx hash', receipt.transactionHash);
}

module.exports = {
  conflux,
  Drip,
  account,
  logReceipt,
};
