# How to verify pool contract on ConfluxScan

Both Core Space and eSpace PoSPool contracts are deployed using the EIP-1967 proxy pattern, enabling contract upgradability. Therefore, when verifying the contracts, you need to verify the Proxy contract first, followed by the implementation contract.

ConfluxScan supports manual contract verification. You only need to use the `flatten` command from Hardhat or Foundry to bundle the contract code into a single file, and then submit a verification request on the ConfluxScan contract verification page.

## how to flatten the contract code

### Core Space

Obtain the complete Proxy contract code:

```sh
npx hardhat flatten contracts/utils/Proxy1967.sol > proxy.sol
```

Obtain the complete `Inplementation` contract code:

```sh
npx hardhat flatten contracts/PoSPool.sol > pospool.sol
```

### eSpace

Obtain the complete Proxy contract code:

```sh
npx hardhat flatten contracts/utils/Proxy1967.sol > proxy.sol
```

Obtain the complete `Inplementation` contract code:

```sh
npx hardhat flatten contracts/eSpace/eSpacePoSPool.sol > pospool.sol
```

## How to verify the contract

Refer to the [ConfluxScan contract verification documentation](https://doc.confluxnetwork.org/docs/espace/tutorials/VerifyContracts#verify-on-web-ui-manually) to complete contract verification.
