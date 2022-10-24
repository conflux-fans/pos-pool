# PoSPool DAO Vote

## Lock to Get Vote Power

### 锁定时长

为方便处理，矿池允许锁定时间为固定的四个时间点，假设当前投票 Round 截止 blockNumber 为 x，一个季度的 block 数量为 QN 则锁定可选时间为：

1. x + QN
2. x + QN * 2
3. x + QN * 3
4. x + QN * 4

### 锁定操作

一旦用户进行了锁定操作，将无法取消，直到到达锁定时间点

用户可以增加锁定量，或者延长锁定时间

## Vote

## TODO

1. Check pool total lock logic is right
2. Check pool total vote logic is right
