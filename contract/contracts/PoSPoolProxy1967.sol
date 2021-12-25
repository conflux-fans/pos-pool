//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "./PoSPoolStorage.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PoSPoolProxy1967 is ERC1967Proxy, Ownable {
  constructor(address logic) ERC1967Proxy(logic, "") {}

  // Used to query current logic address
  function implementation() public view returns (address) {
    return _implementation();
  }

  function upgradeTo(address newImplementation) public onlyOwner {
    _upgradeTo(newImplementation);
  }
}