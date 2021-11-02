# PoSPool

矿池合约

## 如何Setup

1. 编译合约
2. 调用 `register` 方法注册到 Conflux PoS 系统，该方法的参数同 PoSRegister 的 `register` 方法。注册票数固定为 `1` 票
3. Pool 的分成比例，以及 stake，unstake 的锁定时间可以由管理员设置: `setPoolUserShareRatio`, `setLockPeriod`

## 用户交互

1. `increaseStake(uint64 votePower)` 增加 PoS 票数，调用方法同时需要转对应数量的 CFX，增加的票数需要锁固定时间，才能进行 `decrease` 操作
2. `decreaseStake(uint64 votePower)` 从 PoS retire 指定票数，retire 的票，需要锁定固定时间，才能提出
3. `withdrawStake(uint64 votePower)` 提现指定票数
4. `userInterest(address _address)` 查询用户当前收益
5. `claimInterest(uint amount)` 提取指定数量的收益
6. `claimAllInterest()` 提取用户所有收益
7. `userSummary()` 查询用户的矿池概要信息
8. `posAddress()` 查询矿池的 PoS 地址
9. `poolSummary()` 查询矿池概览信息
