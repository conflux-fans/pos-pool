/* eslint-disable prettier/prettier */
/* eslint-disable no-unneeded-ternary */
// This is a monitor script used to check whether a PoS node is forceRetired.
// If the node is forceRetired, this script will push Dingding message to notify the Manager.
const {conflux} = require("./conflux");
const posNodeAddresses = require('./pos-node-addresses.json');

async function main() {
  setInterval(async () => {
    for (const posNodeAddress of posNodeAddresses) {
      const forceRetired = await checkForceRetired(posNodeAddress);
      console.log(`${(new Date()).toLocaleString()} is ${posNodeAddress} forceRetired ? : ${forceRetired}`);
    }
  }, 1000 * 60);
}

main().catch(console.log);

async function checkForceRetired(posNodeAddress) {
  const accountInfo = await conflux.pos.getAccount(posNodeAddress);
  return accountInfo.status.forceRetired ? true : false;
}
