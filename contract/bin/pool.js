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
const {Conflux, Drip, format} = require('js-conflux-sdk');
const { program } = require("commander");
require('dotenv').config();

const conflux = new Conflux({
  url: process.env.CFX_RPC_URL,
  networkId: parseInt(process.env.CFX_NETWORK_ID),
});

const poolContract = conflux.Contract({
  abi: poolContractInterface.abi,
  // address: process.env.POOL_DEBUG_ADDRESS,
  address: process.env.POOL_ADDRESS,
});

const poolDebugContract = conflux.Contract({
  abi: poolContractInterface.abi,
  address: process.env.POOL_DEBUG_ADDRESS,
});

const poolManagerContract = conflux.Contract({
  abi: poolManagerInfo.abi,
  address: process.env.POOL_MANAGER_ADDRESS,
});

const posRegisterContract = conflux.InternalContract('PoSRegister');

const account = conflux.wallet.addPrivateKey(process.env.PRIVATE_KEY);

program.version("0.0.1");
program
  .option('-d, --debug', 'output extra debugging')

// const options = program.opts();
// if (options.debug) console.log(options);

program
  .command('command <arg>')
  .action(async (arg) => {

  });

program
  .command('registerPool [debug]')
  .action(async (debug) => {
    const _poolAddress = debug ? process.env.POOL_DEBUG_ADDRESS : process.env.POOL_ADDRESS;
    const receipt = await conflux.cfx.sendTransaction({
      from: account.address,
      value: Drip.fromCFX(1000),
      to: _poolAddress,
      data: process.env.POS_REGIST_DATA,
    }).executed();
    console.log(`${receipt.outcomeStatus === 0 ? 'Success': 'Fail'}`);
  });

program
  .command('setLockPeriod <number> [debug]')
  .action(async (arg, debug) => {
    const contract = debug ? poolDebugContract : poolContract;
    const receipt = await contract.setLockPeriod(parseInt(arg)).sendTransaction({
      from: account.address,
    }).executed();
    console.log(`${receipt.outcomeStatus === 0 ? 'Success': 'Fail'}`);
  });

program
  .command('setPoolName <name> [debug]')
  .action(async (arg, debug) => {
    const contract = debug ? poolDebugContract : poolContract;
    const receipt = await contract.setPoolName(arg).sendTransaction({
      from: account.address,
    }).executed();
    console.log(`${receipt.outcomeStatus === 0 ? 'Success': 'Fail'}`);
  });

program
  .command('poolInfo')
  .action(async (arg) => {
    const poolSummary = await poolContract.poolSummary();
    console.log(poolSummary);
    const poolName = await poolContract.poolName();
    console.log(poolName);
    const poolUserShareRatio = await poolContract.poolUserShareRatio();
    console.log(poolUserShareRatio);
    const apy = await poolContract.poolAPY();
    console.log(apy);
  });

program
  .command('listPool')
  .action(async (arg) => {
    const pools = await poolManagerContract.getPools();
    console.log(pools);
  });

program
  .command('listPoolAddress')
  .action(async (arg) => {
    const pools = await poolManagerContract.getPoolAddresses();
    console.log(pools);
  });

program
  .command('deployPoolManager')
  .action(async () => {
    const contract = conflux.Contract({
      abi: poolManagerInfo.abi,
      bytecode: poolManagerInfo.bytecode,
    });
    const receipt = await contract.constructor().sendTransaction({
      from: account.address
    }).executed();
    if (receipt.outcomeStatus) {
      console.log('deploy failed', receipt);
    } else {
      console.log('deploy success: ', receipt.contractCreated);
    }
  });

program
  .command('deployPool')
  .action(async (arg) => {
    const contract = conflux.Contract({
      abi: poolContractInfo.abi,
      bytecode: poolContractInfo.bytecode,
    });
    const receipt = await contract.constructor().sendTransaction({
      from: account.address
    }).executed();
    if (receipt.outcomeStatus) {
      console.log('deploy failed', receipt);
    } else {
      console.log('deploy success: ', receipt.contractCreated);
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
      console.log('deploy failed', receipt);
    } else {
      console.log('deploy success: ', receipt.contractCreated);
    }
  });

