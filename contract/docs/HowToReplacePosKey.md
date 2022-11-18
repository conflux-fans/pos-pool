# How to change PoS Key Guide

## How to change PoS Key

For the operator of the PoS mining pool, please follow the below steps:

1. Close the operation function of the mining pool;
2. After all votes are locked, the mining pool administer unlock all users’ votes;
3. After all votes are unlocked by admin, obtain the registration data of the new PoS node, register, and restore the closed operation function of the pool;
4. Stake all unlocked votes of users.

### Pre

#### Upgrade contract code

The closing and restoration operation of mining pool function should be performed with v1.2.0 and above versions. [Click to see how to upgrade contract.](https://github.com/conflux-fans/pos-pool/blob/main/contract/docs/HowToUpgradeContract.md)

#### Set lock & unlock time

After Conflux v2.2.0 hardfork, the lock duration of vote is 13 days, and the unlock duration is 1 day. It is recommended for mining pools to change related parameters.

```shell
node bin/pool.js Pool setLockPeriod 2250000
node bin/pool.js Pool setUnlockPeriod 176400
```

### 1 Close operation function of mining pool

```shell
node bin/pool.js Pool setPoolRegisted false
```

### 2 Unlock all votes

After all votes are locked, the mining pool administer unlocks all users’ votes

```shell
node scripts/replaceKey/unlockAllVotes.js
```

Note: If there are votes not locked before this operation, a notification will pop up and the script will exit.

### 3 Register with new data

When all votes are unlocked, admin can register using new PoS node data. Click to see details in [Confluxscan account information page]( https://confluxscan.net/pos/accounts/0x947c684e270131a1aab8711d2e321fc0e909318d885cfe69d4fc0158aded22d0?tab=right-status). (You need to change the PoS node address into your PoS node address.)

Register with new PoS node data and set the register data in `POS_REGIST_DATA` of the env files.

```shell
node bin/pool.js registerPool
```

Note:

* If you want to get new register data without changing the PoS node, please stop the node, delete `pos_config/pos_key` and `pos_db/secure_storage.json` files, and restart the node. New register data will be generated without changing node.
* To properly close the node, please refer to ‘[How to avoid forceRetire of node]( https://github.com/conflux-fans/pos-pool/blob/main/contract/docs/PoolForceRetired.md)’
* The method to get register data: `./conflux rpc local pos register --power 1`
* Administers can withdraw the ‘1 vote’ used for the original registration and use it in the new register.

### 4 Re-stake all votes of users

When all votes are unlocked, administer re-stakes the votes of all users in the mining pool.

```shell
node scripts/replaceKey/reLockAllVotes.js
```

Note: If there are votes not locked before this operation, a notification will pop up and the script will exit.
