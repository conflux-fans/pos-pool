// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

abstract contract PoolContext {

  function _selfBalance() internal view virtual returns (uint256) {
    address self = address(this);
    return self.balance;
  }

  function _blockNumber() internal view virtual returns (uint64) {
    return uint64(block.number);
  }
}