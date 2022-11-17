# How to Replace PoS Key

如果矿池运行者需要切换矿池所关联的 PoS 节点，可通过以下步骤完成：

1. 关闭矿池的操作功能
2. 待所有票完成锁定之后，由管理员将矿池的所有用户的票进行解锁操作
3. 待所有票解锁完成之后，获取新的 PoS 节点注册数据，并执行注册操作，并打开矿池的操作功能
4. 重新帮所有用户的票进行质押操作

## Pre

### 升级合约代码

矿池操作功能的关闭与打开需要使用 v1.2.0 及以上的合约版本，[合约升级操作参看](./HowToUpgradeContract.md)

### 设置锁定，解锁时间

Conflux v2.2.0 hardfork 之后 PoS 投票的锁定时间改为 13 天，解锁时间改为 1 天。矿池的相应设置需要调整:

```shell
node bin/pool.js Pool setLockPeriod 2250000
node bin/pool.js Pool setUnlockPeriod 176400
```

## 1 关闭矿池操作功能

```shell
node bin/pool.js Pool setPoolRegisted false
```

## 2 解锁所有票

待所有票完成锁定之后，由管理员将矿池的所有用户的票进行解锁操作

```shell
node scripts/replaceKey/unlockAllVotes.js
```

Note: 若有投票未完成锁定，该脚本会给出提示并退出。

## 3 使用新的 Register Data 重新注册

需要等待所有票解锁完成之后，方可进行新的注册操作。可在 [Scan PoS 账户详情页 待处理票权 Tab](https://confluxscan.net/pos/accounts/0x947c684e270131a1aab8711d2e321fc0e909318d885cfe69d4fc0158aded22d0?tab=right-status) 查看此信息（需要替换自己 pos 节点的地址信息）。


使用新的PoS 节点注册数据，执行注册操作，将注册数据配置到 env 文件中的 `POS_REGIST_DATA` 配置项.

```shell
node bin/pool.js registerPool
```

备注：

* 如果想继续使用原有节点，但生成新的注册 data，需要先停掉节点，将 `pos_config/pos_key` 和 `pos_db/secure_storage.json` 文件删除，然后再启动节点，将会自动生成。
* PoS 节点关停操作，建议参看[如何避免节点被 forceRetire](./PoolForceRetired.md) 说明，妥善关停节点
* 注册 data 的获取方法为 `./conflux rpc local pos register --power 1`
* 管理员可将原来注册用的 `1 vote` 提取出来，重新用于注册

## 4 重新将所有的票进行质押

待所有票完成解锁之后，由管理员将矿池的所有用户的票进行重新锁定操作

```shell
node scripts/replaceKey/reLockAllVotes.js
```

Note: 若有投票未完成锁定，该脚本会给出提示并退出。
