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
    

    await increaseStakeOneByOne(len);

    console.log('Finished');
}
  
main().catch(console.error);

async function increaseStakeOneByOne(len) {
    for(let i = 0; i < len; i += 1) {
     
      

        const staker = await poolContract.stakerAddress(i);
        if (staker === account.address) continue;
        const _uSummary = await poolContract.userSummary(staker);

        if (_uSummary.votes > _uSummary.unlocked) {
            console.log(`Staker ${staker}'s vote is not all unlocked`, _uSummary.votes, _uSummary.unlocked);
            const outQueue = await poolContract.userOutQueue(staker);
            console.log(`OutQueue`, outQueue);
            continue;
        }
        try {
            let receipt = await poolContract
            .increaseStakeByAdmin(staker, _uSummary.unlocked)
            .sendTransaction({
                from: account,
            })
            .executed();
        logReceipt(receipt, `increaseStake`);
        } catch (error) {
            console.log(error);   
        }
     
    }
}

 