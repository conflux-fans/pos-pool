#!/usr/bin/env node
/* eslint-disable no-unused-vars */
/* eslint-disable node/no-unpublished-require */
/* eslint-disable prettier/prettier */
require('dotenv').config();
const {Conflux, Drip, format} = require('js-conflux-sdk');
const { program } = require("commander");
const { loadPrivateKey } = require('../utils');
const poolContractInfo = require("../artifacts/contracts/PoSPool.sol/PoSPool.json");
const poolManagerInfo = require("../artifacts/contracts/PoolManager.sol/PoolManager.json");
const votingEscrowContractInfo = require("../artifacts/contracts/VotingEscrow.sol/VotingEscrow.json");

const {
    CFX_RPC_URL,
    CFX_NETWORK_ID,
    POOL_ADDRESS,
    POOL_MANAGER_ADDRESS,
} = process.env;

const conflux = new Conflux({
  url: CFX_RPC_URL,
  networkId: parseInt(CFX_NETWORK_ID),
  // logger: console,
});

const account = conflux.wallet.addPrivateKey(loadPrivateKey());

const poolContract = conflux.Contract({
  abi: poolContractInfo.abi,
  address: POOL_ADDRESS,
});

const poolManagerContract = conflux.Contract({
  abi: poolManagerInfo.abi,
  address: POOL_MANAGER_ADDRESS,
});

program.version("0.0.1");
program
  .option('-d, --debug', 'output extra debugging')

program
  .command('chainStatus [type]')
  .action(async (type) => {
    if (type === 'pos') {
      const status = await conflux.pos.getStatus();
      console.log('PoS Status:', status);
    } else {
      const status = await conflux.cfx.getStatus();
      console.log('PoW Status:', status);
    }
  });

