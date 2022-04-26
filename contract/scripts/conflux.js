/* eslint-disable prettier/prettier */
const { Conflux, Drip } = require("js-conflux-sdk");
require('dotenv').config();

const conflux = new Conflux({
  url: process.env.CFX_RPC_URL,
  networkId: parseInt(process.env.CFX_NETWORK_ID),
});

let account;
if (process.env.PRIVATE_KEY) {
  account = conflux.wallet.addPrivateKey(process.env.PRIVATE_KEY);
} else {
  const keystore = require(process.env.KEYSTORE);
  account = conflux.wallet.addKeystore(keystore, process.env.KEYSTORE_PWD);
}


module.exports = {
  conflux,
  Drip,
  account,
};
