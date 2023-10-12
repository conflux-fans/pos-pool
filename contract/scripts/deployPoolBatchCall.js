const { conflux } = require('hardhat');

async function main() {
    // @ts-ignore
    const [account] = await conflux.getSigners();
    // @ts-ignore
    const PoSPoolBatchCall = await conflux.getContractFactory("PoSPoolBatchCall");

    /* let submiter = 'cfxtest:aak6rc909w6nppbj36xnj4nt0yeux0zg3pt2b4wrxk';
    let receipt = await Governance.addSubmiter().sendTransaction({
        from: account,
    }).executed(); */

    const receipt = await PoSPoolBatchCall.constructor().sendTransaction({
        from: account,
    }).executed();

    console.log("Deploy:", receipt.contractCreated);
}

main().catch(console.log);
