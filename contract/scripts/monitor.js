/* eslint-disable prettier/prettier */
/* eslint-disable no-unneeded-ternary */
// This is a monitor script used to check whether a PoS node is forceRetired.
// If the node is forceRetired, this script will push Dingding message to notify the Manager.
require('dotenv').config();
const { conflux } = require("./conflux");
const posNodeAddresses = require('./pos-node-addresses.json');
const { dingAlert } = require('../utils/dingAlert');

async function main() {
  setInterval(async () => {
    for (const posNodeAddress of posNodeAddresses) {
      try {
        const forceRetired = await checkForceRetired(posNodeAddress);
        const message = `${(new Date()).toLocaleString()} is ${posNodeAddress} forceRetired? : ${forceRetired}`;
        console.log(message);
        if (forceRetired) {
          dingAlert(message);
        }
      } catch (err) {
        console.log('Check failed: ', err);
      }
    }
  }, 1000 * 60 * 30);  // check every 30 minute
}

main().catch(console.log);

async function checkForceRetired(posNodeAddress) {
  const accountInfo = await conflux.pos.getAccount(posNodeAddress);
  return accountInfo.status.forceRetired ? true : false;
}
