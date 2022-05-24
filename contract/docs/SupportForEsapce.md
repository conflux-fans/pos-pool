# Support for eSpace

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

### 准备部署账号和配置

部署前，需要先准备好用于部署合约的账户，将账户私钥配置到 .env 中的 `PRIVATE_KEY`, 并往该账号在 Core 和 eSpace 各发送一些 CFX。（Core 10 CFX， eSpace 5 CFX）。
另外在 .env 中配置好如下配置项:

```sh
# 主网配置
CFX_RPC_URL=https://main.confluxrpc.com
CFX_NETWORK_ID=1029
ETH_RPC_URL=https://evm.confluxrpc.com
# Core 中的矿池地址
POOL_ADDRESS=
```

### 部署合约

执行部署脚本：

```sh
$ node scripts/deployESpacePool.js
```

该脚本会将 `CoreBridge.sol` 以及 `eSpacePoSPool.sol` 合约以 Proxy 模式部署到各自的空间，并把合约的地址打印出来。

```sh
CoreBridge impl address:  cfxtest:acc8zet1sch6m901n2v43bgznsxuwfhzn6kahaxepj
CoreBridge address:  cfxtest:acc0afp55t8kjfmgbxsk936e9s54ta1yba6fd51hzf
CoreBridge mirror address:  0xd7F1c9057Bd0dcDe73bB15e2f394A3CD2664744B
eSpacePool impl address: 0x403b820A0DA26F8500c7939FBcDC1832d8a3564f
eSpacePool address:  0xf3Bdb4D5cC67A0b061B99872E68339B70EAf5d33
```

其中的 `CoreBridge address` 即为 `CoreBridge.sol` 在 Core 中的地址. `eSpacePool address` 则为 eSpace 中的矿池地址。然后需要将 `CoreBridge address` 添加到 .env 中的 `ESPACE_POOL_CORE_PROXY` 项。

```sh
ESPACE_POOL_CORE_PROXY=cfxtest:acc0afp55t8kjfmgbxsk936e9s54ta1yba6fd51hzf
```

如果部署失败或超时请检查部署账号来两个空间的 CFX 余额是否足够，如果足够的话，可再次运行部署脚本。

### 启动同步脚本

```sh
$ DEBUG=espacePoolStatusSyncer service/eSpacePoolStatusSyncer.js
```

该脚本需要保持一直运行。