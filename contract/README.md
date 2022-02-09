# PoSPool contract

This is the contract code of PoS pool, which are developed by Solidity. Featured with:

* Pool share ratio configuable
* Upgradeable
* Provide `PoolManager` to manage serveral PoS pool 

## Main contracts

All contracts are in the `contracts` folder:

* `PoSPool.sol`: This is the pool logic methods
* `PoSPoolProxy1967.sol`: This is the pool proxy contract, used to make the pool logic upgradable.
* `PoolManager.sol`: A simple manager contract just store pool's address.

## Deploy process

1. Deploy `PoolManager.sol` then get pool manager's address `PMA`.
2. Deploy `PoSPool.sol` then get pool's address `P`.
3. Deploy `PoSPoolProxy1967.sol`, use `P` as constructor's parameter, then get poolProxy's address `PA`.
4. Invoke `PA`'s `setPoolName` to set pool's name
5. Invoke `PA`'s register method (with `PoSPool`'s ABI) to regist it in PoS, the votePower is `1 vote`, which mean `1000 CFX`
6. Invoke `PMA`'s `addPool` method to add `PA` to PoolManager.

If want to add more pool to PoolManager then walk through step `2-6`.

`PoSPool.sol` have several method to config Pool's contract:

1. `setPoolUserShareRatio` to set poolUserShareRatio, which's default value is 90%
2. `setLockPeriod` to set pool stake&unstake lock period, which's default value is `7 day block number`(`2 * 3600 * 24 * 7`)

## CLI

There is a CLI in `bin`, which can used to deploy contract and setup them.

```sh
To gain a performance boost install @conflux-dev/conflux-address-rust
Usage: pool [options] [command]

Options:
  -V, --version                      output the version number
  -d, --debug                        output extra debugging
  -h, --help                         display help for command

Commands:
  chainStatus [type]
  poolStatus [address]
  registerPool
  setLockPeriod <number>
  setPoolName <name>
  Pool <method> [arg] [value]
  restake <amount>
  retireUserStake <user> <endBlock>
  deploy <ContractName>
  deployProxy <logicAddress>
  deployDebugPool
  upgradePoolContract <address>
  QueryPoolProxy
  QueryPool <method> [arg]
  QueryPoolManager <method>
  PoolManager <method> <arg>
  help [command]                     display help for command
```

### Step 1 - Config env file

First you need create a `.env` from it's template `.env.example` and set the `CFX_RPC_URL`, `CFX_NETWORK_ID`, `PRIVATE_KEY` and make sure the `PRIVATE_KEY`'s address have enough CFX.

### Step 2 - Deploy contract

Then you can deploy the `PoolManager`, `PoolProxy1967`, `Pool`

```sh
$ bin/pool.js deploy PoolManager
Deploy success: NET8888:TYPE.CONTRACT:ACC7ANC643M4W2VUHRNP5F0ZGZHUW8ZK6AENY2XB11

$ bin/pool.js deploy Pool
Deploy success: NET8888:TYPE.CONTRACT:ACED7ZXFESKFFVR595J9KVS702C7D66SCUAMGHDPAA

$ bin/pool.js deployProxy NET8888:TYPE.CONTRACT:ACED7ZXFESKFFVR595J9KVS702C7D66SCUAMGHDPAA
Deploy success: NET8888:TYPE.CONTRACT:ACF0H9U3WYZ1EUSH5EW04MPK6GN43HA1A6FWG7ZB0W
```

### Step 3 - Config contract address

Config `POOL_MANAGER_ADDRESS`, `POOL_ADDRESS` with new deployed `PoolManager` and `PoolProxy1967` address in `.env`

**Note POOL_ADDRESS is configured to PoolProxy address**

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

## scripts/deployPool.js

There is a scripts can quickly deply a new PoS pool and regist it, also add it to PoolManager

```sh
$ node scripts/deployPool.js THE-REGISTER-DATA
```

You need set PoS pool name manually.

## Check PoS node's status

If one PoS node is force retired for some reason, all it's votes will be force retired. In this case the pool runner need **manually call PoS pool contract's `_retireUserStakes` method to unlock user's votes in contract**.

There also is a scripts can do this:

```js
$ node scripts/unLockUserVotes.js
```

So it is necessary to have some way monitor your PoS node's status.