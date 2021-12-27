//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PoSPoolProxy1967 is ERC1967Proxy, Ownable  {
  constructor(address logic, bytes memory data) ERC1967Proxy(logic, data) {}

  function implementation() public view returns (address) {
    return _implementation();
  }

  function upgradeTo(address newImplementation) public onlyOwner {
    _upgradeTo(newImplementation);
  }
}