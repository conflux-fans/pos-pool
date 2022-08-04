# How to Deploy Core PoSPool Contracts

## Contracts Intro

All contracts are in the `contracts` folder:

* `PoSPool.sol`: This is the pool logic methods
* `PoSPoolProxy1967.sol`: This is the pool proxy contract, used to make the pool logic upgradable.
* `PoolManager.sol`: A simple manager contract just store pool's address.

## Precondition

1. A Conflux account with at least `1050 CFX`, which will be used to deploy contracts and provide first vote to register in PoS
2. Node.js environment installed
3. A Conflux running node
4. PoS node register data, which can be get with below command in PoS node host machine:

```sh
$ ./conflux rpc local pos register --power 1
```

![](https://pic1.zhimg.com/80/v2-7044b4ec2c74b6a4a6078e59434a7fe1_1440w.png)

The first item is register data.

## Bootstrap

Clone the code, and install the dependencies with npm

```sh
$ git clone https://github.com/conflux-fans/pos-pool.git
$ cd contract
$ npm install
```

Then compile the contracts

```sh
$ npx hardhat compile
```

Before deploying pool contracts create a `.env` from it's template `.env.example` and set below options in it

* `CFX_RPC_URL` Conflux RPC endpoint url
* `CFX_NETWORK_ID` Conflux network id, mainnet is 1029, testnet is 1
* `PRIVATE_KEY` - The account privateKey which will be used to deploy contracts, make sure it have enough CFX (1050CFX).
* `POS_REGIST_DATA` - PoS register data

## Deploy with CLI

There is a CLI in `bin`, which can used to deploy contract and setup them.

```sh
Usage: pool [options] [command]

Options:
  -V, --version                         output the version number
  -d, --debug                           output extra debugging
  -h, --help                            display help for command

Commands:
  chainStatus [type]
  poolStatus [address]
  deploy <ContractName>
  deployProxy <logicAddress>
  deployDebugPool
  QueryProxyImpl
  upgradePoolContract <address>
  upgradeCoreBridge <address>
  CoreBridge <method> [arg]
  Pool <method> [arg] [value]
  withdrawPoolProfit <receiver>
  registerPool
  retireUserStake <user> <endBlock>
  QueryPool <method> [arg]
  QueryPoolManager <method>
  PoolManager <method> <arg>
  PoolManagerSetEspacePool <arg> <arg>
  PoolManagerQueryEPool <arg>
  help [command]                        display help for command
```

### Step 1 - Deploy PoolManager

```sh
$ bin/pool.js deploy PoolManager
Deploy success: NET8888:TYPE.CONTRACT:ACC7ANC643M4W2VUHRNP5F0ZGZHUW8ZK6AENY2XB11
```

Config `POOL_MANAGER_ADDRESS` with new deployed `PoolManager` address in `.env`

### Step 2 - Deploy PoSPool contract

Then you can deploy the `PoSPool`

```sh
$ bin/pool.js deployPoSPool
Deploy success: NET8888:TYPE.CONTRACT:ACF0H9U3WYZ1EUSH5EW04MPK6GN43HA1A6FWG7ZB0W
```

Config `POOL_ADDRESS` with new deployed `PoolProxy1967` address in `.env`

### Step 3 - Set poolName

```sh
$ bin/pool.js Pool setPoolName YourChoosePoolName
```

### Step 4 - Regist pool

Set your PoS node's register data and set `POS_REGIST_DATA` in `.env`.

```sh
$ bin/pool.js registerPool
```

### Step 5 - Add pool to poolManager

```sh
$ bin/pool.js PoolManager addPool NET8888:TYPE.CONTRACT:ACF0H9U3WYZ1EUSH5EW04MPK6GN43HA1A6FWG7ZB0W
```

## Deploy with one scripts

There is also a scripts can quickly deply a new PoS pool and regist it, also add it to PoolManager

```sh
$ node scripts/deployPool.js THE-REGISTER-DATA
```

You need set PoS pool name manually.

