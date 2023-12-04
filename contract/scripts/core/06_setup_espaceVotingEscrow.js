const { conflux } = require('hardhat');
const { logReceipt } = require('./conflux.js');

async function main() {
    const [deployer] = await conflux.getSigners();

    const votingEscrow = await conflux.getContractAt('VotingEscrow', process.env.VOTING_ESCROW);
    const setBridgeReceipt = await votingEscrow.setESpaceBridge(process.env.CORE_BRIDGE).sendTransaction({
        from: deployer.address,
    }).executed();
    logReceipt(setBridgeReceipt, 'VotingEscrow.setESpaceBridge');

    const coreBridge = await conflux.getContractAt('CoreBridge', process.env.CORE_BRIDGE);
    const setVotingEscrowReceipt = await coreBridge.setESpaceVotingEscrow(process.env.ESPACE_VOTING_ESCROW).sendTransaction({
        from: deployer.address,
    }).executed();
    logReceipt(setVotingEscrowReceipt, 'CoreBridge.setESpaceVotingEscrow');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});