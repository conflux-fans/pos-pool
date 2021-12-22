//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "./PoSPoolStorage.sol";
import "@openzeppelin/contracts/proxy/Proxy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PoSPoolProxy is PoSPoolStorage, Proxy, Ownable {
  address public implementation;

  constructor(address logic) {
    implementation = logic;
  }

  function upgradeTo(address newImplementation) public onlyOwner {
    implementation = newImplementation;
  }

  function _implementation() internal view override returns (address) {
    return implementation;
  }
}