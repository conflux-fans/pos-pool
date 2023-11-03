/* eslint-disable prettier/prettier */
require("dotenv").config();

require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("hardhat-conflux");
// require("hardhat-contract-sizer");
const { loadPrivateKey } = require('./utils');

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const PRIVATE_KEY = loadPrivateKey();

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.4",
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    ropsten: {
      url: process.env.ROPSTEN_URL || "",
      accounts:
        PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
    },
    cfx: {
        url: "https://main.confluxrpc.com",
        accounts: [
          PRIVATE_KEY,
        ],
        chainId: 1029,
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
    testnet: {
      url: "https://test.confluxrpc.com",
      accounts: [
        PRIVATE_KEY,
      ],
      chainId: 1,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
  },
};
