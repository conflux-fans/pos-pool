/**
 * This script can be used to snapshot PoS's staker info.
 * First it will get all PoS nodes from confluxscan.io
 * Then get node's basic info(powAddress, votes) through internal contract PoSRegister
 * Finally will every node's powAddress if it is a standard pool contract, get all staker info from the pool contract
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
const poolInfo = require("../artifacts/contracts/PoSPool.sol/PoSPool.json");
const fs = require('fs');
const path = require('path');

const conflux = new Conflux({
  url: "https://main.confluxrpc.com",
  networkId: 1029
});

const PoSRegister = conflux.InternalContract('PoSRegister');

async function main() {
  let nodes = await getPoSNodesFromScan();
  await getNodesBasicInfo(nodes);
  nodes = nodes.filter(node => node.votes > 0);  // filter zero votes node
  await getPoolStakersInfo(nodes);

  fs.writeFileSync(path.join(__dirname, './PoSstakerSnapshot.json'), JSON.stringify(nodes, null, 2));
  console.log('Finished');
}

main().catch(console.log);

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
    nodeList = nodeList.concat(body.list.map(item => ({
      posAddress: item.hex,
    })));
    if (body.list.length < LIMIT) break;
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
    console.log(e);
    return []; 
  }
}