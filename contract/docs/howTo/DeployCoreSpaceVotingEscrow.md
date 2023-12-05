### Deploy VotingEscrow Contract for Core Space Pool

To deploy the `VotingEscrow` contract run the following command:

```bash
npx hardhat run scripts/core/04_deploy_votingEscrow.js --network cfxTestnet
```

After the command runs successfully, you will get the `VotingEscrow` contract address, and add it to `.env` file as `VOTING_ESCROW`.