const { conflux } = require('hardhat');
const { logReceipt, Drip } = require('./conflux.js');

async function main() {
    const [deployer] = await conflux.getSigners();

    const coreBridge = await conflux.getContractAt('CoreBridge', process.env.CORE_BRIDGE);

    // setESpacePoolAddress
    const setESpacePoolAddressReceipt = await coreBridge.setESpacePoolAddress(process.env.ESPACE_POOL_ADDRESS).sendTransaction({
        from: deployer.address,
    }).executed();
    logReceipt(setESpacePoolAddressReceipt, 'CoreBridge setESpacePoolAddress');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});