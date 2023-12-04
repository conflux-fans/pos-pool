const { conflux } = require('hardhat');

async function main() {
    // @ts-ignore
    const [account] = await conflux.getSigners();
    // @ts-ignore
    const PoSPoolBatchCall = await conflux.getContractFactory("PoSPoolBatchCall");

    const receipt = await PoSPoolBatchCall.constructor().sendTransaction({
        from: account,
    }).executed();

    console.log("PoSPoolBatchCall Deployed To:", receipt.contractCreated);
}

main().catch(console.log);
