# Deploy eSpace Pool Contract

If you want to enable the eSpace Pool feature, you need to deploy the `CoreBridge` contract and the `ESpacePoSPool` contract.

First, deploy the `CoreBridge` contract with the following command:

```bash
npx hardhat run scripts/core/03_deploy_eSpacePoolBridge.js --network cfxTestnet
```

After the command runs successfully, you will get the `CoreBridge` contract address, and add it to `.env` file as `CORE_BRIDGE`.

Then deploy the `ESpacePoSPool` contract with the following command:

```bash
npx hardhat run scripts/espace/01_deploy_pool.js --network espaceTestnet
```

After the command runs successfully, you will get the `ESpacePoSPool` contract address, and add it to `.env` file as `ESPACE_POOL_ADDRESS`.

Finally, call `setESpacePoolAddress` function of `CoreBridge` contract to set the `ESpacePoSPool` contract address.

```hash
npx hardhat run scripts/core/03_setup_eSpacePoolBridge.js --network cfxTestnet
```

============================================
Conflux network 在 2.0 升级中，不仅引入了 PoS 机制，同时引入了一个兼容以太坊的空间 eSpace，该空间可以理解为一条兼容 EVM 的子链，能够无缝支持以太坊当前的钱包，工具；以太坊 Dapp 可以一键部署迁移；以太坊用户不用学习新的知识，直接上手使用。

原有空间（Core）上的 CFX 和 token 资产可以通过 CrossSpace 内置合约，跨入 eSpace，从而参与 eSpace 的 Defi。考虑到以太坊用户强大的生态和用户，随着时间的积累，会有大量的 CFX 留在 eSpace 空间内。但 eSpace 的 CFX 无法参与 Conflux PoS 获取收益，因为 PoS 是位于 Core 空间的机制。想要参与 PoS 只能将 CFX 跨回 Core 空间，然后使用 Fluent 钱包参与 PoS pool。

为了方便 eSpace 的用户参与 PoS pool 获取收益，我们将矿池合约进行升级，使之能够部署于 eSpace，用户可直接使用 MetaMask 将自己的 CFX 存入 eSpace 矿池，并直接领取收益。使用体验上跟 Core 空间的矿池一样，只是支持用户直接使用 MetaMask 操作，且不需要进行跨空间操作。本质上是由矿池的服务自动做了 CFX 跨空间操作，把用户存进 eSpace 矿池的 CFX 跨回 Core 空间，并放进 PoS，同时定期将 PoS 收益再跨回 eSpace pool。

## eSpace Pool 实现简介

eSpace Pool 实现由三部分组成：

1. eSpace 矿池合约：`contracts/eSpace/eSpacePoSPool.sol`，此合约部署于 eSpace，用户使用 MetaMask 同此合约交互进行 CFX 存取和获取收益。
2. Bridge 合约：`contracts/eSpace/CoreBridge.sol`，此合约部署与 Core 空间，主要负责将 eSpace 矿池中的 CFX 跨回 Core 空间，并存至 Core 中的矿池合约，从而参与 PoS；同时会定期将收益跨回 eSpace 的矿池合约，eSpace 用户可以随时领取收益；除此之外还会负责把用户的 unstake 和 withdraw 操作，代理至 Core 空间，并进行相应的操作。
3. 状态互跨服务：`service/eSpacePoolStatusSyncer.js` 此服务会定期调用 `CoreBridge.sol` 的方法，实现状态同步和 CFX 互跨。

除此之外 `CoreBridge.sol` 会将从 eSpace 跨过来的 CFX 存于 Core 中的一个 PoS Pool 中，因此需要实现确定 Core 中的矿池合约地址。另外简易 `CoreBridge.sol` 和 `eSpacePoSPool.sol` 都使用 Proxy 模式部署，方便处理异常问题。

## 如何部署

如果部署失败或超时请检查部署账号来两个空间的 CFX 余额是否足够，如果足够的话，可再次运行部署脚本。

### 启动同步脚本

```sh
$ DEBUG=espacePoolStatusSyncer service/eSpacePoolStatusSyncer.js
```

该脚本需要保持一直运行。