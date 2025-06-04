# CHANGELOG

## v1.6.0

### Core Space PoSPool contract

The contract upgrade permission and Pool management permission are separated to achieve more granular permission management. After the upgrade, the contract will have two roles: `owner` and `manager`. The former can upgrade the contract and set other addresses, while the latter mainly has the authority to manage the Pool (such as name, ratio, period, etc.).

For the upgrade process, refer to [HowToUpgradeContract.md](./docs/howTo/HowToUpgradeContract.md). After the upgrade, the owner needs to call the setManager method to initialize the manager.

## v1.5.0

Change the `TOTAL_TOPIC` of VotingEscrow.sol and eSpacePoolBridge.sol from 3 to 4.

## v1.4.0

Support eSpace pool to lock CFX to obtain voting rights for Conflux Governance.

## v1.3.0

This version introduces the function of locking CFX to obtain voting rights for PoS Pools. After obtaining voting rights, you can participate in Conflux on-chain parameters voting and community governance voting. The means user can obtain PoS staking rewards while participating governance voting.

Check this doc for more details: [v1.3](./docs/v1.3.md)

## v1.2.0

Note: There is a bug in conflux-rust version before `v2.2.0`, Which may lead some security issue for a PoS node. It's recommend every PoS pool update the contract and do the [`pos_key` replace operation](./docs/HowToReplacePosKeyZH.md).

* Add methods to enable/disable pool operations
* Add methods and scripts to enable pool operators to replace PoS key

## v1.1.0

* Adjust PoS unlock period to 1 day and lock period to 13 day for both Core Space and eSpace

To upgrade the contract follow steps should be taken:

1. Deploy new pool implementation contract (the new deployed contract add will be print in command): `node bin/pool.js deploy Pool`
2. Upgrade PoS pool contract to new impl: `node bin/pool.js upgradePoolContract cfx:acfejystd9h506nw9639wegtbb48g2zc9axxxxxxxx`
3. Set the lock period: `node bin/pool.js Pool setLockPeriod 2250000`
4. Set the unlock period: `node bin/pool.js Pool setUnlockPeriod 176400`
