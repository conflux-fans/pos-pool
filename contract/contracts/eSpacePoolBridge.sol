//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ICrossSpaceCall.sol";
import "./interfaces/IPoSPool.sol";

// eSpace pool bridge contract
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

  function queryCrossingVotes() public view returns (uint256) {
    bytes memory rawCrossingVotes = crossSpaceCall.staticCallEVM(ePoolAddrB20(), abi.encodeWithSignature("crossingVotes()"));
    return abi.decode(rawCrossingVotes, (uint256));
  }

  function queryUnstakeLen() public view returns (uint256) {
    bytes memory rawUnstakeLen = crossSpaceCall.staticCallEVM(ePoolAddrB20(), abi.encodeWithSignature("unstakeLen()"));
    return abi.decode(rawUnstakeLen, (uint256));
  }

  function queryInterest() public view returns (uint256) {
    IPoSPool posPool = IPoSPool(poolAddress);
    return posPool.userInterest(address(this));
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
    if (unstakeLen > 5) unstakeLen = 5; // max 5 unstakes per call
    IPoSPool posPool = IPoSPool(poolAddress);
    IPoSPool.UserSummary memory userSummary = posPool.userSummary(address(this));
    uint256 available = userSummary.locked;
    if (available == 0) return;
    for(uint256 i = 0; i < unstakeLen; i++) {
      uint256 firstUnstakeVotes = eSpaceFirstUnstakeVotes();
      if (firstUnstakeVotes == 0) break;
      if (firstUnstakeVotes > available) break;
      posPool.decreaseStake(uint64(firstUnstakeVotes));
      eSpaceHandleUnstakeTask();
      available -= firstUnstakeVotes;
    }
  }

  function handleOneUnstake() public onlyOwner {
    uint256 unstakeLen = queryUnstakeLen();
    if (unstakeLen == 0) return;
    IPoSPool posPool = IPoSPool(poolAddress);
    IPoSPool.UserSummary memory userSummary = posPool.userSummary(address(this));
    uint256 available = userSummary.locked;
    if (available == 0) return;
    uint256 firstUnstakeVotes = eSpaceFirstUnstakeVotes();
    if (firstUnstakeVotes == 0 || firstUnstakeVotes > available) return;
    posPool.decreaseStake(uint64(firstUnstakeVotes));
    eSpaceHandleUnstakeTask();
  }

  function withdrawVotes() public onlyOwner {
    IPoSPool posPool = IPoSPool(poolAddress);
    IPoSPool.UserSummary memory userSummary = posPool.userSummary(address(this));
    if (userSummary.unlocked > 0) {
      posPool.withdrawStake(userSummary.unlocked);
      // transfer to eSpacePool and call method
      eSpaceHandleUnlockedIncrease(userSummary.unlocked);
    }
  }

  function withdrawVotesByVotes(uint64 votes) public onlyOwner {
    IPoSPool posPool = IPoSPool(poolAddress);
    IPoSPool.UserSummary memory userSummary = posPool.userSummary(address(this));
    require(userSummary.unlocked >= votes, "not enough unlocked votes");
    posPool.withdrawStake(votes);
    eSpaceHandleUnlockedIncrease(votes);
  }

  function eSpaceFirstUnstakeVotes() public view returns (uint256) {
    bytes memory rawFirstUnstakeVotes = crossSpaceCall.staticCallEVM(ePoolAddrB20(), abi.encodeWithSignature("firstUnstakeVotes()"));
    return abi.decode(rawFirstUnstakeVotes, (uint256));
  }

  function eSpaceHandleUnlockedIncrease(uint64 votes) internal {
    uint256 transferValue = votes * 1000 ether;
    crossSpaceCall.callEVM{value: transferValue}(ePoolAddrB20(), abi.encodeWithSignature("handleUnlockedIncrease(uint256)", votes));
  }

  function eSpaceHandleUnstakeTask() internal {
    crossSpaceCall.callEVM(ePoolAddrB20(), abi.encodeWithSignature("handleUnstakeTask()"));
  }

  function callEVM(address addr, bytes calldata data) public onlyOwner {
    crossSpaceCall.callEVM(bytes20(addr), data);
  }

  fallback() external payable {}

  receive() external payable {}
}