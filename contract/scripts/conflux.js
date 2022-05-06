/* eslint-disable prettier/prettier */
require('dotenv').config();
const { Conflux, Drip } = require("js-conflux-sdk");
const { loadPrivateKey } = require('../utils');

const conflux = new Conflux({
  url: process.env.CFX_RPC_URL,
  networkId: parseInt(process.env.CFX_NETWORK_ID),
});

let account = conflux.wallet.addPrivateKey(loadPrivateKey());

module.exports = {
  conflux,
  Drip,
  account,
};
