//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@confluxfans/contracts/InternalContracts/InternalContractsLib.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
  TODO
  1. deal pool retired situation
  2. upgradable
  3, multi-pool
 */
contract PoSPool {
  using SafeMath for uint256;

  uint64 constant private ONE_DAY_BLOCK_COUNT = 2 * 60 * 60 * 24;
  uint64 constant private SEVEN_DAY_BLOCK_COUNT = ONE_DAY_BLOCK_COUNT * 7;

  // ======================== Pool config =========================

  address private _poolAdmin;
  bool private _poolRegisted;
  uint8 private _poolUserShareRatio; // ratio shared by user: 1-100

  // ======================== Struct definitions =========================

  struct PoolSummary {
    // uint64 allVotes;  // can get through PoS RPC
    uint64 availableVotes;
    uint256 poolInterest;
  }

  struct UserSummary {
    uint64 votes;  // Total votes in PoS system, including locking, locked, unlocking, unlocked
    uint64 available; // locking + locked
    uint64 locked;
    uint64 unlocked;
    uint256 claimedInterest;
    uint256 currentInterest;
  }

  struct PoolShot {
    uint64 available; // available votes
    uint64 blockNumber;
    uint256 balance;
  } 

  struct UserShot {
    uint64 available;
    uint64 blockNumber;
  }

  struct RewardSection {
    uint64 startBlock;
    uint64 endBlock;
    uint64 available;
    uint256 reward;
  }

  struct VotePowerSection {
    uint64 startBlock;
    uint64 endBlock;
    uint64 available;
  }

  struct QueueNode {
    uint64 votePower;
    uint64 endBlock;
  }

  struct InOutQueue {
    uint64 start;
    uint64 end;
    mapping(uint64 => QueueNode) items;
  }

  function enqueue(InOutQueue storage queue, QueueNode memory item) internal {
    queue.items[queue.end++] = item;
  }

  function dequeue(InOutQueue storage queue) internal returns (QueueNode memory) {
    QueueNode memory item = queue.items[queue.start];
    // queue.items[queue.start++] = QueueNode(0, 0);
    delete queue.items[queue.start++];
    return item;
  }

  // ======================== Contract states =========================

  PoolSummary public poolSummary;

  RewardSection[] private rewardSections;
  mapping(address => VotePowerSection[]) private votePowerSections;
  mapping(uint64 => uint64) rewardSectionIndex; // from blockNumber to array index, used to fast find rewardSection
  
  PoolShot private lastPoolShot;
  mapping(address => UserShot) private lastUserShots;

  mapping(address => UserSummary) private userSummaries;
  mapping(address => InOutQueue) private userInqueues;
  mapping(address => InOutQueue) private userOutqueues;

  // ======================== Modifiers =========================

  modifier onlyAdmin() {
    require(msg.sender == getAdmin(), "need admin permission");
    _;
  }

  function getAdmin() private view returns (address) {
    address _checkAdmin = InternalContracts.ADMIN_CONTROL.getAdmin(address(this));
    return _checkAdmin;
  }

  modifier onlyRegisted() {
    require(_poolRegisted, "Pool is not registed");
    _;
  }

  // ======================== Helpers =========================

  /**
    sum all ended vote powers in queue and clean them from queue
   */
  function _collectEndedVotesFromQueue(InOutQueue storage q) private returns (uint64) {
    uint64 total = 0;
    for (uint64 i = q.start; i < q.end; i++) {
      if (q.items[i].endBlock >= block.number) {
        break;
      }
      total += q.items[i].votePower;
      dequeue(q);
    }
    return total;
  }

  function _updateLastPoolShot() private {
    lastPoolShot.available = poolSummary.availableVotes;
    lastPoolShot.blockNumber = _blockNumber();
    lastPoolShot.balance = _selfBalance();
  }

  function _shotRewardSection() private {
    if (_selfBalance() < lastPoolShot.balance) {
      revert UnnormalReward(lastPoolShot.balance, lastPoolShot.balance, block.number);
    }
    // create startBlock -> index mapping
    uint64 sectionLen = uint64(rewardSections.length);
    rewardSectionIndex[lastPoolShot.blockNumber] = sectionLen;
    // create new section
    uint reward = _selfBalance().sub(lastPoolShot.balance);
    rewardSections.push(RewardSection({
      startBlock: lastPoolShot.blockNumber,
      endBlock: _blockNumber(),
      available: lastPoolShot.available,
      reward: reward
    }));
    // acumulate pool interest
    uint _poolShare = reward.mul(100 - _poolUserShareRatio).div(100);
    poolSummary.poolInterest = poolSummary.poolInterest.add(_poolShare);
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
    VotePowerSection memory uSection = VotePowerSection({
      startBlock: lastShot.blockNumber, 
      endBlock: _blockNumber(), 
      available: lastShot.available
    });
    votePowerSections[msg.sender].push(uSection);
  }

  function _shotVotePowerSectionAndUpdateLastShot() private {
    _shotVotePowerSection();
    _updateLastUserShot();
  }

  function _selfBalance() private view returns (uint256) {
    address self = address(this);
    return self.balance;
  }

  function _blockNumber() private view returns (uint64) {
    return uint64(block.number);
  }

  // ======================== Events =========================

  event IncreasePoSStake(address indexed user, uint64 votePower);

  event DecreasePoSStake(address indexed user, uint64 votePower);

  event WithdrawStake(address indexed user, uint64 votePower);

  event ClaimInterest(address indexed user, uint256 amount);

  error UnnormalReward(uint256 previous, uint256 current, uint256 blockNumber);

  // ======================== Contract methods =========================

  constructor() {
    _poolAdmin = msg.sender;
    _poolUserShareRatio = 90; // default user ratio
    poolSummary = PoolSummary({
      availableVotes: 0,
      poolInterest: 0
    });
  }

  function setPoolUserShareRatio(uint8 ratio) public onlyAdmin {
    require(ratio > 0 && ratio <= 100, "ratio should be 1-100");
    _poolUserShareRatio = ratio;
  }

  function register(bytes32 indentifier, bytes calldata blsPubKey, bytes calldata vrfPubKey, bytes[2] calldata blsPubKeyProof) public payable onlyAdmin {
    uint64 votePower = 1;
    require(msg.value == votePower * 100 ether, "The tx value can only be 100 CFX");
    InternalContracts.STAKING.deposit(msg.value);
    InternalContracts.POS_REGISTER.register(indentifier, votePower, blsPubKey, vrfPubKey, blsPubKeyProof);
    _poolRegisted = true;
    // update pool and user info
    poolSummary.availableVotes += votePower;
    userSummaries[msg.sender].votes += votePower;
    userSummaries[msg.sender].available += votePower;
    userSummaries[msg.sender].locked += votePower;  // directly add to admin's locked votes
    // update pool and user last shot
    _updateLastUserShot();
    _updateLastPoolShot();
  }

  function increaseStake(uint64 votePower) public payable onlyRegisted {
    require(votePower > 0, "Minimal votePower is 1");
    require(msg.value == votePower * 100 ether, "The msg.value should be votePower * 100 ether");
    InternalContracts.STAKING.deposit(msg.value);
    InternalContracts.POS_REGISTER.increaseStake(votePower);
    emit IncreasePoSStake(msg.sender, votePower);
    //
    poolSummary.availableVotes += votePower;
    userSummaries[msg.sender].votes += votePower;
    userSummaries[msg.sender].available += votePower;

    // put stake info in queue
    InOutQueue storage q = userInqueues[msg.sender];
    enqueue(q, QueueNode(votePower, _blockNumber() + SEVEN_DAY_BLOCK_COUNT));

    _shotVotePowerSectionAndUpdateLastShot();
    _shotRewardSectionAndUpdateLastShot();
  }

  function decreaseStake(uint64 votePower) public onlyRegisted {
    userSummaries[msg.sender].locked += _collectEndedVotesFromQueue(userInqueues[msg.sender]);
    require(userSummaries[msg.sender].locked >= votePower, "Locked is not enough");
    InternalContracts.POS_REGISTER.retire(votePower);
    emit DecreasePoSStake(msg.sender, votePower);
    //
    poolSummary.availableVotes -= votePower;
    userSummaries[msg.sender].available -= votePower;
    userSummaries[msg.sender].locked -= votePower;

    //
    InOutQueue storage q = userOutqueues[msg.sender];
    enqueue(q, QueueNode(votePower, _blockNumber() + SEVEN_DAY_BLOCK_COUNT));

    _shotVotePowerSectionAndUpdateLastShot();
    _shotRewardSectionAndUpdateLastShot();
  }

  function withdrawStake(uint64 votePower) public onlyRegisted {
    userSummaries[msg.sender].unlocked += _collectEndedVotesFromQueue(userOutqueues[msg.sender]);
    require(userSummaries[msg.sender].unlocked >= votePower, "Unlocked is not enough");
    InternalContracts.STAKING.withdraw(votePower * 100 ether);

    //    
    userSummaries[msg.sender].unlocked -= votePower;
    userSummaries[msg.sender].votes -= votePower;
    
    address payable receiver = payable(msg.sender);
    receiver.transfer(votePower * 100 ether);
    emit WithdrawStake(msg.sender, votePower);
  }

  function _calculateShare(uint256 reward, uint64 userVotes, uint64 totalVotes) private view returns (uint256) {
    return reward.mul(userVotes).mul(_poolUserShareRatio).div(totalVotes * 100);
  }

  /**
    Calculate user's latest interest not in sections
   */
  function _userLatestInterest() private view onlyRegisted returns (uint256) {
    uint latestInterest = 0;
    UserShot memory uShot = lastUserShots[msg.sender];
    for (uint32 i = 0; i < rewardSections.length; i++) {
      RewardSection memory pSection = rewardSections[i];
      if (uShot.blockNumber >= pSection.endBlock) {
        continue;
      }
      uint256 currentShare = _calculateShare(pSection.reward, uShot.available, pSection.available);
      latestInterest = latestInterest.add(currentShare);
    }
    // include latest not shot reward section
    if (uShot.blockNumber <= lastPoolShot.blockNumber && _selfBalance() > lastPoolShot.balance) {
      uint256 latestReward = _selfBalance().sub(lastPoolShot.balance);
      uint256 currentShare = _calculateShare(latestReward, uShot.available, lastPoolShot.available);
      latestInterest = latestInterest.add(currentShare);
    }
    return latestInterest;
  }

  function _userSectionInterest() private view onlyRegisted returns (uint256) {
    uint totalInterest = 0;
    VotePowerSection[] memory uSections = votePowerSections[msg.sender];
    for (uint32 i = 0; i < rewardSections.length; i++) {
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

  /*
   * Currently user's total interest
  */
  function userInterest() public view onlyRegisted returns (uint256) {
    uint totalInterest = 0;
    totalInterest = totalInterest.add(_userSectionInterest());

    totalInterest = totalInterest.add(_userLatestInterest());
    
    return totalInterest.add(userSummaries[msg.sender].currentInterest);
  }

  // collet all user section interest to currentInterest and clear user's votePowerSections
  function _collectUserInterest() private onlyRegisted {
    uint256 collectedInterest = _userSectionInterest();
    userSummaries[msg.sender].currentInterest = userSummaries[msg.sender].currentInterest.add(collectedInterest);
    delete votePowerSections[msg.sender]; // delete this user's all votePowerSection or use arr.length = 0
  }

  function claimInterest(uint amount) public onlyRegisted {
    uint claimableInterest = userInterest();
    require(claimableInterest >= amount, "You can not claim so much interest");
    /*
      NOTE: The order is important:
      1. shot pool section
      2. send reward
      3. update lastPoolShot
    */
    _shotVotePowerSectionAndUpdateLastShot();
    _shotRewardSection();
    _collectUserInterest();
    //
    userSummaries[msg.sender].claimedInterest = userSummaries[msg.sender].claimedInterest.add(amount);
    userSummaries[msg.sender].currentInterest = userSummaries[msg.sender].currentInterest.sub(amount);
    address payable receiver = payable(msg.sender);
    receiver.transfer(amount);
    emit ClaimInterest(msg.sender, amount);
    //
    _updateLastPoolShot();
  }

  function userSummary() public view returns (UserSummary memory) {
    return userSummaries[msg.sender];
  }

  function posAddress() public view returns (bytes32) {
    return InternalContracts.POS_REGISTER.addressToIdentifier(address(this));
  }

}