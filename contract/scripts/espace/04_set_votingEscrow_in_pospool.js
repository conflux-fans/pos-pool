const { ethers } = require('hardhat');

async function main() {
    const posPoolReal = await ethers.getContractAt('ESpacePoSPool', process.env.ESPACE_POOL_ADDRESS);
    const tx0 = await posPoolReal.setVotingEscrow(process.env.ESPACE_VOTING_ESCROW);
    await tx0.wait();

    console.log('Finished');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});