# 合约介绍

本项目使用 Solidity 开发，开发工具为 hardhat， 所有代码位于 `contracts` 目录下。其中 `contracts/eSpace` 目录下的合约为 eSpace 合约，其他为 Core Space 合约。

整体分为四个模块：

1. Core Space Pool: `PoSPool.sol`
2. eSpace Pool: `eSpace/eSpacePoSPool.sol`, 该合约需要配合 `eSpacePoolBridge.sol` 一块工作。
3. Core Space VotingEscrow: `VotingEscrow.sol`
4. eSpace VotingEscrow: `eSpace/VotingEscrow.sol`

另外包含一系列的辅助合约，如：

1. `PoolManager.sol`: 部署与 Core Space， 用于管理多个 Pool 合约。
2. `utils` 目录中的工具合约.

大部分合约使用了自定义的 `utils/Proxy1967.sol` 实现可升级功能，底层使用了 OpenZeppelin 的 `ERC1967Proxy`。

## `PoSPool.sol`

本合约为矿池核心合约，其核心功能为允许用户质押 CFX 到 PoS 中，并根据用户的质押比例（占整个池子）来计算每个用户的收益。用户可以随时进行解质押操作和提取收益。主要功能包含：

1. 增加 CFX 质押
2. 减少 CFX 质押
3. 提取 CFX 本金
4. 提取收益

核心 interface 如下：

```js
// 增加 pos 投票; 需要同时转账， 金额为 votePower * 1000CFX; 锁定周期为 13 天
function increaseStake(uint64 votePower) external payable;
// 减少 pos 投票; 解锁周期为 1 天
function decreaseStake(uint64 votePower) external;
// 提取本金； 会收到  votePower * 1000 CFX
function withdrawStake(uint64 votePower) external;

// 查询矿池整体信息
function poolSummary() external view returns (PoolSummary memory);
// 查询矿池 APY
function poolAPY() external view returns (uint32);

// 查询用户质押信息
function userSummary(address _user) external view returns (UserSummary memory);
// 查询用户当前可提取收益
function userInterest(address _address) external view returns (uint256);
// 提取指定数量收益
function claimInterest(uint256 amount) external;
// 提取所有收益
function claimAllInterest() external;
```

完整接口参看 `contracts/interfaces/IPoSPool.sol` 和合约源码。其他方法为: **矿池初始化(注册)**, **管理员设置方法**， **Governance 相关方法(锁定&投票)**, 以及更多信息查询方法。

该合约背后调用 `Staking` 和 `PoSRegister` 内置合约进行 CFX 的质押和与 PoS 交互，以及通过  `ParamsControl` 参与 Governance 的链上参数投票。

## eSpace Pool

`eSpace/eSpacePoSPool.sol` 为 eSpace Pool 合约，整体功能和实现与 `PoSPool.sol` 一致，但实际上 eSpace 不能参与 PoS，需要将 CFX 跨回 Core Space 后才能参与 PoS。因此该合约需要配合 `eSpacePoolBridge.sol` 一块工作。

`eSpacePoolBridge.sol` 主要负责将用户 deposit 的 CFX 搬到 Core Space，然后再放进 Core 的 PoSPool 中，另外也负责将 PoS 的收益搬回 eSpace Pool 合约，以便用户提取。

除此之外，如果 eSpace Pool 也开启了 VotingEscrow 功能的话， `eSpacePoolBridge.sol` 也会负责将整个池子的 VotingEscrow 信息搬到 Core Space 中。包括锁定 CFX 获取投票权， 以及参与链上参数投票。

## Core Space `VotingEscrow.sol`

该合约主要为矿池增加参与 Conflux 官方 Governance 功能。该合约，允许用户将自己质押在 PoS Pool 中的 CFX 锁定，以获取投票权，然后参与链上参数投票和社区提案投票。

锁定规则与 Staking 合约一致，但为了简化实现，规定矿池所有用户的锁定截止区块数为季度区块数的整数倍，假设一个季度的区块数为 `QN`，那么用户的锁定截止区块数为 n * QN(大于当前区块数). 其中 n 为正整数。

## eSpace `VotingEscrow.sol`

eSpace 的矿池也支持 VotingEscrow 功能，但由于 `Staking` 和 `ParamsControl` 内置合约均位于 Core Space, 因此 eSpace 的 VotingEscrow 功能需要通过 `eSpacePoolBridge.sol` 与 Core Space 进行交互。

`eSpacePoolBridge.sol` 会负责将 eSpace Pool 的 VotingEscrow 信息搬到 Core Space 中，包括锁定 CFX 获取投票权，以及参与链上参数投票。