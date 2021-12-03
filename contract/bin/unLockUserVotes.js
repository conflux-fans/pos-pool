/* eslint-disable node/no-unpublished-require */
/* eslint-disable no-unused-vars */
/* eslint-disable prettier/prettier */
const poolContractInfo = require("../artifacts/contracts/PoSPool.sol/PoSPool.json");
const {Conflux, Drip, format} = require('js-conflux-sdk');
require("dotenv").config();

const conflux = new Conflux({
  url: process.env.CFX_RPC_URL,
  networkId: parseInt(process.env.CFX_NETWORK_ID),
});

const account = conflux.wallet.addPrivateKey(process.env.PRIVATE_KEY);

const poolContract = conflux.Contract({
  abi: poolContractInfo.abi,
  address: process.env.POOL_ADDRESS,
});

async function main() {
  await unlockUserVotes();
}

main().catch(console.error);

async function unlockUserVotes() {
  const posAccount = await conflux.pos.getAccount(process.env.POS_NODE_ADDRESS);
  const forceRetired = posAccount.status.forceRetired;
  const outQueue = posAccount.status.outQueue;
  /* if (forceRetired == null) {
    console.log("Not forceRetired");
    return;
  } */
  
  if (outQueue.length === 0) {
    console.log("Empty outQueue");
    return;
  }
  const lastOutQueue = outQueue[outQueue.length - 1];
  const posStatus = await conflux.pos.getStatus();
  const powStatus = await conflux.cfx.getStatus();

  const unlockBlockNumber = posUnlockBlockNumberToPow(
    posStatus.latestCommitted,
    lastOutQueue.endBlockNumber,
    powStatus.blockNumber
  );

  const stakerCount = await poolContract.stakerNumber();
  const step = 100;
  for (let i = 0; i < stakerCount; i += step) {
    console.log(`Unlocking from ${i} to ${i + step - 1}`);
    const receipt = await poolContract
      ._retireUserStakes(i, step, unlockBlockNumber)
      .sendTransaction({
        from: account.address,
      })
      .executed();

    console.log(receipt.outcomeStatus === 0 ? "Success" : "Fail");
  }

  // console.log(unlockBlockNumber);
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
    (unlockPosBlockNumber - currentPosBlockNumber) * 60 * 2
  );
}
