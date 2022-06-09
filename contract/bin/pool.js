#!/usr/bin/env node
/* eslint-disable no-unused-vars */
/* eslint-disable node/no-unpublished-require */
/* eslint-disable prettier/prettier */
require('dotenv').config();
const {Conflux, Drip, format} = require('js-conflux-sdk');
const { program } = require("commander");
const { loadPrivateKey } = require('../utils');
const poolDebugContractInfo = require("../artifacts/contracts/PoSPoolDebug.sol/PoSPoolDebug.json");
const poolContractInfo = require("../artifacts/contracts/PoSPool.sol/PoSPool.json");
const poolManagerInfo = require("../artifacts/contracts/PoolManager.sol/PoolManager.json");
const mockStakingInfo = require("../artifacts/contracts/mocks/Staking.sol/MockStaking.json");
const mockPosRegisterInfo = require("../artifacts/contracts/mocks/PoSRegister.sol/MockPoSRegister.json");
const poolProxyInfo = require("../artifacts/contracts/PoSPoolProxy1967.sol/PoSPoolProxy1967.json");
const coreBridgeInfo = require('../artifacts/contracts/eSpace/CoreBridge.sol/CoreBridge.json');

const conflux = new Conflux({
  url: process.env.CFX_RPC_URL,
  networkId: parseInt(process.env.CFX_NETWORK_ID),
  // logger: console,
});

const account = conflux.wallet.addPrivateKey(loadPrivateKey());

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

program
  .command('chainStatus [type]')
  .action(async (type) => {
    if (type === 'pos') {
      const status = await conflux.pos.getStatus();
      console.log(status);
    } else {
      const status = await conflux.cfx.getStatus();
      console.log(status);
    }
  });

program
  .command('poolStatus [address]')
  .action(async (address) => {
    const poolAddress = address || process.env.POOL_ADDRESS;
    const contract = conflux.Contract({
      address: poolAddress,
      abi: poolContractInfo.abi,
    });

    console.log('\n======== Addresses:');
    console.log('Pool address: ', poolAddress);
    let posAddress = await contract.posAddress();
    posAddress = format.hex(posAddress);
    console.log('PoS node address: ', posAddress);

    console.log('\n======== Pool summary:');
    const poolSummary = await contract.poolSummary();
    console.log(poolSummary);
    const stakerCount = await contract.stakerNumber();
    console.log('Staker count: ', stakerCount);

    const accountInfo = await conflux.cfx.getAccount(poolAddress);
    console.log('\n========Staking balance: ');
    console.log(Drip(accountInfo.stakingBalance).toCFX(), 'CFX');

    console.log('\n======== PoS account info: ');
    const posAccount = await conflux.pos.getAccount(posAddress);
    console.log(`forceRetired: `, posAccount.status.forceRetired);
    console.log('forfeited: ', posAccount.status.forfeited);
    console.log('locked', posAccount.status.locked);
    console.log('availableVotes', posAccount.status.availableVotes);
    console.log('unlocked', posAccount.status.unlocked);
    console.log('inQueue length', posAccount.status.inQueue.length);
    console.log('outQueue length', posAccount.status.outQueue.length);
  });

program
  .command('deploy')
  .argument('<ContractName>', 'Available Contracts: PoolManager, Pool')
  .action(async (ContractName) => {
    const contractInfo = getContractInfo(ContractName);
    const contract = conflux.Contract({
      abi: contractInfo.abi,
      bytecode: contractInfo.bytecode,
    });
    const receipt = await contract.constructor().sendTransaction({
      from: account.address,
      gasPrice: Drip.fromGDrip(1),
    }).executed();
    checkDeployStatus(receipt, 'deploy' + ContractName);
  });

program
  .command('deployProxy')
  .argument('<logicAddress>', 'Logic address')
  .action(async (logicAddress) => {
    const contractInfo = getContractInfo('PoolProxy');
    const contract = conflux.Contract({
      abi: contractInfo.abi,
      bytecode: contractInfo.bytecode,
    });
    const initializeAbiName = '0x8129fc1c';
    const receipt = await contract.constructor(logicAddress, initializeAbiName).sendTransaction({
      from: account.address
    }).executed();
    checkDeployStatus(receipt, 'deploy proxy');
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
    checkDeployStatus(receipt, 'deploy debugPool');
  });

program
  .command('QueryProxyImpl')
  .action(async () => {
    const address = await poolProxyContract.implementation();
    console.log('Implementation address: ', address);
  });

