const { conflux } = require('hardhat');
const { logReceipt } = require('./conflux.js');
const { InitializeMethodData } = require('../../utils/index.js');

async function main() {
    const [deployer] = await conflux.getSigners();

    const VotingEscrow = await conflux.getContractFactory('VotingEscrow');
    const votingEscrowDeployReceipt = await VotingEscrow.constructor().sendTransaction({
        from: deployer.address,
    }).executed();
    const votingEscrowImplAddr = votingEscrowDeployReceipt.contractCreated;

    const PoSPoolProxy = await conflux.getContractFactory('Proxy1967');
    const proxyDeployReceipt = await PoSPoolProxy.constructor(votingEscrowImplAddr, InitializeMethodData).sendTransaction({
        from: deployer.address,
    }).executed();
    logReceipt(proxyDeployReceipt, 'VotingEscrow deployment');
    
    const votingEscrowAddress = proxyDeployReceipt.contractCreated;
    console.log('VotingEscrow address: ', votingEscrowAddress);

    const votingEscrow = await conflux.getContractAt('VotingEscrow', votingEscrowAddress);

    const setPoSPoolReceipt = await votingEscrow.setPosPool(process.env.POOL_ADDRESS).sendTransaction({
        from: deployer.address,
    }).executed();
    logReceipt(setPoSPoolReceipt, 'VotingEscrow.setPoSPool');

    // set posPool
    const posPool = await conflux.getContractAt('PoSPool', process.env.POOL_ADDRESS);
    const setVotingEscrowReceipt = await posPool.setVotingEscrow(votingEscrowAddress).sendTransaction({
        from: deployer.address,
    }).executed();
    logReceipt(setVotingEscrowReceipt, 'PoSPool.setVotingEscrow');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});