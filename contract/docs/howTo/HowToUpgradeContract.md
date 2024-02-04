# Contract upgrade

This project use oz ERC1967Proxy to achieve the contract upgradeability.

## How to

Use hardhat `upgradeContract` task to upgrade a Proxy1967 contract.

```sh
npx hardhat upgradeContract --network <network> --address <address> --contract <impl-contract-name>
```

This task will **deploy a new implementation contract** and **upgrade the proxy contract to the new implementation**. And it support both Conflux eSpace and Core Space.