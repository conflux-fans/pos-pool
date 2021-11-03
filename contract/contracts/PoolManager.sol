//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IPoSPool.sol";

contract PoolManager is Ownable {
  using EnumerableSet for EnumerableSet.AddressSet;

  uint32 constant private RATIO_BASE = 10000;

  EnumerableSet.AddressSet private pools;

  struct PoolInfo {
    address poolAddress;
    uint64 totalAvailable;
    string name;
    uint32 apy;
    uint32 fee;
  }

  constructor() {}

  // TODO pagination
  function getPools() public view returns (PoolInfo[] memory) {
    PoolInfo[] memory poolInfos = new PoolInfo[](pools.length());

    address[] memory poolAddresses = pools.values();
    for (uint32 i = 0; i < poolAddresses.length; i++) {
      IPoSPool poolInstance = IPoSPool(poolAddresses[i]);
      poolInfos[i] = PoolInfo({
        poolAddress: poolAddresses[i],
        totalAvailable: poolInstance.poolSummary().available,
        name: poolInstance._poolName(),
        apy: poolInstance.poolAPY(),
        fee: poolInstance._poolUserShareRatio()
      });
    }
    
    return poolInfos;
  }

  function addPool(address poolAddress) public onlyOwner {
    pools.add(poolAddress);
  }

  function removePool(address poolAddress) public onlyOwner {
    pools.remove(poolAddress);
  }

}