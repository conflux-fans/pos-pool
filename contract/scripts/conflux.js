const { Conflux, Drip } = require("js-conflux-sdk");

const conflux = new Conflux({
  url: "http://101.132.158.162:12537",
  networkId: 8888,
});

const account = conflux.wallet.addPrivateKey(process.env.PRIVATE_KEY);

module.exports = {
  conflux,
  Drip,
  account,
};
