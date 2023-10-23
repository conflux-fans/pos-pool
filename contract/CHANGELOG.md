# CHANGELOG

## v1.3.0

This update introduces the function of locking CFX to obtain voting rights for PoS Pools. After obtaining voting rights, you can participate in Conflux on-chain parameters voting and community governance voting. The means user can obtain PoS staking rewards while participating governance voting.

Check this doc for more details: [v1.3](./docs/v1.3.md)

## v1.2.0

Note: There is a bug in conflux-rust version before `v2.2.0`, Which may lead some security issue for a PoS node. It's recommend every PoS pool update the contract and do the [`pos_key` replace operation](./docs/HowToReplacePosKeyZH.md).

* Add methods to enable/disable pool operations
* Add methods and scripts to enable pool operators to replace PoS key

## v1.1.0

* Adjust PoS unlock period to 1 day and lock period to 13 day for both Core Space and eSpace

To upgrade the contract follow steps should be taken:

1. Deploy new pool implemention contract (the new deployed contract add will be print in command): `node bin/pool.js deploy Pool`
2. Upgrade PoS pool contract to new impl: `node bin/pool.js upgradePoolContract cfx:acfejystd9h506nw9639wegtbb48g2zc9axxxxxxxx`
3. Set the lock period: `node bin/pool.js Pool setLockPeriod 2250000`
4. Set the unlock period: `node bin/pool.js Pool setUnlockPeriod 176400`
