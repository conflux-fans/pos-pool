/* eslint-disable prefer-const */
/* eslint-disable prettier/prettier */
const { conflux } = require('./conflux.js');
const poolInfo = require("../artifacts/contracts/PoSPool.sol/PoSPool.json");

async function main() {
  const poolAddress = process.argv[2];
  if (!poolAddress) {
    console.log('Please specify the pool address');
    return;
  }
  const pool = conflux.Contract({
    abi: poolInfo.abi,
    address: poolAddress,
  });

  let stakerNumber = await pool.stakerNumber();
  let stakerInfo = [];
  for(let i = 0; i < stakerNumber; i++) {
    let addr = await pool.stakerAddress(i);
    let userInfo = await pool.userSummary(addr);
    stakerInfo.push({
      address: addr,     
      votes: userInfo.votes,
      available: userInfo.available,
      locked: userInfo.locked,
      unlocked: userInfo.unlocked,
    });
  }

  // TODO: save data into json or csv

  console.log('Finished, total user: ', stakerNumber);
}

main().catch(console.log);