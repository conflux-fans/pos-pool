# Manage Core Pool

Common management operations for Core Space Pool.

First, ensure that your local project configuration is complete, such as setting the relevant contract addresses and private keys in the `.env` file; and installing dependencies.

Navigate to the `pos-pool/contract` directory.

## Set Pool Name

```shell
node bin/pool.js Pool setPoolName your-pool-name
```

## Set Pool User Share Ratio

```shell
node bin/pool.js Pool setPoolUserShareRatio 9000
```

Because the base of the ratio is 10000, 9000 represents 90%, which means the pool charges a 10% fee.

## Re-stake the Vote that was force retired

If the machine running the validator node crashes, it may cause the validator to be force retired. In this case, you need to re-stake the vote after the node is back to normal.

```shell
node bin/pool.js restakeVotes
```

## Withdraw pool profit

```sh
node bin/pool.js withdrawPoolProfit your-profit-receiver-address
```