//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ParamsControl} from "@confluxfans/contracts/InternalContracts/ParamsControl.sol";
import {CrossSpaceCall} from "./interfaces/ICrossSpaceCall.sol";
import {IPoSPool} from "./interfaces/IPoSPool.sol";
import {IVotingEscrow} from "./interfaces/IVotingEscrow.sol";

// eSpace pool bridge contract
contract CoreBridge is Ownable {
  ParamsControl private constant PARAMS_CONTROL = ParamsControl(0x0888000000000000000000000000000000000007);
  CrossSpaceCall private constant CROSS_SPACE_CALL = CrossSpaceCall(0x0888000000000000000000000000000000000006);
  uint16 private constant TOTAL_TOPIC = 4;
  uint256 public constant QUARTER_BLOCK_NUMBER = 2 * 3600 * 24 * 365 / 4; // 3 months
    // uint256 public constant CFX_PER_VOTE = 1000 ether;
    // uint256 public constant RATIO_BASE = 1000_000_000;

  CrossSpaceCall private crossSpaceCall;

  address public poolAddress;
  address public eSpacePoolAddress;

  // voting escrow related states
  address public eSpaceVotingEscrow;
  mapping(uint256 => uint256) public globalLockAmount; // unlock block => amount (user total lock amount)
  mapping(uint64 => mapping(uint16 => uint256[3])) public poolVoteInfo;

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

  function setESpaceVotingEscrow(address addr) public onlyOwner {
    eSpaceVotingEscrow = addr;
  }

  function ePoolAddrB20() private view returns (bytes20) {
    return bytes20(eSpacePoolAddress);
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
    claimAndCrossInterest();
  }

  function syncAPY() public {
    IPoSPool posPool = IPoSPool(poolAddress);
    uint256 apy = posPool.poolAPY();
    crossSpaceCall.callEVM(ePoolAddrB20(), abi.encodeWithSignature("setPoolAPY(uint256)", apy));
  }

  function claimAndCrossInterest() public onlyOwner {
    IPoSPool posPool = IPoSPool(poolAddress);
    uint256 interest = posPool.userInterest(address(this));
    if (interest > 0) {
      posPool.claimInterest(interest);
      crossSpaceCall.callEVM{value: interest}(ePoolAddrB20(), abi.encodeWithSignature("receiveInterest()"));
    }
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
      posPool.withdrawStake(uint64(userSummary.unlocked));
      // transfer to eSpacePool and call method
      eSpaceHandleUnlockedIncrease(uint64(userSummary.unlocked));
    }
  }

  // =================== espace pool related methods ===================
  function queryCrossingVotes() public view returns (uint256) {
    bytes memory rawCrossingVotes = crossSpaceCall.staticCallEVM(ePoolAddrB20(), abi.encodeWithSignature("crossingVotes()"));
    return abi.decode(rawCrossingVotes, (uint256));
  }

  function queryUnstakeLen() public view returns (uint256) {
    bytes memory rawUnstakeLen = crossSpaceCall.staticCallEVM(ePoolAddrB20(), abi.encodeWithSignature("unstakeLen()"));
    return abi.decode(rawUnstakeLen, (uint256));
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

  // =================== voting escrow related methods =================== 

  function _ePoolVotingAddrB20() internal view returns (bytes20) {
    return bytes20(eSpaceVotingEscrow);
  }

  function eSpaceVotingLastUnlockBlock() public view returns (uint256) {
    bytes memory num =
        CROSS_SPACE_CALL.staticCallEVM(_ePoolVotingAddrB20(), abi.encodeWithSignature("lastUnlockBlock()"));
    return abi.decode(num, (uint256));
  }

  function eSpaceVotingGlobalLockAmount(uint256 lockBlock) public view returns (uint256) {
    bytes memory num = CROSS_SPACE_CALL.staticCallEVM(
        _ePoolVotingAddrB20(), abi.encodeWithSignature("globalLockAmount(uint256)", lockBlock)
    );
    return abi.decode(num, (uint256));
  }

  function eSpaceVotingPoolVoteInfo(uint64 round, uint16 topic) public view returns (uint256[3] memory) {
    bytes memory votes = CROSS_SPACE_CALL.staticCallEVM(
        _ePoolVotingAddrB20(), abi.encodeWithSignature("getPoolVoteInfo(uint64,uint16)", round, topic)
    );
    return abi.decode(votes, (uint256[3]));
  }

  function lastUnlockBlock() public view returns (uint256) {
    return eSpaceVotingLastUnlockBlock();
  }

  function isLockInfoChanged() public view returns (bool) {
    uint256 _lastUnlockBlock = eSpaceVotingLastUnlockBlock();
    // max lock period is 1 year, so the max loop times is 4
    while (_lastUnlockBlock > block.number) {
        uint256 amount = eSpaceVotingGlobalLockAmount(_lastUnlockBlock);
        if (globalLockAmount[_lastUnlockBlock] != amount) {
            return true;
        }
        _lastUnlockBlock -= QUARTER_BLOCK_NUMBER;
    }
    return false;
  }

  function syncLockInfo() public {
    uint256 _lastUnlockBlock = eSpaceVotingLastUnlockBlock();
    uint256 unlockBlock = _lastUnlockBlock;
    // max lock period is 1 year, so the max loop times is 4
    while (unlockBlock > block.number) {
        uint256 amount = eSpaceVotingGlobalLockAmount(unlockBlock);
        globalLockAmount[unlockBlock] = amount;
        unlockBlock -= QUARTER_BLOCK_NUMBER;
    }

    // trigger lock
    IVotingEscrow(IPoSPool(poolAddress).votingEscrow()).triggerLock();
  }

  function isVoteInfoChanged() public view returns (bool) {
    uint64 round = PARAMS_CONTROL.currentRound();
    uint16 topic = 0;
    while (topic < TOTAL_TOPIC) {
        uint256[3] memory votes = eSpaceVotingPoolVoteInfo(round, topic);
        if (!isVotesEqual(votes, poolVoteInfo[round][topic])) {
            return true;
        }
        topic++;
    }
    return false;
  }

  function syncVoteInfo() public {
    uint64 round = PARAMS_CONTROL.currentRound();
    uint16 topic = 0;
    while (topic < TOTAL_TOPIC) {
        uint256[3] memory votes = eSpaceVotingPoolVoteInfo(round, topic);
        if (!isVotesEqual(votes, poolVoteInfo[round][topic])) {
            poolVoteInfo[round][topic] = votes;
        }
        topic++;
    }

    IVotingEscrow(IPoSPool(poolAddress).votingEscrow()).triggerVote();
  }

  function isVotesEqual(uint256[3] memory votes1, uint256[3] memory votes2) internal pure returns (bool) {
    return votes1[0] == votes2[0] && votes1[1] == votes2[1] && votes1[2] == votes2[2];
  }

  fallback() external payable {}

  receive() external payable {}
}