program
  .command('poolStatus [address]')
  .action(async (address) => {
    const poolAddress = address || POOL_ADDRESS;
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
  .argument('<ContractName>', 'Available Contracts: PoolManager, Pool, CoreBridge, PoolProxy')
  .argument('[implAddr]', 'When deploy PoolProxy, need to specify the pool impl address')
  .action(async (ContractName, implAddr) => {
    if (ContractName === 'PoolProxy' && !implAddr) {
        throw new Error('Need to specify the pool impl address');
    }
    const contractInfo = getContractInfo(ContractName);
    const contract = conflux.Contract({
      abi: contractInfo.abi,
      bytecode: contractInfo.bytecode,
    });
    const pendingTx = ContractName === 'PoolProxy' ? contract.constructor(implAddr, '0x8129fc1c') : contract.constructor();
    const receipt = await pendingTx.sendTransaction({
      from: account.address,
    }).executed();
    checkDeployStatus(receipt, 'deploy' + ContractName);
  });

program
  .command('poolBatchCallAddPool')
  .argument('[poolAddr]', 'Pool address')
  .action(async (poolAddr) => {
    const meta = getContractInfo('PoSPoolBatchCall');
    const contract = conflux.Contract({
      abi: meta.abi,
      address: process.env.BATCH_CALL_UTIL
    });
    const receipt = await contract.addPoSPool(poolAddr).sendTransaction({
      from: account.address,
    }).executed();
    checkReceiptStatus(receipt, 'BatchCall util addPoSPool');
  });

program
  .command('deployPoSPool')
  .description('Deploy PoSPool in proxy mode, just deploy contract, not register to PoS')
  .action(async () => {
    // deploy pool implementation
    const contract = conflux.Contract({
      abi: poolContractInfo.abi,
      bytecode: poolContractInfo.bytecode,
    });
    receipt = contract.constructor().sendTransaction({
      from: account.address,
      gasPrice: Drip.fromGDrip(1),
    }).executed();
    if (receipt.outcomeStatus !== 0) {
      console.log('Implementation contract deploy failed: ', receipt.txExecErrorMsg);
      return;
    }
    const implAddr = receipt.contractCreated;
    console.log('Pool implementation address: ', implAddr);

    // deploy pool proxy
    const proxyInfo = getContractInfo('PoolProxy');
    const proxy = conflux.Contract({
      abi: proxyInfo.abi,
      bytecode: proxyInfo.bytecode,
    });
    const initializeAbiName = '0x8129fc1c';
    receipt = await proxy.constructor(implAddr, initializeAbiName).sendTransaction({
      from: account.address
    }).executed();
    checkDeployStatus(receipt, 'deploy PoSPool');
  });

program
  .command('registerPool')
  .action(async () => {
    const receipt = await conflux.cfx.sendTransaction({
      from: account.address,
      value: Drip.fromCFX(1000),
      to: POOL_ADDRESS,
      data: process.env.POS_REGIST_DATA,
    }).executed();
    checkReceiptStatus(receipt, 'Register Pool');
  });

program
  .command('upgradeProxy1967 <proxyAddr> <implAddr>')
  .action(async (proxyAddr, implAddr) => {
    let meta = getContractInfo('PoolProxy');
    let contract = conflux.Contract({
      abi: meta.abi,
      address: proxyAddr
    });
    const receipt = await contract.upgradeTo(implAddr).sendTransaction({
      from: account.address,
    }).executed();
    checkReceiptStatus(receipt, "Upgrade");
  });

program
  .command('Pool')
  .argument('<method>', 'Available methods: setPoolName, setPoolUserShareRatio, setLockPeriod, setUnlockPeriod, _withdrawPoolProfit, addToFeeFreeWhiteList, removeFromFeeFreeWhiteList, setPoolRegisted')
  .argument('[args...]', 'Arguments for the method')
  .action(async (method, args) => {
    // normalize boolean value
    for(let i = 0; i < args.length; i++) {
        if (args[i] === 'true') {
            args[i] = true;
        } else if (args[i] === 'false') {
            args[i] = false;
        }
    }

    const contract = poolContract;
    const receipt = await contract[method](...args).sendTransaction({
        from: account.address,
    }).executed();
    checkReceiptStatus(receipt, method);
  });

program
  .command('QueryPool')
  .argument('<method>', 'Available methods: poolSummary, userSummary, identifierToAddress, userInQueue, userOutQueue, userInterest, poolAPY, poolName, userInterest, posAddress')
  .argument('[args...]', 'Arguments for the method')
  .action(async (method, args) => {
    if (!poolContract[method]) throw new Error ('Invalid method');
    const result = await poolContract[method](...args);
    console.log(result);
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
  .command('QueryPoolManager')
  .argument('<method>', 'Available methods: getPools, getPoolAddresses')
  .action(async (method) => {
    if (!poolManagerContract[method]) throw new Error ('Invalid method');
    const result = await poolManagerContract[method]();
    console.log(result);
  });

program
  .command('PoolManager')
  .argument('<method>', 'Available methods: addPool, removePool')
  .argument('<arg>', 'Pool address')
  .action(async (method, arg) => {
    if (!poolManagerContract[method]) throw new Error ('Invalid method');
    const receipt = await poolManagerContract[method](arg).sendTransaction({
      from: account.address
    }).executed();
    checkReceiptStatus(receipt, method);
  });

program
  .command('PoolManagerSetEspacePool')
  .argument('<arg>', 'corePoolAddr')
  .argument('<arg>', 'ePoolAddr')
  .action(async (corePoolAddr, ePoolAddr) => {
    const receipt = await poolManagerContract.setEspacePool(corePoolAddr, ePoolAddr).sendTransaction({
      from: account.address
    }).executed();
    checkReceiptStatus(receipt, 'setEspacePool');
  });

program
  .command('testCmd')
  .argument('<method>', 'Required arg')
  .argument('[arg...]', 'Arguments for the method')
  .action(async (method, arg) => {
    console.log(method, arg);
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
      return require("../artifacts/contracts/PoSPoolDebug.sol/PoSPoolDebug.json");
    case "Pool":
      return poolContractInfo;
    case "PoolManager":
      return poolManagerInfo;
    case "PoolProxy":
      return require("../artifacts/contracts/utils/Proxy1967.sol/Proxy1967.json");
    case "MockStaking":
      return require("../artifacts/contracts/mocks/Staking.sol/MockStaking.json");
    case "MockPosRegister":
      return require("../artifacts/contracts/mocks/PoSRegister.sol/MockPoSRegister.json");
    case "CoreBridge":
      return require('../artifacts/contracts/eSpace/CoreBridge.sol/CoreBridge.json');
    case "VotingEscrow":
      return votingEscrowContractInfo;
    case "PoSPoolBatchCall":
      return require('../artifacts/contracts/utils/PoSPoolBatchCall.sol/PoSPoolBatchCall.json');
    default:
      throw new Error(`Unknown contract name: ${name}`);
  }
}