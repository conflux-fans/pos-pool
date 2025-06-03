# eSpace Pool Support Governance

To make eSpace Pool support governance, a separate `EVotingEscrow` contract need to deploy.

## Deploy Contract

Add `CORE_SPACE_INFO_ORACLE` in into `.env` file with value:

* mainnet: 0x4CE48b7e15A6120B7DAFC59bA5184085a51C05Ff
* testnet: 0x95Af72EaC6f5e08b6Ab51874582FA8F8C5E93D28

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

## Setup VotingEscrow in PoSPool

```bash
npx hardhat run scripts/espace/05_set_votingEscrow_in_pospool.js --network espaceTestnet
```

## Start the Sync Service

To sync the lock and vote data back to Core Space, we need to start the sync service:

```bash
node service/votingEscrowSyncer.js
```

The service need to run all the time, it's better to use `pm2` to manage it.