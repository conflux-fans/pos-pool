# PoSPool contract

This is the contract code of Conflux PoS pool, which is developed by Solidity. All contracts are in the `contracts` directory. There are four components: 

1. Core Space Pool: `PoSPool.sol`
2. Core Space VotingEscrow: `VotingEscrow.sol`
3. eSpace Pool: `eSpace/eSpacePoSPool.sol` and `eSpacePoolBridge.sol`
4. eSpace VotingEscrow: `eSpace/VotingEscrow.sol`

The `Core Space Pool` is the basic component of the whole project, which manages the user's stake and reward. **The rest three components are optional.**

## Setup

This project uses `hardhat` to compile and test the contract.

1. Install nodejs and npm
2. Clone this repo
3. Install dependencies: `npm install`
4. cp `.env.example` to `.env` and set the env variables:
   1. `ETH_RPC_URL`: Conflux [eSpace RPC URL](https://doc.confluxnetwork.org/docs/espace/network-endpoints)
   2. `CFX_RPC_URL`: Conflux [Core space RPC URL](https://doc.confluxnetwork.org/docs/core/conflux_rpcs)
   3. `PRIVATE_KEY`: Private key of the deployer, **make sure it has enough CFX balance(1200 CFX for Core space, if you want to deploy eSpace pool, you need to have 50 CFX in eSpace)**
   4. `CFX_NETWORK_ID`: Core space network id, 1029 for `mainnet`, 1 for testnet
5. Run `npx hardhat compile` to compile all the contracts

## How to Setup a Basic PoS Pool

### Prepare validator register data

To run a PoS pool, a Conflux node is required. Check Conflux documentation [`run a node`](https://doc.confluxnetwork.org/docs/category/run-a-node) for how to set up a node.

After the node is set up, and the blockchain data is fully synced, you can run this command to get the PoS validator register data:

```bash
# in your node directory
./conflux rpc local pos register --power 1
[
  "0xe335b451bec7e19d019851f49580b6748d00adfb589d42bc0758a5fexxxxxxxx7da46c45000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000030854063b730fa72ff838bef2aa9b09230c95517ba63642e0416b9f76259cf58f6xxxxxxxxe0124a01632979c2ec8d27bf00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002102f96260693bf7fc9b9895098ca260293386d0262be2a74d013c4b766e55faa5c400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000003086e50d6b8580e2dea53252f86b9b66db57fa4000129e06a934069ce334580161fdxxxxxxxx70b41b7c7d90cc60610d5b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002012591fdc1651212ea8f7f3092a4677f5xxxxxxxx26462fc51f4e1113728da85b",
  "bec7exxxxxxxx1f49580b6748d00adfb589d42bc0758a5fecaa1bfdcxxxxxxxx"
]
```

The first string is the `registerData`, and the second string is the pos address of your pos node. Add a variable `POS_REGIST_DATA` in `.env` file, and set it to the `registerData` string.

### Deploy Core Space Pool Contract

There are two contracts that need to be deployed:

* `PoSPool.sol`: The core contract of PoS pool, which is used to manage the user's stake and reward.
* `PoolManager.sol`: A simple manager contract just stores the pool's address.

Step 1. Deploy the `PoolManager` contract:

```bash
npx hardhat run scripts/core/01_deploy_poolManager.js --network cfxTestnet 
```

After the command runs successfully, you will see the `PoolManager` contract address in output, and add it to `.env` file as `POOL_MANAGER_ADDRESS`.

Step 2. Deploy the `PoSPool` contract:

```bash
npx hardhat run scripts/core/02_deploy_pool.js --network cfxTestnet
```

After the command runs successfully, you will get the `PoSPool` contract address, and add it to `.env` file as `POOL_ADDRESS`.

The `PoolManager` address can be used to set up the pool UI, when the UI is ready, Conflux Core Space users can stake CFX to the pool and earn PoS rewards.

**Note: The commands above are for testnet, if you want to deploy the contracts to mainnet, change the `--network` parameter to `cfxMainnet`.**

## Additional Components

If you want your pool to support eSpace, or support participation in Conflux on-chain parameters voting and community governance voting, you need to deploy the additional components. Check related documents for how to deploy them.

* [Deploy eSpace Pool Contract](./docs/howTo/DepolyEspacePool.md)
* [Deploy Core Space Governance](./docs/howTo/DeployCoreSpaceVotingEscrow.md)
* [Deploy eSpace Governance](./docs/howTo/DeployEspaceVotingEscrow.md)

## Other Documents

1. [How to upgrade a Proxy1967 Contract](./docs/howTo/HowToUpgradeContract.md)
2. [How to deal with PoS force retire](./docs/PoolForceRetired.md)
