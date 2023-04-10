/**
 * This script can be used to snapshot PoS's staker info.
 * First it will get all PoS nodes from confluxscan.io
 * Then get node's basic info(powAddress, votes) through internal contract PoSRegister
 * Finally will get every node's powAddress if it is a standard pool contract, get all staker info from the pool contract
 * 
 * The result will be saved in PoSstakerSnapshot.json
 * 
 * Fields explain:
 * votes: all PoS votes of this node, including locking, locked, unlocking
 * available: Aavailable votes of one staker, including locking and locked votes
 * stakers: If one node is a standard pool contract, stakers will be an array of staker info
 */
/* eslint-disable prefer-const */
/* eslint-disable prettier/prettier */
// eslint-disable-next-line node/no-extraneous-require
const superagent = require('superagent');
const { Conflux, address } = require('js-conflux-sdk');
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const eSpacePoolList = require('./eSpacePoolList.json');
const eSpacePoolCoreBridges = eSpacePoolList.map(item => item.coreBridgeAddress);
const { ehters } = require('ethers');
const poolInfo = require("../artifacts/contracts/PoSPool.sol/PoSPool.json");
const ePoolInfo = require("../artifacts/contracts/eSpace/eSpacePoSPool.sol/ESpacePoSPool.json");
const { ethers } = require('hardhat');

const conflux = new Conflux({
  // url: "https://main.confluxrpc.com",
  url: 'wss://main.confluxrpc.com/ws',
  networkId: 1029
});

const PoSRegister = conflux.InternalContract('PoSRegister');

const espaceProvider = new ethers.providers.JsonRpcProvider('https://evm.confluxrpc.com');

async function main() {
  await makeSnapshot();
  await convertToCSV();
  await shotESpacePoolStakers();
  console.log('Finished');
}

main().catch(console.log);

async function convertToCSV() {
  let data = require(path.join(__dirname, './PoSstakerSnapshot.json'));
  let stakers = [];
  for(let node of data) {
    if (node.stakers.length > 0) {  // If this node is pool
      for(let staker of node.stakers) {
        // If this staker is a eSpace pool's coreBridge address directly skip it, will be handled in eSpace pool staker list
        if (eSpacePoolCoreBridges.indexOf(staker.address) > -1) continue;
        //
        stakers.push({
          address: staker.address,
          mirrorAddress: address.cfxMappedEVMSpaceAddress(staker.address),
          votes: staker.votes,
          available: staker.available,
          poolAddress: node.powAddress,
          isPoSNode: false,
        });
      }
    } else {  // This is a independent PoS node
      stakers.push({
        address: node.powAddress,
        mirrorAddress: address.cfxMappedEVMSpaceAddress(node.powAddress),
        votes: node.votes,
        available: node.available || 0,
        poolAddress: '',
        isPoSNode: true,
      });
    }
  }
  const json2csvParser = new Parser();
  const csv = json2csvParser.parse(stakers);
  fs.writeFileSync(path.join(__dirname, './PoSstakerSnapshot.csv'), csv);
}

async function makeSnapshot() {
  let nodes = await getPoSNodesFromScan();
  await getNodesBasicInfo(nodes);
  nodes = nodes.filter(node => node.votes > 0);  // filter zero votes node
  await getPoolStakersInfo(nodes);
  fs.writeFileSync(path.join(__dirname, './PoSstakerSnapshot.json'), JSON.stringify(nodes, null, 2));
}

async function shotESpacePoolStakers() {
  let stakers = [];

  for(let pool of eSpacePoolList) {
    const contract = new ethers.Contract(pool.eSpacePoolAddress, ePoolInfo.abi, espaceProvider);
    let stakerNumber = await contract.stakerNumber();
    for(let i = 0; i < stakerNumber; i++) {
      let addr = await contract.stakerAddress(i);
      let userInfo = await contract.userSummary(addr);
      let unlockingAndUnlocked = userInfo.votes.sub(userInfo.available);
      let unlocking = unlockingAndUnlocked.sub(userInfo.unlocked);
      stakers.push({
        address: addr,
        votes: userInfo.available.add(unlocking).toString(),
        available: userInfo.available.toString(),
        pool: pool.eSpacePoolAddress,
      });
    }
  }

  const json2csvParser = new Parser();
  const csv = json2csvParser.parse(stakers);
  fs.writeFileSync(path.join(__dirname, './espacePoSstakerSnapshot.csv'), csv);
  return stakers;
}

async function getPoSNodesFromScan() {
  console.log("Fetching PoS node list from scan");
  const LIMIT = 50;
  let nodeList = [];
  let skip = 0;
  while(true) {
    let url = `https://confluxscan.io/stat/list-pos-account?limit=${LIMIT}&orderBy=createdAt&reverse=true&skip=${skip}`;
    let { status, body } = await superagent.get(url);
    if (status !== 200) {
      throw new Error(`Network error skip=${skip} limit=${LIMIT}`);
    }
    if (body.code !== 0) {
      throw new Error(`API error skip=${skip} limit=${LIMIT}`);
    }
    nodeList = nodeList.concat(body.data.list.map(item => ({
      posAddress: item.hex,
    })));
    if (body.data.list.length < LIMIT) break;
    skip += 50;
  }
  
  return nodeList;
}

async function getNodesBasicInfo(nodes) {
  console.log('Fetching PoS nodes basic info');
  for(let i in nodes) {
    let node = nodes[i];
    let powAddress = await PoSRegister.identifierToAddress(node.posAddress);
    node.powAddress = powAddress;
    let votes = await PoSRegister.getVotes(node.posAddress);
    node.votes = votes[0] - votes[1]; // all PoS votes of this node, including locking, locked, unlocking
    let available = await posAvailable(node.posAddress);
    node.available = available;
  }
}

async function getPoolStakersInfo(nodes) {
  for(let i in nodes) {
    let node = nodes[i];
    let poolAddress = node.powAddress;
    let addrInfo = address.decodeCfxAddress(poolAddress);
    // check powAddress is contract
    if (addrInfo.type.toLowerCase() !== 'contract') {
      node.stakers = [];
      continue;
    }
    // check powAddress has code
    let code = await conflux.getCode(poolAddress);
    if (code === '0x') {
      node.stakers = [];
      continue;
    }
    let stakers = await _getPoolStakers(poolAddress);
    node.stakers = stakers;
  }
}

async function _getPoolStakers(poolAddress) {
  console.log('Fetching stakers info for pool:', poolAddress);
  try {
    const pool = conflux.Contract({
      abi: poolInfo.abi,
      address: poolAddress,
    });
    let stakerNumber = await pool.stakerNumber();
    let stakerInfo = [];
    for(let i = 0; i < stakerNumber; i++) {
      let addr = await pool.stakerAddress(i);
      let userInfo = await pool.userSummary(addr);
      let unlockingAndUnlocked = userInfo.votes - userInfo.available;
      let unlocking = unlockingAndUnlocked - userInfo.unlocked;
      stakerInfo.push({
        address: addr,
        votes: userInfo.available + unlocking,
        available: userInfo.available,
      });
    }
    return stakerInfo;
  } catch(e) {
    // If this contract is not a standard pool contract, directly return empty array
    console.log(e.message);
    return []; 
  }
}

async function posAvailable(posAddress) {
  let accountInfo = await conflux.pos.getAccount(posAddress);
  return accountInfo ? accountInfo.status.availableVotes : 0;
}
