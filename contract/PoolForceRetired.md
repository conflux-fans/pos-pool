# Pool force retired

## 如何检测节点是否被 retired

1. 通过 `pos_getAccount` 方法获取 pos 账户信息，如果 forceRetired 有值，说明被 retire 了。(此种方式检测有一定延后)
2. 如果节点是委员会成员，可以判断节点是否对最新的 PoS block 进行了签名操作，如果没有进行可能意味着节点不正常

## 节点 retired 带来的影响

1. 如果节点被 retired，节点所有的 votes 会自动被 unlock，从而进入 unlocking 队列
2. 新 lock 的所有票也会自动进入 unlock 队列，时间为 lock 时间 + unlock 时间，最长 14 天
3. PoS 节点的 forceRetired 状态会持续七天
4. unlocking 状态的票将不会有收益，意味着在主网环境，矿池用户将损失七天的收益

## 节点 retire 之后需要做什么操作

节点被 retired 之后，合约所记录的 staker 的 vote 的状态，跟节点的实际状态将不一致。

处理方式有两种(推荐第一种)：

1. 由管理员对所有用户的票进行 unlock 操作，待 unlock 结束后，用户需要手动提取所有票，不操作的话也不会有收益
2. 在 unlocking 的票达到解锁状态之后，由 pool 的管理员将所有的票重新进行 lock 操作， 此种方式下如果用户想解锁，需要多等 7 天