program
  .command('upgradePoolContract <address>')
  .action(async (address) => {
    const receipt = await poolProxyContract.upgradeTo(address).sendTransaction({
      from: account.address,
    }).executed();
    checkReceiptStatus(receipt, "Upgrade");
  });

program
  .command('upgradeCoreBridge <address>')
  .action(async (address) => {
    let contract = conflux.Contract({
      abi: poolProxyInfo.abi,
      address: process.env.ESPACE_POOL_CORE_PROXY
    });
    const receipt = await contract.upgradeTo(address).sendTransaction({
      from: account.address,
    }).executed();
    checkReceiptStatus(receipt, "Upgrade");
  });

program
  .command('CoreBridge')
  .argument('<method>', 'Available methods: withdrawVotesByVotes, withdrawVotes')
  .argument('[arg]', 'Arguments for the method')
  .action(async (method, arg) => {
    let contract = conflux.Contract({
      abi: coreBridgeInfo.abi,
      address: process.env.ESPACE_POOL_CORE_PROXY
    });
    const receipt = await contract[method](arg).sendTransaction({
      from: account.address,
    }).executed();
    checkReceiptStatus(receipt, method);
  });

  program
  .command('Pool')
  .argument('<method>', 'Available methods: setPoolName, setPoolUserShareRatio, setLockPeriod, _withdrawPoolProfit, addToFeeFreeWhiteList, removeFromFeeFreeWhiteList')
  .argument('[arg]', 'Arguments for the method')
  .argument('[value]', 'Transaction value')
  .action(async (method, arg, value=0) => {
    const contract = poolContract;
    const receipt = await contract[method](arg).sendTransaction({
      from: account.address,
      value: Drip.fromCFX(parseInt(value)),
    }).executed();
    checkReceiptStatus(receipt, method);
  });

program
  .command('withdrawPoolProfit')
  .argument('<receiver>', 'Reciver address')
  .action(async (receiver) => {
    const contract = poolContract;
    const poolSummary = await contract.poolSummary();
    const toClaim = poolSummary.interest - BigInt(Drip.fromGDrip(1));
    console.log('Claiming pool profit: ', Drip(toClaim).toCFX());
    const receipt = await contract._withdrawPoolProfit(toClaim).sendTransaction({
      from: account.address,
    }).executed();
    checkReceiptStatus(receipt, '_withdrawPoolProfit');
    const transferReceipt = await conflux.cfx.sendTransaction({
      from: account.address,
      to: receiver,
      value: toClaim
    }).executed();
    checkReceiptStatus(transferReceipt, 'send CFX');
  });

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
    checkReceiptStatus(receipt, 'Register Pool');
  });

program
  .command('retireUserStake <user> <endBlock>')
  .action(async (user, endBlock) => {
    const contract = poolContract;
    const receipt = await contract._retireUserStake(user, parseInt(endBlock)).sendTransaction({
      from: account.address,
    }).executed();
    checkReceiptStatus(receipt, 'retire');
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
    const args = [];
    if (arg) args.push(arg);
    const result = await poolContract[method](...args);
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
    checkReceiptStatus(receipt, method);
  });

program
  .command('PoolManagerSetEspacePool')
  .argument('<arg>', 'Pool address')
  .argument('<arg>', 'Pool address')
  .action(async (corePoolAddr, ePoolAddr) => {
    const receipt = await poolManagerContract.setEspacePool(corePoolAddr, ePoolAddr).sendTransaction({
      from: account.address
    }).executed();
    checkReceiptStatus(receipt, 'setEspacePool');
  });

program
  .command('PoolManagerQueryEPool')
  .argument('<arg>', 'Pool address')
  .action(async (corePoolAddr) => {
    const ePoolAddress = await poolManagerContract.eSpacePoolAddresses(corePoolAddr);
    console.log(format.hexAddress(ePoolAddress));
  });

program.parse(process.argv);

function checkReceiptStatus(receipt, operate) {
  console.log(`${operate} ${receipt.outcomeStatus === 0 ? 'Success': 'Fail'}`);
}

function checkDeployStatus(receipt, operate) {
  console.log(`${operate} ${receipt.outcomeStatus === 0 ? 'Success': 'Fail'}`);
  if (receipt.outcomeStatus === 0) {
    console.log('Deploy success: ', receipt.contractCreated);
  }
}

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