# conflux-fans/pos-pool 支持 Conflux Governance

Conflux 在 v2.0 的时候 (2021.2) 通过 [CIP-43](https://github.com/Conflux-Chain/CIPs/blob/master/CIPs/cip-43.md) 引入了 PoS 机制，这是一个重大的里程碑。PoS 机制的引入，使得 Conflux 的共识机制从单一的 PoW 机制转变为 PoW + PoS 的混合机制，PoS 节点的作用是对 PoW 节点的出块进行最终性确认，从而进一步提高整条链的安全性。

为了激励用户参与 PoS 节点投票，PoS 也有奖励机制，质押进 PoS 的 CFX 将会获得一个 10%-15% 的年化收益。与此同时社区围绕 PoS 也诞生了一批社区项目，比如 PoS 矿池， LSD 协议等。

[conflux-fans/pos-pool](https://github.com/conflux-fans/pos-pool) 是一个开源 PoS 矿池项目，它的目标是为用户提供一个简单易用的 PoS 质押服务，用户可以通过它来参与 PoS 节点的投票，同时也可以通过它来获取 PoS 节点的奖励。使用它搭建的池子已有多个。

为了进一步推动 PoS 矿池的发展，及 Conflux Governance 发展，conflux-fans/pos-pool 在版本 v1.3 中引入了参与 Conflux 官方 Governance 的功能。用户在 PoS 质押获取奖励的同时， 也可以参与 Conflux 官方 Governance 的投票。

相比于直接在 Confluxhub 上质押 CFX 并参与 Governance，用户可以获取额外的 PoS 奖励。相比于作为 Solo PoS 节点，本方式对于普通用户的门槛更低，更容易参与。

关于 v1.3 的说明和更新方式参看 [v1.3.0](./v1.3.md)。

目前已经升级到 v1.3 的池子有：

1. phx v1
2. Consensus pool
3. ABC pool
4. HydraSF

如果用户有在这四几个池子的 **core 空间**中参与 PoS 质押的话，那么在即可在[Confluxhub 的 Governance 页面](https://confluxhub.io/governance/dashboard)进行锁定操作获取投票权，并对 Conflux 的治理选项进行投票。

### eSpace 质押的 CFX 能参与 Conflux Governance 吗？

目前不支持， 仅支持在 **core 空间**中质押的 CFX 参与 Conflux Governance。

### 如何参与 Conflux Governance？

参与分为两步：

1. 在升级到 v1.3 的池子，切换到 Core 网络，并质押 CFX。
2. 在[Confluxhub 的 Governance 页面](https://confluxhub.io/governance/dashboard)进行锁定和投票操作

### LSD 协议如 Nucelon 和 PHX v2 目前支持 Conflux Governance 吗？

目前不支持，需要它们自定开发相关功能。