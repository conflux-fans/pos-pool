//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "./PoSPoolStorage.sol";
import "@openzeppelin/contracts/proxy/Proxy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PoSPoolProxy is PoSPoolStorage, Proxy, Ownable {
  address public _logicContractAddress;

  function upgradeTo(address _addr) public onlyOwner {
    _logicContractAddress = _addr;
  }

  function _implementation() internal view override returns (address) {
    return _logicContractAddress;
  }
}