#!/usr/bin/env node
/* eslint-disable no-unused-vars */
/* eslint-disable node/no-unpublished-require */
/* eslint-disable prettier/prettier */
const poolDebugContractInfo = require("../artifacts/contracts/PoSPoolDebug.sol/PoSPoolDebug.json");
const poolContractInfo = require("../artifacts/contracts/PoSPool.sol/PoSPool.json");
const poolContractInterface = require("../artifacts/contracts/IPoSPool.sol/IPoSPool.json");
const poolManagerInfo = require("../artifacts/contracts/PoolManager.sol/PoolManager.json");
const mockStakingInfo = require("../artifacts/contracts/mocks/Staking.sol/MockStaking.json");
const mockPosRegisterInfo = require("../artifacts/contracts/mocks/PoSRegister.sol/MockPoSRegister.json");
const poolProxyInfo = require("../artifacts/contracts/PoSPoolProxy.sol/PoSPoolProxy.json");
const {Conflux, Drip, format} = require('js-conflux-sdk');
const { program } = require("commander");
require('dotenv').config();

function getContractInfo(name) {
  switch (name) {
    case "PoolDebug":
      return poolDebugContractInfo;
    case "Pool":
      return poolContractInfo;
    case "PoolManager":
      return poolManagerInfo;
    case "PoolProxy":
      return poolProxyInfo;
    case "MockStaking":
      return mockStakingInfo;
    case "MockPosRegister":
      return mockPosRegisterInfo;
    default:
      throw new Error(`Unknown contract name: ${name}`);
  }
}

const conflux = new Conflux({
  url: process.env.CFX_RPC_URL,
  networkId: parseInt(process.env.CFX_NETWORK_ID),
});
const account = conflux.wallet.addPrivateKey(process.env.PRIVATE_KEY);

const posRegisterContract = conflux.InternalContract('PoSRegister');

const poolContract = conflux.Contract({
  abi: poolContractInfo.abi,
  address: process.env.POOL_ADDRESS,
});

const poolProxyContract = conflux.Contract({
  abi: poolProxyInfo.abi,
  address: process.env.POOL_ADDRESS,
});

const poolManagerContract = conflux.Contract({
  abi: poolManagerInfo.abi,
  address: process.env.POOL_MANAGER_ADDRESS,
});

program.version("0.0.1");
program
  .option('-d, --debug', 'output extra debugging')

// const options = program.opts();
// if (options.debug) console.log(options);

/* program
  .command('command <args...>')
  .action(async (args) => {
    console.log(args)
  }); */

program
  .command('registerPool')
  .action(async () => {
    const _poolAddress = process.env.POOL_ADDRESS;
    const receipt = await conflux.cfx.sendTransaction({
      from: account.address,
      value: Drip.fromCFX(1000),
      to: _poolAddress,
      data: process.env.POS_REGIST_DATA,
    }).executed();
    console.log(`${receipt.outcomeStatus === 0 ? 'Success': 'Fail'}`);
  });

program
  .command('setLockPeriod <number>')
  .action(async (arg) => {
    const contract = poolContract;
    const receipt = await contract.setLockPeriod(parseInt(arg)).sendTransaction({
      from: account.address,
    }).executed();
    console.log(`${receipt.outcomeStatus === 0 ? 'Success': 'Fail'}`);
  });

program
  .command('setPoolName <name>')
  .action(async (arg, debug) => {
    const contract = poolContract;
    const receipt = await contract.setPoolName(arg).sendTransaction({
      from: account.address,
    }).executed();
    console.log(`${receipt.outcomeStatus === 0 ? 'Success': 'Fail'}`);
  });

program
  .command('restake <amount>')
  .action(async (amount) => {
    const contract = poolContract;
    const receipt = await contract.reStake(parseInt(amount)).sendTransaction({
      from: account.address,
    }).executed();
    console.log(`${receipt.outcomeStatus === 0 ? 'Success': 'Fail'}`);
  });

program
  .command('deploy')
  .argument('<ContractName>', 'Available Contracts: PoolManager, Pool, PoolProxy')
  .action(async (ContractName) => {
    const contractInfo = getContractInfo(ContractName);
    const contract = conflux.Contract({
      abi: contractInfo.abi,
      bytecode: contractInfo.bytecode,
    });
    const receipt = await contract.constructor().sendTransaction({
      from: account.address
    }).executed();
    if (receipt.outcomeStatus) {
      console.log('Deploy failed', receipt);
    } else {
      console.log('Deploy success: ', receipt.contractCreated);
    }
  });

program
  .command('deployDebugPool')
  .action(async (arg) => {
    const contract = conflux.Contract({
      abi: poolDebugContractInfo.abi,
      bytecode: poolDebugContractInfo.bytecode,
    });
    const receipt = await contract.constructor(process.env.MOCK_STAKE, process.env.MOCK_POS_REGISTER).sendTransaction({
      from: account.address
    }).executed();
    if (receipt.outcomeStatus) {
      console.log('Deploy failed', receipt);
    } else {
      console.log('Deploy success: ', receipt.contractCreated);
    }
  });

program
  .command('upgradeContractAddress <address>')
  .action(async (address) => {
    const receipt = await poolProxyContract.upgradeTo(address).sendTransaction({
      from: account.address,
    }).executed();
    console.log(`${receipt.outcomeStatus === 0 ? 'Success': 'Fail'}`);
  });

program
  .command('QueryPoolProxy')
  .action(async () => {
    const address = await poolProxyContract._logicContractAddress();
    console.log(address);
  });

program
  .command('QueryPool')
  .argument('<method>', 'Available methods: poolSummary, userSummary, identifierToAddress, userInQueue, userOutQueue, userInterest, poolAPY, poolName, userInterest, posAddress')
  .argument('[arg]', 'Arguments for the method')
  .action(async (method, arg) => {
    if (!poolContract[method]) {
      console.log('Invalid method');
      return;
    }
    let result
    if (arg) {
      result = await poolContract[method](arg);
    } else {
      result = await poolContract[method]();
    }
    
    console.log(result);
  });

program
  .command('QueryPoolManager')
  .argument('<method>', 'Available methods: getPools, getPoolAddresses')
  .action(async (method) => {
    if (!poolManagerContract[method]) {
      console.log('Invalid method');
      return;
    }
    const result = await poolManagerContract[method]();
    console.log(result);
  });

program
  .command('PoolManager')
  .argument('<method>', 'Available methods: addPool, removePool')
  .argument('<arg>', 'Pool address')
  .action(async (method, arg) => {
    if (!poolManagerContract[method]) {
      console.log('Invalid method');
      return;
    }
    const receipt = await poolManagerContract[method](arg).sendTransaction({
      from: account.address
    }).executed();
    console.log(`${method} ${receipt.outcomeStatus === 0 ? 'Success': 'Fail'}`);
  });

program.parse(process.argv);