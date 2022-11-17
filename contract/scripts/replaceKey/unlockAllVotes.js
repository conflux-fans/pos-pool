require("dotenv").config();
const {conflux, Drip, account, logReceipt} = require("../conflux");
const poolContractInfo = require("../../artifacts/contracts/PoSPool.sol/PoSPool.json");

const poolContract = conflux.Contract({
    abi: poolContractInfo.abi,
    address: process.env.POOL_ADDRESS,
});

async function main() {
    const len = await poolContract.stakerNumber();
    console.log('Staker number', len);
    
    let allLocked = await isAllVotesLocked(len);
    if (!allLocked) {
        console.log("Not all votes are locked, can't unlock");
        return;
    }

    await decreaseStakeOneByOne(len);
    
    console.log('Finished');
}
  
main().catch(console.error);

async function decreaseStakeOneByOne(len) {
    for(let i = 0; i < len; i += 1) {
        const staker = await poolContract.stakerAddress(i);
        const _uSummary = await poolContract.userSummary(staker);
        if (_uSummary.locked === 0) continue;
        let receipt = await poolContract
            .decreaseStakeByAdmin(staker, _uSummary.locked)
            .sendTransaction({
                from: account,
            })
            .executed();
        logReceipt(receipt, `decreaseStake`);
    }
}

async function isAllVotesLocked(len) {
    for(let i = 0; i < len; i++) {
        const staker = await poolContract.stakerAddress(i);
        const _uSummary = await poolContract.userSummary(staker);
        if (_uSummary.available > _uSummary.locked) {
            console.log(`Staker ${staker}'s vote is not all locked`, _uSummary.available, _uSummary.locked);
            const inQueue = await poolContract.userInQueue(staker);
            console.log(`Inqueue`, inQueue);
            return false;
        }
    }
    return true;
}
