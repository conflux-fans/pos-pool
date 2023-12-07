# eSpace 矿池如何支持 Governance

eSpace 多个矿池是自行开发的，具有更丰富的功能，比如 PHX V2 和 Nucelon。这些矿池如果想参与 Conflux 官方 Governance，需要做一些适配。

Conflux 官方 Governance 包含两个环节， 锁定 CFX 获取投票权，以及投票。且这两个环境都是在 Core Space 进行的。而 eSpace 的矿池用户都是在 eSpace 操作的， 因此 eSpace 的矿池支持 Governance 需要做数据跨 Space 同步。

大致适配内容包括如下两点：

1. 允许用户将质押在池子中的 CFX 进行锁定(锁定期不能取出)，以获取投票权. 然后矿池再根据所有用户的锁定总量和时长，在 Core 进行锁定，获取同样的投票权.
2. 允许用户在 eSpace 进行链上参数投票，然后矿池根据所有用户的投票情况，在 Core 进行投票.

## 锁定 CFX 获取投票权

TODO

## 链上参数投票

TODO
