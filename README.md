# Conflux PoS-Pool

**POS-POOL IS A OPEN SOURCED SOFTWARE. USE AT YOUR OWN RISK! WE ASSUME NO RESPONSIBILITY OR LIABILITY IF THERE IS A BUG IN THIS IMPLEMENTATION.**

This is the source code of **Conflux PoS pool dApp**, including Solidity and UI code. Featured with:

* Pool share ratio configurable
* Contract Upgradeable
* Support multiple pools
* Support both Conflux Core and eSpace
* Support participation in Conflux on-chain parameters voting and community governance voting

A PoS pool is a dApp, it allows CFX holders to easily participate in PoS mining without worrying about complex tasks such as node operation and maintenance. Users can stake CFX into the PoS pool and periodically collect earnings. The operators of the PoS pool can extract a certain percentage from the PoS earnings as node operation and maintenance fees

This project is just a reference implementation of PoS pool dApp. It only has the basic features. **Does not guarantee the absence of bugs**, use it on your own risk You can use it as a reference to build your own PoS pool dApp.

## Conflux PoS Basics

Here is a brief introduction to Conflux PoS.

* One PoS vote is 1000 CFX, which means users can only stake multiples of 1000
* Both stake and unstake operations have a lockup period, Stake is 13 days and unstake is 1 day
* The PoS pool reward will be distributed half an hour after the PoS reward is distributed
* The estimated annualized return rate of PoS is 10-14% (subject to the total amount of staking)

You can learn more about Conflux PoS at [it's documentation](https://doc.confluxnetwork.org/docs/general/conflux-basics/consensus-mechanisms/proof-of-stake/pos_overview)

## Prerequisite

To deploy PoS pool [**running a Conflux archive/full node**](https://doc.confluxnetwork.org/docs/category/run-a-node) is required

## Setup

To set up a PoS pool you need to deploy the PoS pool contract and set up the UI.

To build and deploy the PoS pool contract check this [guide](./contract/README.md).

To set up the UI check this [guide](./interface/README.md)

## Disclaimer

It's PoS pool runner's responsibility to keep the PoS pool node running correctly.

## Testnet example

This dApp is already deployed on Conflux Core Space testnet. You can try it out at [Testnet PoS-Pool](https://postest.confluxnetwork.org)

![](./imgs/pool-list-screenshot.png)

## Conflux Mainnet PoS Pool List

There are already some PoS pools running on Conflux Mainnet. For example:

1. PHX V1
2. ABC Pool
3. Consensus pool
4. HydraSF

Check them at the [Conflux PoS Validators List](https://www.conflux-pos-validators.com/)

## FAQs

### Any Important Considerations?

To maintain the PoS Pool, the operator has the following responsibilities:

* Make the node running 24/7
* Upgrade the node to the latest version in time
* Keep the pos_key and contract admin private key safe

### If the node is down, will the user's staking be affected?

Normally, the user's staking is safe even if the node is down, but there will be no earnings during the downtime.

### Is there a slashing mechanism?

Conflux PoS does not have a slashing mechanism, so there is no need to worry about slashing. However, if two or more nodes running with the same **pos_key**, the node's pos votes will be locked forever.