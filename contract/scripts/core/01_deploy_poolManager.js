const { conflux } = require('hardhat');
const { logReceipt } = require('./conflux.js');

async function main() {
    const [deployer] = await conflux.getSigners();

    // deploy pool manager
    const PoolManager = await conflux.getContractFactory('PoolManager');
    const poolManagerDeployReceipt = await PoolManager.constructor().sendTransaction({
        from: deployer.address,
    }).executed();
    logReceipt(poolManagerDeployReceipt, 'PoolManager deployment');
    
    const poolManagerAddr = poolManagerDeployReceipt.contractCreated;
    console.log('PoolManager address: ', poolManagerAddr);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});