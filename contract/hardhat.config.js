/* eslint-disable prettier/prettier */
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("hardhat-conflux");
require("dotenv").config();
const { task } = require("hardhat/config");
// require("hardhat-contract-sizer");
const { loadPrivateKey } = require('./utils');
const PRIVATE_KEY = loadPrivateKey();


task("upgradeCoreContract", "Upgrade Core Space contract", async () => {

});

task("upgradeESpaceContract", "Upgrade eSpace contract", async () => {

});

/**
 * @type import('hardhat/config').HardhatUserConfig
 * Go to https://hardhat.org/config/ to learn more
 */
module.exports = {
  solidity: "0.8.4",
  defaultNetwork: "espaceTestnet",
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    cfxMainnet: {
        url: "https://main.confluxrpc.com",
        accounts: [
          PRIVATE_KEY,
        ],
        chainId: 1029,
    },
    cfxTestnet: {
      url: "https://test.confluxrpc.com",
      accounts: [
        PRIVATE_KEY,
      ],
      chainId: 1,
    },
    espace: {
      url: "https://evm.confluxrpc.com",
      accounts: [PRIVATE_KEY],
      chainId: 1030,
    },
    espaceTestnet: {
      url: "https://evmtestnet.confluxrpc.com",
      accounts: [PRIVATE_KEY],
      chainId: 71,
    },
    net8889: {
      url: "http://net8889eth.confluxrpc.com",
      accounts: [
        PRIVATE_KEY,
      ],
      chainId: 8889,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
  },
};
