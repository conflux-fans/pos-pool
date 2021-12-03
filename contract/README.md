# PoSPool contract

This is the contract code of PoS pool, which are developed by Solidity.

## Main contracts

All contracts are in the `contracts` folder:

* `PoSPoolStorage.sol`: Define all the storage variable the pool contract used
* `PoSPool.sol`: This is the pool logic methods
* `IPoSPool.sol`: Interface of PoSPool
* `PoSPoolProxy.sol`: This is the pool proxy contract, used to make the pool logic upgradable.
* `PoolManager.sol`: A simple manager contract just store pool's address.

## Deploy process

1. Deploy `PoolManager.sol` then get pool manager's address `PMA`.
2. Deploy `PoSPool.sol` then get pool's address `P`.
3. Deploy `PoSPoolProxy.sol` then get poolProxy's address `PA`.
4. Invoke `PA`'s `setLogicContractAddress` method to set proxy's logic contract address to `P`.
5. Invoke `PA`'s `setPoolName` to set pool's name
6. Invoke `PA`'s register method (with `PoSPool`'s ABI) to regist it in PoS, the votePower is `1 vote`, which mean `1000 CFX`
7. Invoke `PMA`'s `addPool` method to add `PA` to PoolManager.

If want to add more pool to PoolManager then walk through step `2-6`.

`PoSPool.sol` have several method to config Pool's contract:

1. `setPoolUserShareRatio` to set poolUserShareRatio, which's default value is 90%
2. `setLockPeriod` to set pool stake&unstake lock period, which's default value is `7 day block number`(`2 * 3600 * 24 * 7`)

## CLI

There is a CLI in `bin`, which can used to deploy contract and setup them.

```sh
$ bin/pool.js -h
Usage: pool [options] [command]

Options:
  -V, --version                      output the version number
  -d, --debug                        output extra debugging
  -h, --help                         display help for command

Commands:
  registerPool
  setLogicContractAddress <address>
  setLockPeriod <number>
  setPoolName <name>
  deploy <ContractName>
  deployDebugPool
  QueryPool <method> [arg]
  QueryPoolManager <method>
  PoolManager <method> <arg>
```

### Step 1 - Config env file

First you need create a `.env` from it's template `.env.example` and set the `CFX_RPC_URL`, `CFX_NETWORK_ID`, `PRIVATE_KEY` and make sure the `PRIVATE_KEY`'s address have enough CFX.

### Step 2 - Deploy contract

Then you can deploy the `PoolManager`, `PoolProxy`, `Pool`

```sh
$ bin/pool.js deploy PoolManager
Deploy success: NET8888:TYPE.CONTRACT:ACC7ANC643M4W2VUHRNP5F0ZGZHUW8ZK6AENY2XB11

$ bin/pool.js deploy Pool
Deploy success: NET8888:TYPE.CONTRACT:ACED7ZXFESKFFVR595J9KVS702C7D66SCUAMGHDPAA

$ bin/pool.js deploy PoolProxy
Deploy success: NET8888:TYPE.CONTRACT:ACF0H9U3WYZ1EUSH5EW04MPK6GN43HA1A6FWG7ZB0W
```

### Step 3 - Config contract address

Config `POOL_MANAGER_ADDRESS`, `POOL_ADDRESS` with new deployed `PoolManager` and `PoolProxy` address in `.env`

**Note POOL_ADDRESS is configured to PoolProxy address**

### Step 4 - Set PoolProxy's logic contract

```sh
$ bin/pool.js setLogicContractAddress NET8888:TYPE.CONTRACT:ACED7ZXFESKFFVR595J9KVS702C7D66SCUAMGHDPAA
```

### Step 5 - Set poolName

```sh
$ bin/pool.js setPoolName YourChoosePoolName
```

### Step 6 - Regist pool

Set your PoS node's register data and set `POS_REGIST_DATA` in `.env`

```sh
$ bin/pool.js registerPool
```

### Step 6 - Add pool to poolManager

```sh
$ bin/pool.js PoolManager addPool NET8888:TYPE.CONTRACT:ACF0H9U3WYZ1EUSH5EW04MPK6GN43HA1A6FWG7ZB0W
```
