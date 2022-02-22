# Pool forceRetired

## How to know a PoS pool is force retired?

This Pool's Dapp UI will show status of the Pool, if it is error then means your PoS node has been forceRetired.
Actually it use the `pos_getAccount` RPC method to get the PoS node's info, if the `forceRetired` field is true, then the node is forceRetired

## The influence of node forceRetired?

1. All PoS node's votes will be automatically unlock, the unlocking votes will at most lock 14 day
2. There will be no reward if the node is forceRetired
3. The forceRetired status will last for 7 day

## What to do if a PoS pool's node is forceRetired?

If a PoS Pool's node is foreceRetired then it's votes will be automatic unlock, and the Pool contract's CFX state should also change to unlock to keep consistent with PoS node.

The Pool contract provide a method `_retireUserStake` which can be used to do this. There also is a script `scripts/unLockUserVotes.js` which is wroten just for this.
When a PoS Pool's node is forceRetired you can call it.

```sh
$ node scripts/unLockUserVotes.js
```

Then all Pool contract's CFX will be in unlocking state.

## How to prevent a node is forceRetired?

To prevent forcible exit when your PoS voting node restarts, it is recommended to perform the following operations:

1. If you run `./conflux RPC local PoS stop_election` on the PoS node, the node will return either NULL or a future PoS Block Number. After the command has been executed, the node will not apply to join the PoS committee for the next round.
2. If the Block Number is returned, keep the node running. Run the same command again after the PoS block of the returned block number has been generated (est. several hours later). At this point, NULL should be returned. The node will no longer receive PoS rewards after this block.
3. If NULL is returned, the node is safely stopped. The PoS voting process will resume to normal automatically after the node has been restarted (est. 2-3 hours to generate new PoS rewards).

