# Good

## Steps

`.env` 中增加 `ETH_RPC_URL` 配置项，用于设置 eSpace 的 RPC 地址

0. 准备新的部署账号，该账号在两个 Space 都需要有一些 CFX 用于部署, 账号私钥配置到 `.env` 文件中
1. 使用 `scripts/deployESpacePool.js` 部署两边的 impl, 以及 proxy 合约 （可能需要设置锁定时间）
2. 调用 `setEspacePool(address core, address espace)` 设置某个 Core 矿池在 eSpace 的关联矿池地址
3. 运行脚本 `service/eSpacePoolStatusSyncer.js` 用与同步两个 space 状态
