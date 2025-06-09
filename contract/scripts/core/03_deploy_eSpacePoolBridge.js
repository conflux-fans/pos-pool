const { conflux } = require('hardhat');
const { logReceipt } = require('./conflux.js');
const { InitializeMethodData } = require('../../utils/index.js');

async function main() {
    const [deployer] = await conflux.getSigners();

    // deploy pool manager
    const CoreBridge = await conflux.getContractFactory('CoreBridge');
    const coreBridgeDeployReceipt = await CoreBridge.constructor().sendTransaction({
        from: deployer.address,
    }).executed();
    logReceipt(coreBridgeDeployReceipt, 'CoreBridge implementation deployment');
    
    const implAddr = coreBridgeDeployReceipt.contractCreated;

    const PoSPoolProxy = await conflux.getContractFactory('Proxy1967');
    const poolProxyDeployReceipt = await PoSPoolProxy.constructor(implAddr, InitializeMethodData).sendTransaction({
        from: deployer.address,
    }).executed();
    
    const coreBridgeAddr = poolProxyDeployReceipt.contractCreated;
    console.log('CoreBridge address: ', coreBridgeAddr);

    const coreBridge = await conflux.getContractAt('CoreBridge', coreBridgeAddr);

    // setPoolAddress
    const setPoolAddressReceipt = await coreBridge.setPoolAddress(process.env.POOL_ADDRESS).sendTransaction({
        from: deployer.address,
    }).executed();
    logReceipt(setPoolAddressReceipt, 'CoreBridge setPoolAddress');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});