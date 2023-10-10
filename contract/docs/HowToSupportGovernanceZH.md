# How To Support Governance

PoSPool 从 1.3.0 开始将支持 Lock 获取投票权，然后参与 Conflux 链上参数投票及社区治理。

## 锁定规则

矿池中处于 available 状态的 CFX 可用于锁定, 换句话说只有处于 stake 状态的 CFX 可以用于锁定并获取投票权，unstake 之后 CFX 不支持 Lock 操作。

Lock 的数量随意不做限制，锁定的时间点（区块数）只能为一季度区块数量的整数倍，即 2 * 3600 * 24 * 365 / 4 = 15768000 的整数倍：

假设当前的区块号为 183561447, 则当前区块所对应的季度结束区块为 189216000, 则可以锁定的区块数为

1. 一个季度: 189216000 + 15768000 * 1 (每个 CFX 获得 0.25投票权)
2. 两个季度: 189216000 + 15768000 * 2 (每个 CFX 获得 0.5投票权)
3. 三个季度: 189216000 + 15768000 * 3 (每个 CFX 获得 0.5投票权)
4. 四个季度: 189216000 + 15768000 * 4 (每个 CFX 获得 1 投票权)
5. 以此类推: 超过四个季度的锁定(每个 CFX 获得 1 投票权)

锁定之后的 CFX 在锁定期内不可提取，锁定期结束后可以提取。

## 如何升级

升级操作整体分为两步：

### 部署 VotingEscrow 合约

VotingEscrow 合约是新引入的用于管理锁定状态的合约。其提供的功能包括：

1. 锁定信息查询
2. 创建，增加，延长锁定
3. 链上参数投票
4. 链上参数投票数据查询

部署方式如下：

```sh
node bin/pool.js deployVotingEscrow
```

### 升级 PoSPool 并设置

1. 升级 PoSPool 合约

```sh
# 部署新的 PoSPool 实现合约
node bin/pool.js deploy Pool
# 升级合约
node bin/pool.js upgradePoolContract <new pool contract address>
```

2. setVotingEscrow

```sh

# 设置 VotingEscrow 合约地址
node bin/pool.js Pool setVotingEscrow <voting escrow contract address>
```

3. setParamsControl

```sh
# 设置参数控制合约地址
node bin/pool.js Pool setParamsControl
```

## 合约接口

### PoSPool

矿池合约新增两个查询方法：

```js
// 查询本矿池的 votingEscrow 合约地址
function votingEscrow() external view returns (address);
// 查询用户当前的锁定信息: 锁定数量, 锁定区块数
function userLockInfo(address user) external view returns (IVotingEscrow.LockInfo memory);
```

### VotingEscrow

VotingEscrow 合约的接口如下：

```js
interface IVotingEscrow {
    // 锁定信息： 锁定数量，解锁区块数
    struct LockInfo {
        uint256 amount;
        uint256 unlockBlock;
    }

    // 用户当前在矿池中的 stake 数量
    function userStakeAmount(address user) external view returns (uint256);
    // 创建锁定（只允许用户当前未锁定情况下调用此方法）
    function createLock(uint256 amount, uint256 unlockBlock) external;
    // 增加锁定数量
    function increaseLock(uint256 amount) external;
    // 延长锁定时间
    function extendLockTime(uint256 unlockBlock) external;
    // 查询用户当前的锁定信息
    function userLockInfo(address user) external view returns (LockInfo memory);
    // 查询用户当前的投票权
    function userVotePower(address user) external view returns (uint256);
    // 进行链上参数投票: 投票轮次，投票主题索引，各选项投票数量
    function castVote(uint64 vote_round, uint16 topic_index, uint256[3] memory votes) external;
}
```

锁定相关接口:

1. createLock: 创建锁定，获取投票权
2. increaseLock: 增加锁定数量
3. extendLockTime: 延长锁定时间

查询接口:

1. userStakeAmount: 查询用户当前在矿池中可用于锁定的 stake 数量
2. userLockInfo
3. userVotePower

链上参数投票接口:

1. castVote

## FAQs
