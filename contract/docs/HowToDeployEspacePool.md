# How to deploy eSpace PoS Pool

## contracts/eSpace/eSpacePoSPool.sol

This is the pool address that should be deployed in eSpace. It enable user deposit CFX in PoS pool directly in eSpace.

After this contract is deployed, `setBridge` need to be called with `CoreBridge` address by admin.

## contracts/eSpace/CoreBridge.sol

This is the bridge contract, which is used to crossing votes between two space, it need to know eSpace pool address to cross vote and send back interest. It also need to know a Core PoS Pool address to proxy eSpace votes into it.

## Steps to Setup the eSpacePoSPool

Before deploy a Core PoS pool address `CPA` is need to prepared.

1. Deploy `CoreBridge.sol` in Core space, pass `CPA` to it's constructor when deploying. After deploy success will got it's address `CBA`.
2. Deploy `eSpacePoSPool.sol` in eSpace, after deploy success your will got it's address `EPA`.
3. Call `EPA`'s `setBridge` method, with `CBA`'s eSpace `mirror` address.
4. Call `CBA`'s `setESpacePoolAddress` method, with `EPA`.
