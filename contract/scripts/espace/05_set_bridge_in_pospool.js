const { ethers } = require('hardhat');
const { address } = require('js-conflux-sdk');

async function main() {
    const posPoolReal = await ethers.getContractAt('ESpacePoSPool', process.env.ESPACE_POOL_ADDRESS);
    const tx0 = await posPoolReal.setPoolName('eSpace pool');
    await tx0.wait();

    const tx = await posPoolReal.setBridge(address.cfxMappedEVMSpaceAddress(process.env.CORE_BRIDGE));
    await tx.wait();
    console.log('Finished');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});