# eSpace Pool Support VotingEscrow

## The whitelist

`gov_pools.json` 是一个白名单文件，里面包含了所有支持 Conflux Governance 的 PoS Pool 的信息。新增加了 `eSpaceMainnet` 和 `eSpaceTestnet` 两个列表， 分别返回 eSpace 支持 Governance 的矿池列表。

## How to Get VotingEscrow Address

可以通过调用 eSpace 矿池合约的 `votingEscrow` 方法获取 VotingEscrow 合约地址。

## How to Vote on-chain Parameters

`VotingEscrow` 锁定获取投票权的功能由各自矿池 UI 实现(因为eSpace各矿池逻辑不同)，hub 中仅需要读取用户当前投票权信息即可，接口同 Core Space 对应合约方法保持一致。

```js
// 查询用户当前的锁定信息
function userLockInfo(address user) external view returns (LockInfo memory);
// 查询用户指定block的锁定信息
function userLockInfo(address user, uint256 blockNumber) external view returns (LockInfo memory);
// 查询用户当前的投票权
function userVotePower(address user) external view returns (uint256);
// 查询用户指定的投票权
function userVotePower(address user, uint256 blockNumber) external view returns (uint256);
```

`VotingEscrow` 合约的投票方法同 Core Space 对应合约的方法保持一致.

```js
// 进行链上参数投票: 投票轮次，投票主题索引，各选项投票数量
function castVote(uint64 vote_round, uint16 topic_index, uint256[3] memory votes) external;
// 查询链上参数投票信息
function readVote(address addr, uint16 topicIndex) external view returns (ParamsControl.Vote memory);
```

## BatchCall Util

eSpace 也会提供一个批量调用的工具合约，接口同 Core Space 对应合约保持一致。