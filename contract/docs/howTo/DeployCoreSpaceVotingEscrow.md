# Support for Core Space Governance

Conflux have a governance mechanism. The community can vote for proposals to decide the future of Conflux. Normally users need to use [confluxhub](https://confluxhub.io/governance/dashboard) to lock and vote for proposals. But in this way, users will not get any reward for their locked CFX.

To solve this problem, we add a new feature to the PoS Pool: **Support Governance**. Users can lock their CFX in the PoS Pool, and vote for proposals in Conflux Governance. In this way, users can get reward for their locked CFX.

## Deploy VotingEscrow Contract for Core Space Pool

`VotingEscrow` contract is used to enable Pool users to lock and vote for proposals in Conflux Governance.

To deploy it, run the following command:

```bash
npx hardhat run scripts/core/04_deploy_votingEscrow.js --network cfxTestnet
```

After the command runs successfully, you will get the `VotingEscrow` contract address, and add it to `.env` file as `VOTING_ESCROW`.

## The Lock and Vote Process

The default Pool UI only provide CFX stake and unstake functions. The lock and lock UI functions is provide by [confluxhub](https://confluxhub.io/governance/dashboard).

After your pool's VotingEscrow contract is deployed, you can add your pool in `gov_pools.json` through creating a PR to this repo, after it is merged, then your pool will be listed in Confluxhub gov page.

```json
{
    "mainnet": [
        {
            "name": "PHX V1",
            "address": "cfx:acdj1y1r00mzvuw9s831rj1t5amst2405jv582syu0",
            "icon": "https://pospool.phxverse.com/favicon.ico",
            "website": "https://pospool.phxverse.com/"
        },
        {
            "name": "Your Pool name",
            "address": "<Your pool address>",
            "icon": "<Your pool icon>",
            "website": "<Your pool website URL>"
        }
    ]
}
```