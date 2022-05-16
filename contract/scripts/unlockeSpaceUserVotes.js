require("dotenv").config();
const { ethers } = require("ethers");
const { loadPrivateKey } = require('../utils/index');
const eSpacePoolInfo = require("../artifacts/contracts/eSpace/eSpacePoSPool.sol/ESpacePoSPool.json");
const {conflux, Drip, account} = require("./conflux");

const provider = new ethers.providers.JsonRpcProvider(process.env.ETH_RPC_URL);
const signer = new ethers.Wallet(loadPrivateKey(), provider);

const poolContract = new ethers.Contract(process.env.ESPACE_POOL_ADDRESS, eSpacePoolInfo.abi, signer);

async function main() {
  await unlockUserVotes();
}

main().catch(console.log);

async function unlockUserVotes() {
  const posAccount = await conflux.pos.getAccount(process.env.POS_NODE_ADDRESS);
  const forceRetired = posAccount.status.forceRetired;
  const outQueue = posAccount.status.outQueue;
  if (forceRetired == null) {
    console.log("Not forceRetired");
    return;
  }
  
  if (outQueue.length === 0) {
    console.log("Empty outQueue");
    return;
  }
  const lastOutQueue = outQueue[outQueue.length - 1];
  const posStatus = await conflux.pos.getStatus();
  const blockNumber = await provider.getBlockNumber();

  const unlockBlockNumber = posUnlockBlockNumberToPow(
    posStatus.latestCommitted,
    lastOutQueue.endBlockNumber,
    blockNumber
  );

  const stakerCount = await poolContract.stakerNumber();
  const step = 100;
  for (let i = 0; i < stakerCount; i += step) {
    console.log(`Unlocking from ${i} to ${i + step - 1}`);
    const tx = await poolContract._retireUserStakes(i, step, unlockBlockNumber);
    await tx.wait();
  }

  console.log("Finished");
}

function posUnlockBlockNumberToPow(
  currentPosBlockNumber,
  unlockPosBlockNumber,
  currentPowBlockNumber
) {
  if (currentPosBlockNumber >= unlockPosBlockNumber) {
    return currentPowBlockNumber;
  }
  return (
    currentPowBlockNumber +
    (unlockPosBlockNumber - currentPosBlockNumber) * 60
  );
}