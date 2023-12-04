const { ethers } = require('hardhat');
const { InitializeMethodData } = require('../../utils/index.js');
const { address } = require('js-conflux-sdk');

async function main() {
    const PoSPool = await ethers.getContractFactory('ESpacePoSPool');

    const posPoolImpl = await PoSPool.deploy();
    await posPoolImpl.deployed();

    const Proxy1967 = await ethers.getContractFactory('Proxy1967');
    const posPool = await Proxy1967.deploy(posPoolImpl.address, InitializeMethodData);
    await posPool.deployed();
    console.log('ESpacePoSPool address: ', posPool.address);

    const posPoolReal = await ethers.getContractAt('ESpacePoSPool', posPool.address);
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