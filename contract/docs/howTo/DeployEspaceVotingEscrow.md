### Deploy VotingEscrow Contract for eSpace Pool

To deploy the `EVotingEscrow` contract run the following command:

```bash
npx hardhat run scripts/espace/02_deploy_votingEscrow.js --network espaceTestnet
```

After the command runs successfully, you will get the `EVotingEscrow` contract address, and add it to `.env` file as `ESPACE_VOTING_ESCROW`.

Then we need to set the `EVotingEscrow` contract address in `CoreBridge` contract:

```bash
npx hardhat run scripts/core/06_setup_espaceVotingEscrow.js --network cfxTestnet
```