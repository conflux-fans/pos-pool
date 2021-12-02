const { Conflux, Drip } = require("js-conflux-sdk");

const conflux = new Conflux({
  url: process.env.CFX_RPC_URL,
  networkId: parseInt(process.env.CFX_NETWORK_ID),
});

const account = conflux.wallet.addPrivateKey(process.env.PRIVATE_KEY);

module.exports = {
  conflux,
  Drip,
  account,
};
