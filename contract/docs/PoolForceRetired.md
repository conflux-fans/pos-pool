# Pool forceRetired

## How to know a PoS pool is force retired?

This Pool's Dapp UI will show status of the Pool, if it is error then means your PoS node has been forceRetired.
Actually it use the `pos_getAccount` RPC method to get the PoS node's info, if the `forceRetired` field is true, then the node is forceRetired

## The influence of node forceRetired?

1. All PoS node's votes will be automatically unlock, the unlocking votes will at most lock 14 day
2. There will be no reward if the node is forceRetired
3. The forceRetired status will last for 7 day

## What to do if a PoS pool's node is forceRetired?

If a PoS Pool's node is forceRetired, then its votes will be automatically unlocked. You will need to re-stake all votes after the node's status returns to normal.

The Pool contract provide a method `_restakePosVote` which can be used to do this. 
When a PoS Pool's node is forceRetired you can call it.

```sh
$ node bin/pool.js restakeVotes
```

Then all Pool contract's CFX will be restake.

## How to prevent a node is forceRetired?

To prevent forcible exit when your PoS voting node restarts, it is recommended to perform the following operations:

1. If you run `./conflux rpc local pos stop_election` on the PoS node, the node will return either NULL or a future PoS Block Number. After the command has been executed, the node will not apply to join the PoS committee for the next round.
2. If the Block Number is returned, keep the node running. Run the same command again after the PoS block of the returned block number has been generated (est. several hours later). At this point, NULL should be returned. The node will no longer receive PoS rewards after this block.
3. If NULL is returned, the node is safely stopped. The PoS voting process will resume to normal automatically after the node has been restarted (est. 2-3 hours to generate new PoS rewards).

## Check PoS node's status

If one PoS node is force retired for some reason, all it's votes will be force retired. In this case the pool runner need **manually call PoS pool contract's `_restakePosVote` method to restake user's votes in contract**.

There also is a scripts can do this:

```js
$ node bin/pool.js restakeVotes
```

So it is necessary to have some way monitor your PoS node's status.
