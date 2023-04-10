# Contract upgrade

This project use oz ERC1967Proxy to achive the contract upgradability.

## How to

Before upgrade run `npx hardhat compile` to generate the newest contract bytecode.

1. Deploy the new `PoSPool.sol` contract, get the new implementation address IA

```sh
$  node bin/pool.js deploy Pool
Deploy success: cfxtest:acg4829dee10gg2ccjfx5pc7fdn1dwxy12a2j3ua11
```

2. Invoke the `PoSPoolProxy1967.sol` contract's upgradeTo method to update the Pool contract

```sh
$ node bin/pool.js upgradePoolContract cfxtest:acg4829dee10gg2ccjfx5pc7fdn1dwxy12a2j3ua11
Upgrade success
```

Note: Contract upgrade is a dangerous operation, it's better to exactly know what the new implementation has changed.