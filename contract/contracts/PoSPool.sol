//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./PoolContext.sol";
import "./VotePowerQueue.sol";

///
///  @title PoSPool
///  @dev This is Conflux PoS pool contract
///  @notice Users can use this contract to participate Conflux PoS without running a PoS node.
///
///  Key points:
///  1. Record pool and user state correctly
///  2. Calculate user reward correctly
///
///  Note:
///  1. Do not send CFX directly to the pool contract, the received CFX will be treated as PoS reward.
///
contract PoSPool is PoolContext, Ownable {
  using SafeMath for uint256;
  using EnumerableSet for EnumerableSet.AddressSet;
  using VotePowerQueue for VotePowerQueue.InOutQueue;

  uint256 constant private RATIO_BASE = 10000;
  uint256 private CFX_COUNT_OF_ONE_VOTE = 1000;
  uint256 private CFX_VALUE_OF_ONE_VOTE = 1000 ether;
  uint256 constant private ONE_DAY_BLOCK_COUNT = 2 * 3600 * 24;
  uint256 constant private ONE_YEAR_BLOCK_COUNT = ONE_DAY_BLOCK_COUNT * 365;
  
  // ======================== Pool config =========================

  string public poolName;
  bool public _poolRegisted;
  uint256 public poolUserShareRatio = 9000; // ratio shared by user: 1-10000
  uint256 public _poolLockPeriod = ONE_DAY_BLOCK_COUNT * 7 + 3600; // lock period: 7 days + half hour

  // ======================== Struct definitions =========================

  struct PoolSummary {
    uint256 available;
    uint256 interest; // PoS pool interest share
    uint256 totalInterest; // total interest of whole pools
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
    uint256 claimedInterest;
    uint256 currentInterest;
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

  // ======================== Contract states =========================
  // pool global accumulative reward for each cfx
  uint256 private accRewardPerCfx = 0;

  PoolSummary private _poolSummary;
  mapping(address => UserSummary) private userSummaries;
  mapping(address => VotePowerQueue.InOutQueue) private userInqueues;
  mapping(address => VotePowerQueue.InOutQueue) private userOutqueues;

  PoolShot private lastPoolShot;
  mapping(address => UserShot) private lastUserShots;
  
  EnumerableSet.AddressSet private stakers;

  // ======================== Modifiers =========================
  modifier onlyRegisted() {
    require(_poolRegisted, "Pool is not registed");
    _;
  }

  // ======================== Helpers =========================

  function _calUserShare(uint256 reward) private view returns (uint256) {
    return reward.mul(poolUserShareRatio).div(RATIO_BASE);
  }

  function _calPoolShare(uint256 reward) private view returns (uint256) {
    return reward.mul(RATIO_BASE - poolUserShareRatio).div(RATIO_BASE);
  }

  function _updatePoolShot() private {
    lastPoolShot.available = _poolSummary.available;
    lastPoolShot.balance = _selfBalance();
    lastPoolShot.blockNumber = _blockNumber();
  }

  function _updateUserShot(address _user) private {
    lastUserShots[_user].available = userSummaries[_user].available;
    lastUserShots[_user].accRewardPerCfx = accRewardPerCfx;
    lastUserShots[_user].blockNumber = _blockNumber();
  }

  function _updateAccRewardPerCfx() private {
    uint256 reward = _selfBalance() - lastPoolShot.balance;
    if (reward == 0 || lastPoolShot.available == 0) return;
    // update global accRewardPerCfx
    uint256 cfxCount = lastPoolShot.available.mul(CFX_COUNT_OF_ONE_VOTE);
    accRewardPerCfx = accRewardPerCfx.add(_calUserShare(reward).div(cfxCount));
    // update pool interest info
    _poolSummary.totalInterest = _poolSummary.totalInterest.add(reward);
    _poolSummary.interest = _poolSummary.interest.add(_calPoolShare(reward));
  }

  function _updateUserInterest(address _user) private {
    UserShot memory uShot = lastUserShots[_user];
    if (uShot.available == 0) return;
    uint256 latestInterest = accRewardPerCfx.sub(uShot.accRewardPerCfx).mul(uShot.available.mul(CFX_COUNT_OF_ONE_VOTE));
    userSummaries[_user].currentInterest = userSummaries[_user].currentInterest.add(latestInterest);
  }

  // ======================== Events =========================

  event IncreasePoSStake(address indexed user, uint256 votePower);

  event DecreasePoSStake(address indexed user, uint256 votePower);

  event WithdrawStake(address indexed user, uint256 votePower);

  event ClaimInterest(address indexed user, uint256 amount);

  event RatioChanged(uint256 ratio);

  // error UnnormalReward(uint256 previous, uint256 current, uint256 blockNumber);

  // ======================== Contract methods =========================
  
  ///
  /// @notice Regist the pool contract in PoS internal contract 
  /// @dev Only admin can do this
  /// @param indentifier The identifier of PoS node
  /// @param votePower The vote power when register
  /// @param blsPubKey The bls public key of PoS node
  /// @param vrfPubKey The vrf public key of PoS node
  /// @param blsPubKeyProof The bls public key proof of PoS node
  ///
  function register(
    bytes32 indentifier,
    uint64 votePower,
    bytes calldata blsPubKey,
    bytes calldata vrfPubKey,
    bytes[2] calldata blsPubKeyProof
  ) public virtual payable onlyOwner {
    require(!_poolRegisted, "Pool is already registed");
    require(votePower == 1, "votePower should be 1");
    require(msg.value == votePower * CFX_VALUE_OF_ONE_VOTE, "msg.value should be 1000 CFX");
    _stakingDeposit(msg.value);
    _posRegisterRegister(indentifier, votePower, blsPubKey, vrfPubKey, blsPubKeyProof);
    _poolRegisted = true;

    // update pool info
    _poolSummary.available += votePower;
    _updatePoolShot();

    // update user info
    userSummaries[msg.sender].votes += votePower;
    userSummaries[msg.sender].available += votePower;
    userSummaries[msg.sender].locked += votePower;  // directly add to admin's locked votes
    _updateUserShot(msg.sender);
    
    //
    stakers.add(msg.sender);
  }

  ///
  /// @notice Increase PoS vote power
  /// @param votePower The number of vote power to increase
  ///
  function increaseStake(uint64 votePower) public virtual payable onlyRegisted {
    require(votePower > 0, "Minimal votePower is 1");
    require(msg.value == votePower * CFX_VALUE_OF_ONE_VOTE, "msg.value should be votePower * 1000 ether");
    
    _stakingDeposit(msg.value);
    _posRegisterIncreaseStake(votePower);
    emit IncreasePoSStake(msg.sender, votePower);

    _updateAccRewardPerCfx();
    
    //
    _poolSummary.available += votePower;
    _updatePoolShot();

    // update user interest
    _updateUserInterest(msg.sender);
    
    // put stake info in queue
    userInqueues[msg.sender].enqueue(VotePowerQueue.QueueNode(votePower, _blockNumber() + _poolLockPeriod));
    userSummaries[msg.sender].votes += votePower;
    userSummaries[msg.sender].available += votePower;
    _updateUserShot(msg.sender);

    stakers.add(msg.sender);
  }

  ///
  /// @notice Decrease PoS vote power
  /// @param votePower The number of vote power to decrease
  ///
  function decreaseStake(uint64 votePower) public virtual onlyRegisted {
    userSummaries[msg.sender].locked += userInqueues[msg.sender].collectEndedVotes();
    require(userSummaries[msg.sender].locked >= votePower, "Locked is not enough");
    _posRegisterRetire(votePower);
    emit DecreasePoSStake(msg.sender, votePower);

    _updateAccRewardPerCfx();

    //
    _poolSummary.available -= votePower;
    _updatePoolShot();

    // update user interest
    _updateUserInterest(msg.sender);

    //
    userOutqueues[msg.sender].enqueue(VotePowerQueue.QueueNode(votePower, _blockNumber() + _poolLockPeriod));
    userSummaries[msg.sender].available -= votePower;
    userSummaries[msg.sender].locked -= votePower;
    _updateUserShot(msg.sender);
  }

  ///
  /// @notice Withdraw PoS vote power
  /// @param votePower The number of vote power to withdraw
  ///
  function withdrawStake(uint64 votePower) public onlyRegisted {
    userSummaries[msg.sender].unlocked += userOutqueues[msg.sender].collectEndedVotes();
    require(userSummaries[msg.sender].unlocked >= votePower, "Unlocked is not enough");
    _stakingWithdraw(votePower * CFX_VALUE_OF_ONE_VOTE);
    //    
    userSummaries[msg.sender].unlocked -= votePower;
    userSummaries[msg.sender].votes -= votePower;
    
    address payable receiver = payable(msg.sender);
    receiver.transfer(votePower * CFX_VALUE_OF_ONE_VOTE);
    emit WithdrawStake(msg.sender, votePower);

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

    // add latest profit
    uint256 _latestReward = _selfBalance() - lastPoolShot.balance;
    UserShot memory uShot = lastUserShots[_address];
    if (_latestReward > 0 && uShot.available > 0) {
      uint256 _deltaAcc = _calUserShare(_latestReward).div(lastPoolShot.available.mul(CFX_COUNT_OF_ONE_VOTE));
      uint256 _latestAccRewardPerCfx = accRewardPerCfx.add(_deltaAcc);
      uint256 _latestInterest = _latestAccRewardPerCfx.sub(uShot.accRewardPerCfx).mul(uShot.available.mul(CFX_COUNT_OF_ONE_VOTE));
      _interest = _interest.add(_latestInterest);
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

    uint256 _latestReward = _selfBalance() - lastPoolShot.balance;
    if (_latestReward > 0) {
      _updateAccRewardPerCfx();
      // update poolShot's balance
      _updatePoolShot();
    }
    _updateUserInterest(msg.sender);
    //
    userSummaries[msg.sender].claimedInterest = userSummaries[msg.sender].claimedInterest.add(amount);
    userSummaries[msg.sender].currentInterest = userSummaries[msg.sender].currentInterest.sub(amount);
    address payable receiver = payable(msg.sender);
    receiver.transfer(amount);
    emit ClaimInterest(msg.sender, amount);
    
    // update userShot's accRewardPerCfx
    _updateUserShot(msg.sender);
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
    return 0;
  }

  /// 
  /// @notice Query pools contract address
  /// @return Pool's PoS address
  ///
  function posAddress() public view onlyRegisted returns (bytes32) {
    return _posAddressToIdentifier(address(this));
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

  /// 
  /// @notice Enable admin to set the pool name
  ///
  function setPoolName(string memory name) public onlyOwner {
    poolName = name;
  }

  /// @param count Vote cfx count, unit is cfx
  function setCfxCountOfOneVote(uint256 count) public onlyOwner {
    CFX_COUNT_OF_ONE_VOTE = count;
    CFX_VALUE_OF_ONE_VOTE = count * 1 ether;
  }

  function _withdrawCFX(uint256 amount) public onlyOwner {
    require(_poolSummary.interest > amount, "Not enough interest");
    require(_selfBalance() > amount, "Balance not enough");
    address payable receiver = payable(msg.sender);
    receiver.transfer(amount);
    _poolSummary.interest = _poolSummary.interest.sub(amount);
  }

  // Used to bring account's retired votes back to work
  // reStake _poolSummary.available
  function reStake(uint64 votePower) public onlyOwner {
    _posRegisterIncreaseStake(votePower);
  }

  function stakerNumber() public view returns (uint) {
    return stakers.length();
  }

  function stakerAddress(uint256 i) public view returns (address) {
    return stakers.at(i);
  }

  /* function _retireUserStake(address _addr, uint64 endBlockNumber) public onlyOwner {
    uint64 votePower = userSummaries[_addr].available;
    if (votePower == 0) return;
    _poolSummary.available -= votePower;
    userSummaries[_addr].available = 0;
    userSummaries[_addr].locked = 0;
    userOutqueues[_addr].enqueue(VotePowerQueue.QueueNode(votePower, endBlockNumber));

    // clear user inqueue
    userInqueues[_addr].clear();
    
    // add votePowerSection
    UserShot memory lastShot = lastUserShots[_addr];
    if (lastShot.available > 0) {
      votePowerSections[_addr].push(VotePowerSection({
        startBlock: lastShot.blockNumber, 
        endBlock: _blockNumber(), 
        available: lastShot.available
      }));
    }

    // update user shot
    lastUserShots[_addr].available = 0;
    lastUserShots[_addr].blockNumber = _blockNumber();
  }

  // When pool node is force retired, use this method to make all user's available stake to unlocking
  function _retireUserStakes(uint256 offset, uint256 limit, uint64 endBlockNumber) public onlyOwner {
    uint256 len = stakers.length();
    uint256 end = offset + limit;
    if (end > len) {
      end = len;
    }
    for (uint256 i = offset; i < end; i++) {
      _retireUserStake(stakers.at(i), endBlockNumber);
    }
    _shotRewardSectionAndUpdateLastShot();
  } */

}