# eSpace Pool Support Governance

To make eSpace Pool support governance, a separate `EVotingEscrow` contract need to deploy.

## Deploy Contract

To deploy it run the following command:

```bash
npx hardhat run scripts/espace/02_deploy_votingEscrow.js --network espaceTestnet
```

After the command runs successfully, you will get the `EVotingEscrow` contract address, and add it to `.env` file as `ESPACE_VOTING_ESCROW`.

## Setup CoreBridge

Then we need to set the `EVotingEscrow` contract address in `CoreBridge` contract:

```bash
npx hardhat run scripts/core/06_setup_espaceVotingEscrow.js --network cfxTestnet
```

## Start the Sync Service

To sync the lock and vote data back to Core Space, we need to start the sync service:

```bash
node service/votingEscrowSyncer.js
```

The service need to run all the time, it's better to use `pm2` to manage it.