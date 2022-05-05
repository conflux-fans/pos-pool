//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../ICrossSpaceCall.sol";
import "../IPoSPool.sol";

contract CoreBridge is Ownable {
  CrossSpaceCall internal crossSpaceCall;

  address public poolAddress;
  address public eSpacePoolAddress;

  constructor () {
    initialize();
  }

  function initialize() public {
    crossSpaceCall = CrossSpaceCall(0x0888000000000000000000000000000000000006);
  }

  function setPoolAddress(address _poolAddress) public onlyOwner {
    poolAddress = _poolAddress;
  }

  function setESpacePoolAddress(address _eSpacePoolAddress) public onlyOwner {
    eSpacePoolAddress = _eSpacePoolAddress;
  }

  function ePoolAddrB20() public view returns (bytes20) {
    return bytes20(eSpacePoolAddress);
  }

  function queryCrossingVotes() public returns (uint256) {
    bytes memory rawCrossingVotes = crossSpaceCall.callEVM(ePoolAddrB20(), abi.encodeWithSignature("crossingVotes()"));
    return abi.decode(rawCrossingVotes, (uint256));
  }

  function queryUnstakeLen() public returns (uint256) {
    bytes memory rawUnstakeLen = crossSpaceCall.callEVM(ePoolAddrB20(), abi.encodeWithSignature("unstakeLen()"));
    return abi.decode(rawUnstakeLen, (uint256));
  }

  function queryInterest() public view returns (uint256) {
    IPoSPool posPool = IPoSPool(poolAddress);
    uint256 interest = posPool.userInterest(address(this));
    return interest;
  }

  function queryUserSummary() public view returns (IPoSPool.UserSummary memory) {
    IPoSPool posPool = IPoSPool(poolAddress);
    IPoSPool.UserSummary memory userSummary = posPool.userSummary(address(this));
    return userSummary;
  }

  function syncAPYandClaimInterest() public onlyOwner {
    syncAPY();
    claimInterest();
  }

  function syncAPY() public {
    IPoSPool posPool = IPoSPool(poolAddress);
    uint256 apy = posPool.poolAPY();
    crossSpaceCall.callEVM(ePoolAddrB20(), abi.encodeWithSignature("setPoolAPY(uint256)", apy));
  }

  function crossStake() public onlyOwner {
    uint256 crossingVotes = queryCrossingVotes();
    uint256 mappedBalance = crossSpaceCall.mappedBalance(address(this));
    uint256 amount = crossingVotes * 1000 ether;
    if (crossingVotes > 0 && mappedBalance >= amount) {
      crossSpaceCall.withdrawFromMapped(amount);
      crossSpaceCall.callEVM(ePoolAddrB20(), abi.encodeWithSignature("handleCrossingVotes(uint256)", crossingVotes));
      IPoSPool posPool = IPoSPool(poolAddress);
      posPool.increaseStake{value: amount}(uint64(crossingVotes));
    }
  }

  function claimInterest() public onlyOwner {
    IPoSPool posPool = IPoSPool(poolAddress);
    uint256 interest = posPool.userInterest(address(this));
    if (interest > 0) {
      posPool.claimInterest(interest);
      crossSpaceCall.transferEVM{value: interest}(ePoolAddrB20());
    }
  }

  function claimAndCrossInterest() public onlyOwner {
    IPoSPool posPool = IPoSPool(poolAddress);
    uint256 interest = posPool.userInterest(address(this));
    if (interest > 0) {
      posPool.claimInterest(interest);
      crossSpaceCall.callEVM{value: interest}(ePoolAddrB20(), abi.encodeWithSignature("receiveInterest()"));
    }
  }

  function handleUnstake() public onlyOwner {
    uint256 unstakeLen = queryUnstakeLen();
    if (unstakeLen == 0) return;
    if (unstakeLen > 50) unstakeLen = 50; // max 50 unstakes per call
    IPoSPool posPool = IPoSPool(poolAddress);
    IPoSPool.UserSummary memory userSummary = posPool.userSummary(address(this));
    uint256 available = userSummary.locked;
    if (available == 0) return;
    for(uint256 i = 0; i < unstakeLen; i++) {
      bytes memory rawFirstUnstakeVotes = crossSpaceCall.callEVM(ePoolAddrB20(), abi.encodeWithSignature("firstUnstakeVotes()"));
      uint256 firstUnstakeVotes = abi.decode(rawFirstUnstakeVotes, (uint256));
      if (firstUnstakeVotes == 0) break;
      if (firstUnstakeVotes > available) break;
      posPool.decreaseStake(uint64(firstUnstakeVotes));
      crossSpaceCall.callEVM(ePoolAddrB20(), abi.encodeWithSignature("handleUnstakeTask()"));
      available -= firstUnstakeVotes;
    }
  }

  function withdrawVotes() public onlyOwner {
    IPoSPool posPool = IPoSPool(poolAddress);
    IPoSPool.UserSummary memory userSummary = posPool.userSummary(address(this));
    if (userSummary.unlocked > 0) {
      posPool.withdrawStake(userSummary.unlocked);
      // transfer to eSpacePool and call method
      uint256 transferValue = userSummary.unlocked * 1000 ether;
      crossSpaceCall.callEVM{value: transferValue}(ePoolAddrB20(), abi.encodeWithSignature("handleUnlockedIncrease(uint256)", userSummary.unlocked));
    }
  }

  function callEVM(address addr, bytes calldata data) public onlyOwner {
    crossSpaceCall.callEVM(bytes20(addr), data);
  }

  fallback() external payable {}

  receive() external payable {}
}