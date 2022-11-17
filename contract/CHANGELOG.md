CHANGELOG
===

## v1.2.0

* Add methods to enable/disable pool operations

## v1.1.0

* Adjust PoS unlock period to 1 day and lock period to 13 day for both Core Space and eSpace

To upgrade the contract follow steps should be taken:

1. Deploy new pool implemention contract (the new deployed contract add will be print in command): `node bin/pool.js deploy Pool`
2. Upgrade PoS pool contract to new impl: `node bin/pool.js upgradePoolContract cfx:acfejystd9h506nw9639wegtbb48g2zc9axxxxxxxx`
3. Set the lock period: `node bin/pool.js Pool setLockPeriod 2250000`
4. Set the unlock period: `node bin/pool.js Pool setUnlockPeriod 176400`
