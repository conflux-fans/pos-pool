//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "../VotePowerQueue.sol";
import "./UnstakeQueue.sol";

///
///  @title eSpace PoSPool
///
contract ESpacePoSPool is Ownable, Initializable {
  using SafeMath for uint256;
  using EnumerableSet for EnumerableSet.AddressSet;
  using VotePowerQueue for VotePowerQueue.InOutQueue;
  using UnstakeQueue for UnstakeQueue.Queue;

  uint256 private constant RATIO_BASE = 10000;
  uint256 private constant ONE_DAY_BLOCK_COUNT = 3600 * 24;
  uint256 private CFX_COUNT_OF_ONE_VOTE = 1000;
  uint256 private CFX_VALUE_OF_ONE_VOTE = 1000 ether;
  
  
  // ======================== Pool config =========================
  // wheter this poolContract registed in PoS
  bool public birdgeAddrSetted;
  address private _bridgeAddress;
  // ratio shared by user: 1-10000
  uint256 public poolUserShareRatio = 9600;
  // lock period: 7 days + half hour
  uint256 public _poolLockPeriod = ONE_DAY_BLOCK_COUNT * 7 + 1800;
  string public poolName; // = "eSpacePool";
  uint256 private _poolAPY = 0;

  // ======================== Contract states =========================
  // global pool accumulative reward for each cfx
  uint256 public accRewardPerCfx;  // start from 0

  PoolSummary private _poolSummary;
  mapping(address => UserSummary) private userSummaries;
  mapping(address => VotePowerQueue.InOutQueue) private userInqueues;
  mapping(address => VotePowerQueue.InOutQueue) private userOutqueues;

  PoolShot internal lastPoolShot;
  mapping(address => UserShot) internal lastUserShots;
  
  EnumerableSet.AddressSet private stakers;
  // Unstake votes queue
  UnstakeQueue.Queue private unstakeQueue;

  // Currently withdrawable CFX
  uint256 public withdrawableCfx;
  // Votes need to cross from eSpace to Core
  uint256 public crossingVotes;

  // ======================== Struct definitions =========================
  struct PoolSummary {
    uint256 available;
    uint256 interest; // PoS pool current interest
    uint256 totalInterest; // total historical interest of whole pools
  }

  /// @title UserSummary
  /// @custom:field votes User's total votes
  /// @custom:field available User's avaliable votes
  /// @custom:field locked
  /// @custom:field unlocked
  /// @custom:field claimedInterest
  /// @custom:field currentInterest
  struct UserSummary {
    uint256 votes;  // Total votes in PoS system, including locking, locked, unlocking, unlocked
    uint256 available; // locking + locked
    uint256 locked;
    uint256 unlocked;
    uint256 claimedInterest; // total historical claimed interest
    uint256 currentInterest; // current claimable interest
  }

  struct PoolShot {
    uint256 available;
    uint256 balance;
    uint256 blockNumber;
  } 

  struct UserShot {
    uint256 available;
    uint256 accRewardPerCfx;
    uint256 blockNumber;
  }

  // ======================== Modifiers =========================
  modifier onlyRegisted() {
    require(birdgeAddrSetted, "Pool is not setted");
    _;
  }

  modifier onlyBridge() {
    require(msg.sender == _bridgeAddress, "Only bridge is allowed");
    _;
  }

  // ======================== Helpers =========================
  function _selfBalance() internal view virtual returns (uint256) {
    return address(this).balance;
  }

  function _blockNumber() internal view virtual returns (uint256) {
    return block.number;
  }

  function _userShareRatio() public pure returns (uint256) {
    return RATIO_BASE;
  }

  function _calUserShare(uint256 reward, address _stakerAddress) private pure returns (uint256) {
    return reward.mul(_userShareRatio()).div(RATIO_BASE);
  }

  // used to update lastPoolShot after _poolSummary.available changed 
  function _updatePoolShot() private {
    lastPoolShot.available = _poolSummary.available;
    lastPoolShot.balance = _selfBalance();
    lastPoolShot.blockNumber = _blockNumber();
  }

  // used to update lastUserShot after userSummary.available and accRewardPerCfx changed
  function _updateUserShot(address _user) private {
    lastUserShots[_user].available = userSummaries[_user].available;
    lastUserShots[_user].accRewardPerCfx = accRewardPerCfx;
    lastUserShots[_user].blockNumber = _blockNumber();
  }

  // used to update accRewardPerCfx after _poolSummary.available changed or user claimed interest
  // depend on: lastPoolShot.available and lastPoolShot.balance
  function _updateAccRewardPerCfx() private {
    uint256 reward = _selfBalance() - lastPoolShot.balance;
    if (reward == 0 || lastPoolShot.available == 0) return;

    // update global accRewardPerCfx
    uint256 cfxCount = lastPoolShot.available.mul(CFX_COUNT_OF_ONE_VOTE);
    accRewardPerCfx = accRewardPerCfx.add(reward.div(cfxCount));

    // update pool interest info
    _poolSummary.totalInterest = _poolSummary.totalInterest.add(reward);
  }

  // depend on: accRewardPerCfx and lastUserShot
  function _updateUserInterest(address _user) private {
    UserShot memory uShot = lastUserShots[_user];
    if (uShot.available == 0) return;
    uint256 latestInterest = accRewardPerCfx.sub(uShot.accRewardPerCfx).mul(uShot.available.mul(CFX_COUNT_OF_ONE_VOTE));
    uint256 _userInterest = _calUserShare(latestInterest, _user);
    userSummaries[_user].currentInterest = userSummaries[_user].currentInterest.add(_userInterest);
    _poolSummary.interest = _poolSummary.interest.add(latestInterest.sub(_userInterest));
  }

  // ======================== Events =========================

  event IncreasePoSStake(address indexed user, uint256 votePower);

  event DecreasePoSStake(address indexed user, uint256 votePower);

  event WithdrawStake(address indexed user, uint256 votePower);

  event ClaimInterest(address indexed user, uint256 amount);

  event RatioChanged(uint256 ratio);

  // ======================== Init methods =========================

  // call this method when depoly the 1967 proxy contract
  function initialize() public initializer {
    CFX_COUNT_OF_ONE_VOTE = 1000;
    CFX_VALUE_OF_ONE_VOTE = 1000 ether;
    _poolLockPeriod = ONE_DAY_BLOCK_COUNT * 7 + 3600;
    poolUserShareRatio = 9600;
  }

  // ======================== Contract methods =========================

  ///
  /// @notice Increase PoS vote power
  /// @param votePower The number of vote power to increase
  ///
  function increaseStake(uint64 votePower) public virtual payable onlyRegisted {
    require(votePower > 0, "Minimal votePower is 1");
    require(msg.value == votePower * CFX_VALUE_OF_ONE_VOTE, "msg.value should be votePower * 1000 ether");
    
    // transfer to bridge address
    address payable receiver = payable(_bridgeAddress);
    receiver.transfer(msg.value);
    crossingVotes += votePower;
    emit IncreasePoSStake(msg.sender, votePower);

    _updateAccRewardPerCfx();
    
    // update user interest
    _updateUserInterest(msg.sender);
    // put stake info in queue
    userInqueues[msg.sender].enqueue(VotePowerQueue.QueueNode(votePower, _blockNumber() + _poolLockPeriod));
    userSummaries[msg.sender].locked += userInqueues[msg.sender].collectEndedVotes();
    userSummaries[msg.sender].votes += votePower;
    userSummaries[msg.sender].available += votePower;
    _updateUserShot(msg.sender);

    //
    _poolSummary.available += votePower;
    _updatePoolShot();

    stakers.add(msg.sender);
  }

  ///
  /// @notice Decrease PoS vote power
  /// @param votePower The number of vote power to decrease
  ///
  function decreaseStake(uint64 votePower) public virtual onlyRegisted {
    userSummaries[msg.sender].locked += userInqueues[msg.sender].collectEndedVotes();
    require(userSummaries[msg.sender].locked >= votePower, "Locked is not enough");
    // record the decrease request
    unstakeQueue.enqueue(UnstakeQueue.Node(votePower));
    emit DecreasePoSStake(msg.sender, votePower);

    _updateAccRewardPerCfx();

    // update user interest
    _updateUserInterest(msg.sender);
    //
    userOutqueues[msg.sender].enqueue(VotePowerQueue.QueueNode(votePower, _blockNumber() + _poolLockPeriod));
    userSummaries[msg.sender].unlocked += userOutqueues[msg.sender].collectEndedVotes();
    userSummaries[msg.sender].available -= votePower;
    userSummaries[msg.sender].locked -= votePower;
    _updateUserShot(msg.sender);

    //
    _poolSummary.available -= votePower;
    _updatePoolShot();
  }

  ///
  /// @notice Withdraw PoS vote power
  /// @param votePower The number of vote power to withdraw
  ///
  function withdrawStake(uint64 votePower) public onlyRegisted {
    userSummaries[msg.sender].unlocked += userOutqueues[msg.sender].collectEndedVotes();
    require(userSummaries[msg.sender].unlocked >= votePower, "Unlocked is not enough");
    uint256 _withdrawAmount = votePower * CFX_VALUE_OF_ONE_VOTE;
    require(withdrawableCfx >= _withdrawAmount, "Withdrawable CFX is not enough");
    // update amount of withdrawable CFX
    withdrawableCfx -= _withdrawAmount;
    //    
    userSummaries[msg.sender].unlocked -= votePower;
    userSummaries[msg.sender].votes -= votePower;
    
    address payable receiver = payable(msg.sender);
    receiver.transfer(_withdrawAmount);
    emit WithdrawStake(msg.sender, votePower);

    _updatePoolShot();

    if (userSummaries[msg.sender].votes == 0) {
      stakers.remove(msg.sender);
    }
  }

  ///
  /// @notice User's interest from participate PoS
  /// @param _address The address of user to query
  /// @return CFX interest in Drip
  ///
  function userInterest(address _address) public view returns (uint256) {
    uint256 _interest = userSummaries[_address].currentInterest;

    uint256 _latestAccRewardPerCfx = accRewardPerCfx;
    // add latest profit
    uint256 _latestReward = _selfBalance() - lastPoolShot.balance;
    UserShot memory uShot = lastUserShots[_address];
    if (_latestReward > 0) {
      uint256 _deltaAcc = _latestReward.div(lastPoolShot.available.mul(CFX_COUNT_OF_ONE_VOTE));
      _latestAccRewardPerCfx = _latestAccRewardPerCfx.add(_deltaAcc);
    }

    if (uShot.available > 0) {
      uint256 _latestInterest = _latestAccRewardPerCfx.sub(uShot.accRewardPerCfx).mul(uShot.available.mul(CFX_COUNT_OF_ONE_VOTE));
      _interest = _interest.add(_calUserShare(_latestInterest, _address));
    }

    return _interest;
  }

  ///
  /// @notice Claim specific amount user interest
  /// @param amount The amount of interest to claim
  ///
  function claimInterest(uint amount) public onlyRegisted {
    uint claimableInterest = userInterest(msg.sender);
    require(claimableInterest >= amount, "Interest not enough");

    _updateAccRewardPerCfx();

    _updateUserInterest(msg.sender);
    //
    userSummaries[msg.sender].claimedInterest = userSummaries[msg.sender].claimedInterest.add(amount);
    userSummaries[msg.sender].currentInterest = userSummaries[msg.sender].currentInterest.sub(amount);
    // update userShot's accRewardPerCfx
    _updateUserShot(msg.sender);

    // send interest to user
    address payable receiver = payable(msg.sender);
    receiver.transfer(amount);
    emit ClaimInterest(msg.sender, amount);

    // update blockNumber and balance
    _updatePoolShot();
  }

  ///
  /// @notice Claim one user's all interest
  ///
  function claimAllInterest() public onlyRegisted {
    uint claimableInterest = userInterest(msg.sender);
    require(claimableInterest > 0, "No claimable interest");
    claimInterest(claimableInterest);
  }

  /// 
  /// @notice Get user's pool summary
  /// @param _user The address of user to query
  /// @return User's summary
  ///
  function userSummary(address _user) public view returns (UserSummary memory) {
    UserSummary memory summary = userSummaries[_user];
    summary.locked += userInqueues[_user].sumEndedVotes();
    summary.unlocked += userOutqueues[_user].sumEndedVotes();
    return summary;
  }

  function poolSummary() public view returns (PoolSummary memory) {
    PoolSummary memory summary = _poolSummary;
    uint256 _latestReward = _selfBalance().sub(lastPoolShot.balance);
    summary.totalInterest = summary.totalInterest.add(_latestReward);
    return summary;
  }

  function poolAPY() public view returns (uint256) {
    return _poolAPY;
  }

  function userInQueue(address account) public view returns (VotePowerQueue.QueueNode[] memory) {
    return userInqueues[account].queueItems();
  }

  function userOutQueue(address account) public view returns (VotePowerQueue.QueueNode[] memory) {
    return userOutqueues[account].queueItems();
  }

  function userInQueue(address account, uint64 offset, uint64 limit) public view returns (VotePowerQueue.QueueNode[] memory) {
    return userInqueues[account].queueItems(offset, limit);
  }

  function userOutQueue(address account, uint64 offset, uint64 limit) public view returns (VotePowerQueue.QueueNode[] memory) {
    return userOutqueues[account].queueItems(offset, limit);
  }

  function stakerNumber() public view returns (uint) {
    return stakers.length();
  }

  function stakerAddress(uint256 i) public view returns (address) {
    return stakers.at(i);
  }

  function unstakeLen() public view returns (uint256) {
    return unstakeQueue.end - unstakeQueue.start;
  }

  function firstUnstakeVotes() public view returns (uint256) {
    if (unstakeQueue.end == unstakeQueue.start) {
      return 0;
    }
    return unstakeQueue.items[unstakeQueue.start].votes;
  }

  // ======================== admin methods =====================

  ///
  /// @notice Enable admin to set the user share ratio
  /// @dev The ratio base is 10000, only admin can do this
  /// @param ratio The interest user share ratio (1-10000), default is 9000
  ///
  function setPoolUserShareRatio(uint64 ratio) public onlyOwner {
    require(ratio > 0 && ratio <= RATIO_BASE, "ratio should be 1-10000");
    poolUserShareRatio = ratio;
    emit RatioChanged(ratio);
  }

  /// 
  /// @notice Enable admin to set the lock and unlock period
  /// @dev Only admin can do this
  /// @param period The lock period in block number, default is seven day's block count
  ///
  function setLockPeriod(uint64 period) public onlyOwner {
    _poolLockPeriod = period;
  }

  /// @param count Vote cfx count, unit is cfx
  function setCfxCountOfOneVote(uint256 count) public onlyOwner {
    CFX_COUNT_OF_ONE_VOTE = count;
    CFX_VALUE_OF_ONE_VOTE = count * 1 ether;
  }

  function setBridge(address bridgeAddress) public onlyOwner {
    _bridgeAddress = bridgeAddress;
    birdgeAddrSetted = true;
  }

  function setPoolName(string memory name) public onlyOwner {
    poolName = name;
  }

  function _retireUserStake(address _addr, uint64 endBlockNumber) public onlyOwner {
    uint256 votePower = userSummaries[_addr].available;
    if (votePower == 0) return;

    _updateUserInterest(_addr);
    userSummaries[_addr].available = 0;
    userSummaries[_addr].locked = 0;
    // clear user inqueue
    userInqueues[_addr].clear();
    userOutqueues[_addr].enqueue(VotePowerQueue.QueueNode(votePower, endBlockNumber));
    _updateUserShot(_addr);

    _poolSummary.available -= votePower;
  }

  // When pool node is force retired, use this method to make all user's available stake to unlocking
  function _retireUserStakes(uint256 offset, uint256 limit, uint64 endBlockNumber) public onlyOwner {
    uint256 len = stakers.length();
    if (len == 0) return;

    _updateAccRewardPerCfx();

    uint256 end = offset + limit;
    if (end > len) {
      end = len;
    }
    for (uint256 i = offset; i < end; i++) {
      _retireUserStake(stakers.at(i), endBlockNumber);
    }

    _updatePoolShot();
  }

  // ======================== bridge methods =====================

  function setPoolAPY(uint256 apy) public onlyBridge {
    _poolAPY = apy;
  }

  function handleUnlockedIncrease(uint256 votePower) public payable onlyBridge {
    require(msg.value == votePower * CFX_VALUE_OF_ONE_VOTE, "msg.value should be votePower * 1000 ether");
    withdrawableCfx += msg.value;
    _updatePoolShot();
  }

  function handleCrossingVotes(uint256 votePower) public onlyBridge {
    require(crossingVotes >= votePower, "crossingVotes should be greater than votePower");
    crossingVotes -= votePower;
  }

  function handleUnstakeTask() public onlyBridge returns (uint256) {
    UnstakeQueue.Node memory node = unstakeQueue.dequeue();
    return node.votes;
  }

  // receive interest
  function receiveInterest() public payable onlyBridge {}

  fallback() external payable {}

}