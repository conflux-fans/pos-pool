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


task("upgradeContract", "Upgrade a Proxy1967 Contract, assumes the implementation contract has no constructor parameters")
    .addParam("address", "The address of the proxy contract")
    .addParam("contract", "The name of the implementation contract")
    .setAction(async (taskArguments, hre, runSuper) => {
        const address = taskArguments.address;
        const name = taskArguments.contract;
        let implAddress = "";

        if (address.toLowerCase().startsWith("cfx")) {
            const [deployer] = await hre.conflux.getSigners();
            const Contract = await hre.conflux.getContractFactory(name);
            const tx = Contract.constructor().sendTransaction({
                from: deployer.address,
            });
            const receipt = await tx.executed();
            implAddress = receipt.contractCreated;

            console.log(`New ${name} impl deployed to ${implAddress}`);

            const proxy = await hre.conflux.getContractAt("Proxy1967", address);
            const tx2 = proxy.upgradeTo(implAddress).sendTransaction({
                from: deployer.address,
            });
            await tx2.executed();
        } else {
            const Contract = await hre.ethers.getContractFactory(name);
            const contract = await Contract.deploy();
            await contract.deployed();
            implAddress = contract.address;

            console.log(`New ${name} impl deployed to ${contract.address}`);

            const proxy = await hre.ethers.getContractAt("Proxy1967", address);
            const tx = await proxy.upgradeTo(contract.address);
            await tx.wait();
        }
        console.log(`Upgrade ${address} to new impl success`);
    });

task("taskName", "Task description", async () => {

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
    espaceMainnet: {
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
