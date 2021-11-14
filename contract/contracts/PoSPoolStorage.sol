// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./VotePowerQueue.sol";

contract PoSPoolStorage {
  uint64 constant internal ONE_DAY_BLOCK_COUNT = 2 * 3600 * 24;
  uint64 constant internal SEVEN_DAY_BLOCK_COUNT = ONE_DAY_BLOCK_COUNT * 7;
  uint64 constant internal ONE_YEAR_BLOCK_COUNT = ONE_DAY_BLOCK_COUNT * 365;
  uint64 constant internal RATIO_BASE = 10000;
  
  // ======================== Pool config =========================

  bool public _poolRegisted;
  uint64 public poolUserShareRatio = 9000; // ratio shared by user: 1-10000
  uint64 public _poolLockPeriod = SEVEN_DAY_BLOCK_COUNT;
  uint256 internal CFX_COUNT_OF_ONE_VOTE = 1000 ether;
  address internal _poolAdmin;
  string public poolName;

  // ======================== Struct definitions =========================

  struct PoolSummary {
    uint64 available;
    uint256 interest;
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
    uint64 votes;  // Total votes in PoS system, including locking, locked, unlocking, unlocked
    uint64 available; // locking + locked
    uint64 locked;
    uint64 unlocked;
    uint256 claimedInterest;
    uint256 currentInterest;
  }

  struct PoolShot {
    uint64 available;
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

  // ======================== Contract states =========================

  PoolSummary public poolSummary = PoolSummary({
    available: 0,
    interest: 0,
    totalInterest: 0
  });

  RewardSection[] internal rewardSections;
  mapping(address => VotePowerSection[]) internal votePowerSections;
  mapping(uint256 => uint256) internal rewardSectionIndexByBlockNumber; // from blockNumber to section index in array, used to fast find rewardSection
  
  PoolShot internal lastPoolShot;
  mapping(address => UserShot) internal lastUserShots;

  mapping(address => UserSummary) internal userSummaries;
  mapping(address => VotePowerQueue.InOutQueue) internal userInqueues;
  mapping(address => VotePowerQueue.InOutQueue) internal userOutqueues;
}