const { ethers } = require('hardhat');
const { InitializeMethodData } = require('../../utils/index.js');

async function main() {
    const EVotingEscrow = await ethers.getContractFactory('EVotingEscrow');

    const eveImpl = await EVotingEscrow.deploy();
    await eveImpl.deployed();

    const Proxy1967 = await ethers.getContractFactory('Proxy1967');
    const proxy = await Proxy1967.deploy(eveImpl.address, InitializeMethodData);
    await proxy.deployed();
    const votingEscrowAddress = proxy.address;
    console.log('EVotingEscrow address: ', votingEscrowAddress);

    const votingEscrow = await ethers.getContractAt('EVotingEscrow', votingEscrowAddress);
    
    const tx0 = await votingEscrow.setCoreSpaceInfoOracle(process.env.CORE_SPACE_INFO_ORACLE);
    await tx0.wait();

    const tx1 = await votingEscrow.setPosPool(process.env.ESPACE_POOL_ADDRESS);
    await tx1.wait();

    console.log('Finished');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});