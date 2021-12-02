//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./PoolContext.sol";
import "./VotePowerQueue.sol";
import "./PoSPoolStorage.sol";

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
contract PoSPool is PoolContext, PoSPoolStorage, Ownable {
  using SafeMath for uint256;
  using VotePowerQueue for VotePowerQueue.InOutQueue;
  using EnumerableSet for EnumerableSet.AddressSet;

  // ======================== Modifiers =========================

  modifier onlyRegisted() {
    require(_poolRegisted, "Pool is not registed");
    _;
  }

  // ======================== Helpers =========================

  function _updateLastPoolShot() private {
    lastPoolShot.available = _poolSummary.available;
    lastPoolShot.blockNumber = _blockNumber();
    lastPoolShot.balance = _selfBalance();
  }

  function _shotRewardSection() private {
    if (_selfBalance() < lastPoolShot.balance) {
      revert UnnormalReward(lastPoolShot.balance, _selfBalance(), block.number);
    }
    // create section startBlock number -> section index mapping
    rewardSectionIndexByBlockNumber[lastPoolShot.blockNumber] = rewardSections.length;
    
    uint reward = _selfBalance().sub(lastPoolShot.balance);
    // save new section
    rewardSections.push(RewardSection({
      startBlock: lastPoolShot.blockNumber,
      endBlock: _blockNumber(),
      available: lastPoolShot.available,
      reward: reward
    }));
    // acumulate pool interest
    uint _poolShare = reward.mul(RATIO_BASE - poolUserShareRatio).div(RATIO_BASE);
    _poolSummary.interest = _poolSummary.interest.add(_poolShare);
    _poolSummary.totalInterest = _poolSummary.totalInterest.add(reward);
  }

  function _shotRewardSectionAndUpdateLastShot() private {
    _shotRewardSection();
    _updateLastPoolShot();
  }

  function _updateLastUserShot() private {
    lastUserShots[msg.sender].available = userSummaries[msg.sender].available;
    lastUserShots[msg.sender].blockNumber = _blockNumber();
  }

  function _shotVotePowerSection() private {
    UserShot memory lastShot = lastUserShots[msg.sender];
    if (lastShot.available == 0) {
      return;
    }
    votePowerSections[msg.sender].push(VotePowerSection({
      startBlock: lastShot.blockNumber, 
      endBlock: _blockNumber(), 
      available: lastShot.available
    }));
  }

  function _shotVotePowerSectionAndUpdateLastShot() private {
    _shotVotePowerSection();
    _updateLastUserShot();
  }

  // ======================== Events =========================

  event IncreasePoSStake(address indexed user, uint64 votePower);

  event DecreasePoSStake(address indexed user, uint64 votePower);

  event WithdrawStake(address indexed user, uint64 votePower);

  event ClaimInterest(address indexed user, uint256 amount);

  event RatioChanged(uint64 ratio);

  error UnnormalReward(uint256 previous, uint256 current, uint256 blockNumber);

  // ======================== Contract methods =========================

  // constructor() {}

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
    require(msg.value == votePower * CFX_COUNT_OF_ONE_VOTE, "msg.value should be 1000 CFX");
    _stakingDeposit(msg.value);
    _posRegisterRegister(indentifier, votePower, blsPubKey, vrfPubKey, blsPubKeyProof);
    _poolRegisted = true;
    // update pool and user info
    _poolSummary.available += votePower;
    userSummaries[msg.sender].votes += votePower;
    userSummaries[msg.sender].available += votePower;
    userSummaries[msg.sender].locked += votePower;  // directly add to admin's locked votes
    // create the initial shot of pool and admin
    _updateLastUserShot();
    _updateLastPoolShot();

    stakers.add(msg.sender);
  }

  ///
  /// @notice Increase PoS vote power
  /// @param votePower The number of vote power to increase
  ///
  function increaseStake(uint64 votePower) public virtual payable onlyRegisted {
    require(votePower > 0, "Minimal votePower is 1");
    require(msg.value == votePower * CFX_COUNT_OF_ONE_VOTE, "msg.value should be votePower * 1000 ether");
    _stakingDeposit(msg.value);
    _posRegisterIncreaseStake(votePower);
    emit IncreasePoSStake(msg.sender, votePower);
    //
    _poolSummary.available += votePower;
    userSummaries[msg.sender].votes += votePower;
    userSummaries[msg.sender].available += votePower;

    // put stake info in queue
    userInqueues[msg.sender].enqueue(VotePowerQueue.QueueNode(votePower, _blockNumber() + _poolLockPeriod));

    _shotVotePowerSectionAndUpdateLastShot();
    _shotRewardSectionAndUpdateLastShot();

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
    //
    _poolSummary.available -= votePower;
    userSummaries[msg.sender].available -= votePower;
    userSummaries[msg.sender].locked -= votePower;

    //
    userOutqueues[msg.sender].enqueue(VotePowerQueue.QueueNode(votePower, _blockNumber() + _poolLockPeriod));

    _shotVotePowerSectionAndUpdateLastShot();
    _shotRewardSectionAndUpdateLastShot();
  }

  ///
  /// @notice Withdraw PoS vote power
  /// @param votePower The number of vote power to withdraw
  ///
  function withdrawStake(uint64 votePower) public onlyRegisted {
    userSummaries[msg.sender].unlocked += userOutqueues[msg.sender].collectEndedVotes();
    require(userSummaries[msg.sender].unlocked >= votePower, "Unlocked is not enough");
    _stakingWithdraw(votePower * CFX_COUNT_OF_ONE_VOTE);
    //    
    userSummaries[msg.sender].unlocked -= votePower;
    userSummaries[msg.sender].votes -= votePower;
    
    address payable receiver = payable(msg.sender);
    receiver.transfer(votePower * CFX_COUNT_OF_ONE_VOTE);
    emit WithdrawStake(msg.sender, votePower);

    if (userSummaries[msg.sender].votes == 0) {
      stakers.remove(msg.sender);
    }
  }

  function _calculateShare(uint256 reward, uint64 userVotes, uint64 poolVotes) private view returns (uint256) {
    return reward.mul(userVotes).mul(poolUserShareRatio).div(poolVotes * RATIO_BASE);
  }

  function _rSectionStartIndex(uint256 _bNumber) private view returns (uint64) {
    return uint64(rewardSectionIndexByBlockNumber[_bNumber]);
  }

  /**
    Calculate user's latest interest (not in sections)
   */
  function _userLatestInterest(address _address) public view returns (uint256) {
    uint latestInterest = 0;
    UserShot memory uShot = lastUserShots[_address];
    // include latest not shot reward section
    if (_selfBalance() > lastPoolShot.balance) {
      uint256 latestReward = _selfBalance().sub(lastPoolShot.balance);
      uint256 currentShare = _calculateShare(latestReward, uShot.available, lastPoolShot.available);
      latestInterest = latestInterest.add(currentShare);
    }

    uint64 start = _rSectionStartIndex(uShot.blockNumber);

    // If user shot is the last one of all shots, then can't get start index from blockNumber
    if (start == 0) {
      return latestInterest;
    }

    for (uint64 i = start; i < rewardSections.length; i++) {
      RewardSection memory pSection = rewardSections[i];
      /* if (uShot.blockNumber >= pSection.endBlock) {
        continue;
      } */
      uint256 _currentShare = _calculateShare(pSection.reward, uShot.available, pSection.available);
      latestInterest = latestInterest.add(_currentShare);
    }
    
    return latestInterest;
  }

  function _userSectionInterest(address _address) public view returns (uint256) {
    uint totalInterest = 0;
    VotePowerSection[] memory uSections = votePowerSections[_address];
    if (uSections.length == 0) {
      return totalInterest;
    }
    uint64 start = _rSectionStartIndex(uSections[0].startBlock);
    for (uint64 i = start; i < rewardSections.length; i++) {
      RewardSection memory pSection = rewardSections[i];
      if (pSection.reward == 0) {
        continue;
      }
      for (uint32 j = 0; j < uSections.length; j++) {
        if (uSections[j].startBlock >= pSection.endBlock) {
          break;
        }
        if (uSections[j].endBlock <= pSection.startBlock) {
          continue;
        }
        bool include = uSections[j].startBlock <= pSection.startBlock && uSections[j].endBlock >= pSection.endBlock;
        if (!include) {
          continue;
        }
        uint256 currentSectionShare = _calculateShare(pSection.reward, uSections[j].available, pSection.available);
        totalInterest = totalInterest.add(currentSectionShare);
      }
    }
    return totalInterest;
  }

  // collet all user section interest to currentInterest and clear user's votePowerSections
  function _collectUserInterestAndCleanVoteSection() private onlyRegisted {
    uint256 collectedInterest = _userSectionInterest(msg.sender);
    userSummaries[msg.sender].currentInterest = userSummaries[msg.sender].currentInterest.add(collectedInterest);
    delete votePowerSections[msg.sender]; // delete all user's votePowerSection or use arr.length = 0
  }

  ///
  /// @notice User's interest from participate PoS
  /// @param _address The address of user to query
  /// @return CFX interest in Drip
  ///
  function userInterest(address _address) public view returns (uint256) {
    uint interest = 0;
    interest = interest.add(_userSectionInterest(_address));
    interest = interest.add(_userLatestInterest(_address));
    return interest.add(userSummaries[_address].currentInterest);
  }

  ///
  /// @notice Claim specific amount user interest
  /// @param amount The amount of interest to claim
  ///
  function claimInterest(uint amount) public onlyRegisted {
    uint claimableInterest = userInterest(msg.sender);
    require(claimableInterest >= amount, "Interest not enough");
    /*
      NOTE: The order is important:
      1. shot pool section
      2. send reward
      3. update lastPoolShot
    */
    _shotVotePowerSectionAndUpdateLastShot();
    _shotRewardSection();
    _collectUserInterestAndCleanVoteSection();
    //
    userSummaries[msg.sender].claimedInterest = userSummaries[msg.sender].claimedInterest.add(amount);
    userSummaries[msg.sender].currentInterest = userSummaries[msg.sender].currentInterest.sub(amount);
    address payable receiver = payable(msg.sender);
    receiver.transfer(amount);
    emit ClaimInterest(msg.sender, amount);
    //
    _updateLastPoolShot();
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

  function _rewardSeciontWorkload(RewardSection memory _section) private view returns(uint256) {
    return CFX_COUNT_OF_ONE_VOTE.mul(_section.available).mul(_section.endBlock - _section.startBlock);
  }

  function _poolAPY(uint256 startBlock) public view returns (uint32) {
    uint256 totalWorkload = 0;
    uint256 totalReward = 0;

    // latest section APY
    RewardSection memory latestSection = RewardSection({
      startBlock: lastPoolShot.blockNumber,
      endBlock: _blockNumber(),
      reward: _selfBalance().sub(lastPoolShot.balance),
      available: lastPoolShot.available
    });

    totalWorkload = totalWorkload.add(_rewardSeciontWorkload(latestSection));
    totalReward = totalReward.add(latestSection.reward);

    uint256 rLen = rewardSections.length;
    for (uint256 i = 0; i < rLen; i++) {
      RewardSection memory section = rewardSections[rLen - i - 1];
      if (section.endBlock < startBlock) {
        break;
      }
      totalWorkload = totalWorkload.add(_rewardSeciontWorkload(section));
      totalReward = totalReward.add(section.reward);
    }

    return uint32(totalReward.mul(RATIO_BASE).mul(ONE_YEAR_BLOCK_COUNT).div(totalWorkload));
  }

  function poolAPY () public view returns (uint32) {
    if (block.number > SEVEN_DAY_BLOCK_COUNT) {
      return _poolAPY(block.number - SEVEN_DAY_BLOCK_COUNT);
    } else {
      return _poolAPY(0);
    }
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

  // collect user interest in a pagination way to avoid gas OOM
  function collectUserLatestSectionsInterest(uint256 sectionCount) public onlyRegisted {
    _collectUserLatestSectionsInterest(msg.sender, sectionCount);
  }

  function collectUserLatestInterestPagination(uint64 limit) public onlyRegisted {
    _collectUserLatestInterestPagination(msg.sender, limit);
  }

  function collectUserLastVotePowerSectionPagination(uint64 limit) public onlyRegisted {
    _collectUserLastVotePowerSectionPagination(msg.sender, limit);
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
    CFX_COUNT_OF_ONE_VOTE = count * 1 ether;
  }

  function _withdrawCFX(uint256 amount) public onlyOwner {
    require(_selfBalance() > amount, "Balance must be greater than amount");
    address payable receiver = payable(msg.sender);
    receiver.transfer(amount);
  }

  // Used to bring account's retired votes back to work
  // reStake _poolSummary.available
  function reStake(uint64 votePower) public onlyOwner {
    _posRegisterIncreaseStake(votePower);
  }

  function stakerNumber() public view returns (uint) {
    return stakers.length();
  }

  function _retireUserStake(address _addr, uint64 endBlockNumber) public onlyOwner {
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
  }

  function collectUserLatestSectionsInterestByAdmin(address _addr, uint256 sectionCount) public onlyRegisted onlyOwner {
    _collectUserLatestSectionsInterest(_addr, sectionCount);
  }

  function collectUserLatestInterestPaginationByAdmin(address _addr, uint64 limit) public onlyRegisted onlyOwner {
    _collectUserLatestInterestPagination(_addr, limit);
  }

  function collectUserLastVotePowerSectionPaginationByAdmin(address _addr, uint64 limit) public onlyRegisted onlyOwner {
    _collectUserLastVotePowerSectionPagination(_addr, limit);
  }

  // These methods are used to collect user's interest in a pagination way to avoid gas OOM
  function _collectUserLatestSectionsInterest(address _user, uint256 sectionCount) private {
    require(sectionCount <= 100, "Max section count is 100");
    
    VotePowerSection[] storage uSections = votePowerSections[_user];
    require(uSections.length > 0, "No sections");

    if (uSections.length < sectionCount) {
      sectionCount = uSections.length;
    }

    uint totalInterest = 0;
    // from back to start
    for(uint256 i = 0; i < sectionCount; i++) {
      VotePowerSection memory vSection = uSections[uSections.length - i - 1];
      uint64 start = _rSectionStartIndex(vSection.startBlock);
      for (uint64 j = start; j < rewardSections.length; j++) {
        if (rewardSections[j].startBlock >= vSection.endBlock) {
          break;
        }
        if (rewardSections[j].reward == 0) {
          continue;
        }
        uint256 currentSectionShare = _calculateShare(rewardSections[j].reward, vSection.available, rewardSections[j].available);
        totalInterest = totalInterest.add(currentSectionShare);
      }
      uSections.pop();
    }
    userSummaries[_user].currentInterest = userSummaries[_user].currentInterest.add(totalInterest);
  }

  function _collectUserLatestInterestPagination(address _user, uint64 limit) private {
    require(limit <= 100, "Max section count is 100");

    UserShot storage uShot = lastUserShots[_user];
    require(uShot.blockNumber < lastPoolShot.blockNumber, "No new user shot");

    uint64 start = _rSectionStartIndex(uShot.blockNumber);
    uint64 end = start + limit;
    if (end > rewardSections.length) {
      end = uint64(rewardSections.length);
    }

    uint256 totalInterest = 0;
    for (uint64 i = start; i < end; i++) {
      RewardSection memory pSection = rewardSections[i];
      if (pSection.reward == 0) {
        continue;
      }
      uint256 currentSectionShare = _calculateShare(pSection.reward, uShot.available, pSection.available);
      totalInterest = totalInterest.add(currentSectionShare);
    }

    userSummaries[_user].currentInterest = userSummaries[_user].currentInterest.add(totalInterest);
    uShot.blockNumber = rewardSections[end - 1].endBlock;
  }

  function _collectUserLastVotePowerSectionPagination(address _user, uint64 limit) private {
    require(limit <= 100, "Max section count is 100");

    VotePowerSection[] storage uSections = votePowerSections[_user];
    require(uSections.length > 0, "No vote power section");

    uint64 start = _rSectionStartIndex(uSections[uSections.length - 1].startBlock);
    uint64 end = start + limit;
    if (end > rewardSections.length) {
      end = uint64(rewardSections.length);
    }

    uint256 totalInterest = 0;
    for (uint64 i = start; i < end; i++) {
      RewardSection memory pSection = rewardSections[i];
      if (pSection.reward == 0) {
        continue;
      }
      uint256 currentSectionShare = _calculateShare(pSection.reward, uSections[uSections.length - 1].available, pSection.available);
      totalInterest = totalInterest.add(currentSectionShare);
    }
    
    userSummaries[_user].currentInterest = userSummaries[_user].currentInterest.add(totalInterest);
    if (end == rewardSections.length) {
      uSections.pop();
    } else {
      uSections[uSections.length - 1].startBlock = rewardSections[end - 1].endBlock;
    }
  }

  ///////// debug methods
  function _rewardSections() public view returns (RewardSection[] memory) {
    return rewardSections;
  }

  function _votePowerSections(address _address) public view returns (VotePowerSection[] memory) {
    return votePowerSections[_address];
  }

  function _lastRewardSection() public view returns (RewardSection memory) {
    return rewardSections[rewardSections.length - 1];
  }

  function _lastVotePowerSection(address _address) public view returns (VotePowerSection memory) {
    return votePowerSections[_address][votePowerSections[_address].length - 1];
  }

  function _userShot(address _address) public view returns (UserShot memory) {
    return lastUserShots[_address];
  }

  function _poolShot() public view returns (PoolShot memory) {
    return lastPoolShot;
  }

}