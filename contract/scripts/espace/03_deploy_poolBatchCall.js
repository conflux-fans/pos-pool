const { ethers } = require('hardhat');

async function main() {
    const Contract = await ethers.getContractFactory('EPoSPoolBatchCall');

    const contract = await Contract.deploy();
    await contract.deployed();

    console.log('EPoSPoolBatchCall address: ', contract.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});