program
  .command('deployMockStake')
  .action(async (arg) => {
    const contract = conflux.Contract({
      abi: mockStakingInfo.abi,
      bytecode: mockStakingInfo.bytecode,
    });
    const receipt = await contract.constructor().sendTransaction({
      from: account.address
    }).executed();
    if (receipt.outcomeStatus) {
      console.log('deploy failed', receipt);
    } else {
      console.log('deploy success: ', receipt.contractCreated);
    }
  });

program
  .command('deployMockPosRegister')
  .action(async (arg) => {
    const contract = conflux.Contract({
      abi: mockPosRegisterInfo.abi,
      bytecode: mockPosRegisterInfo.bytecode,
    });
    const receipt = await contract.constructor().sendTransaction({
      from: account.address
    }).executed();
    if (receipt.outcomeStatus) {
      console.log('deploy failed', receipt);
    } else {
      console.log('deploy success: ', receipt.contractCreated);
    }
  });

program
  .command('addToPoolManager <address>')
  .action(async (arg) => {
    const receipt = await poolManagerContract.addPool(arg).sendTransaction({
      from: account.address
    }).executed();
    console.log(`Add ${receipt.outcomeStatus === 0 ? 'Success': 'Fail'}`);
  });

program
  .command('removeFromPoolManager <address>')
  .action(async (arg) => {
    const receipt = await poolManagerContract.removePool(arg).sendTransaction({
      from: account.address
    }).executed();
    console.log(`Remove ${receipt.outcomeStatus === 0 ? 'Success': 'Fail'}`);
  });

program
  .command('identifierToAddress <identifier>')
  .action(async (identifier) => {
    const address = await posRegisterContract.identifierToAddress(identifier);
    console.log(format.hexAddress(address));
  });

program
  .command('userSummary <address>')
  .action(async (address) => {
    const userSummary = await poolContract.userSummary(address);
    console.log(userSummary);
  });

program
  .command('userInQueue <address>')
  .action(async address => {
    const userInQueue = await poolContract.userInQueue(address);
    console.log(userInQueue);
  });

program
  .command('userOutQueue <address>')
  .action(async address => {
    const userOutQueue = await poolContract.userOutQueue(address);
    console.log(userOutQueue);
  });

program
  .command('userInterest <address>')
  .action(async address => {
    const result = await poolContract.userInterest(address);
    console.log(result);
  });

program
  .command('posAddress')
  .action(async () => {
    const result = await poolContract.posAddress();
    console.log(result);
  });  

program
  .command('register <data>')
  .action(async data => {
    console.log('TODO');
  });

program
  .command('increaseStake <vote>')
  .action(async vote => {
    console.log('TODO');
  });

program
  .command('decreaseStake <vote>')
  .action(async vote => {
    console.log('TODO');
  });

program
  .command('withdrawStake <vote>')
  .action(async vote => {
    console.log('TODO');
  });

program
  .command('claimAllInterest')
  .action(async () => {
    console.log('TODO');
  });

program
  .command('_userShot <address>')
  .action(async address => {
    const result = await poolContract._userShot(address);
    console.log(result);
  });

  program
  .command('_poolShot')
  .action(async () => {
    const result = await poolContract._poolShot();
    console.log(result);
  });

program
  .command('_lastVotePowerSection <address>')
  .action(async address => {
    const result = await poolContract._lastVotePowerSection(address);
    console.log(result);
  });

program
  .command('_lastRewardSection')
  .action(async () => {
    const result = await poolContract._lastRewardSection();
    console.log(result);
  });

program
  .command('_votePowerSections <address>')
  .action(async address => {
    const result = await poolContract._votePowerSections(address);
    console.log(result);
  });

program
  .command('_rewardSections')
  .action(async () => {
    const result = await poolContract._rewardSections();
    console.log(result);
  });


program.parse(process.argv);