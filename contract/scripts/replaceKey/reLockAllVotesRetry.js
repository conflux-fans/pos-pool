require("dotenv").config();
const fs = require('fs');

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
    var addressList="";
    if(fs.existsSync("./userAddress.txt")){
        var buffer = fs.readFileSync("./userAddress.txt");
        var addressList=buffer.toString();
    }
    
    console.log("Existed Adress List"+addressList);

    for(let i = 0; i < len; i += 1) {
     
        const staker = await poolContract.stakerAddress(i);
        if(addressList.indexOf(staker)>-1){
            console.log(staker+"existed in user address");
            continue;
        } 

        if (staker === account.address) continue;
        const _uSummary = await poolContract.userSummary(staker);

        if (_uSummary.votes > _uSummary.unlocked) {
            console.log(`Staker ${staker}'s vote is not all unlocked`, _uSummary.votes, _uSummary.unlocked);
            const outQueue = await poolContract.userOutQueue(staker);
            console.log(`OutQueue`, outQueue);
            fs.appendFile("./userAddress.txt",  staker+ "\n",()=>{} ); 
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

 