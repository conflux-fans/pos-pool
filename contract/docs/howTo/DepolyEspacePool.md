# Deploy eSpace Pool Contract

If you want to make your PoS Pool also work for Conflux eSpace users, two more contracts need to be deployed:

* `espace/ESpacePoSPool.sol`: The eSpace version of `PoSPool.sol` contract, deployed in Conflux eSpace.
* `CoreBridge.sol`: A bridge contract deployed in Conflux Core Space, which is used to transfer CFX between Core Space and eSpace.

## Deploy Contracts

**Note: The commands blow are for testnet, if you want to deploy the contracts to mainnet, change the `--network` parameter to `cfxMainnet` or `espaceMainnet`.**

### Step1. Deploy the `CoreBridge` contract:

```bash
npx hardhat run scripts/core/03_deploy_eSpacePoolBridge.js --network cfxTestnet
```

After the command runs successfully, you will get the `CoreBridge` contract address, and add it to `.env` file as `CORE_BRIDGE`.

### Step2. Deploy the `ESpacePoSPool` contract **in eSpace**:

```bash
npx hardhat run scripts/espace/01_deploy_pool.js --network espaceTestnet
```

After the command runs successfully, you will get the `ESpacePoSPool` contract address, and add it to `.env` file as `ESPACE_POOL_ADDRESS`.

### Step3. Call `setESpacePoolAddress` function of `CoreBridge` contract to set the `ESpacePoSPool` contract address.

```hash
npx hardhat run scripts/core/03_setup_eSpacePoolBridge.js --network cfxTestnet
```

### Step4. Set in `PoolManager` contract(Optional)

To show eSpace pool in UI, an additional step is required. If you don't use the default UI, you can skip this step.

The default UI require one eSpace pool is corresponding to one Core Space pool, so you need to set the relation in `PoolManager` contract.

```hash
node bin/pool.js PoolManagerSetEspacePool <core-pool-address> <espace-pool-address>
```

Note: To run this command in a different network, update `.env` file related variables: `CFX_RPC_URL`, `CFX_NETWORK_ID`.

## Start the Sync Service

The sync service is used to sync the status between Core Space and eSpace, and transfer CFX between them. **It needs to be running all the time.**

```sh
DEBUG=espacePoolStatusSyncer node service/eSpacePoolStatusSyncer.js
```

## FAQs

### Why the deployment script failed or timeout?

Check the CFX balance of the deploy account in both Core Space and eSpace, if it's not enough, you need to transfer some CFX to the account.
