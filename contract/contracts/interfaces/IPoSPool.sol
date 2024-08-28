//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import {ParamsControl} from "@confluxfans/contracts/InternalContracts/ParamsControl.sol";
import {VotePowerQueue} from "../utils/VotePowerQueue.sol";
import {IVotingEscrow} from "./IVotingEscrow.sol";

interface IPoSPool {
  struct PoolSummary {
    uint256 available;
    uint256 interest;
    uint256 totalInterest; // total interest of all pools
  }

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

  // admin functions
  function register(bytes32 indentifier, uint64 votePower, bytes calldata blsPubKey, bytes calldata vrfPubKey, bytes[2] calldata blsPubKeyProof) external payable;
  function setPoolUserShareRatio(uint32 ratio) external;
  function setLockPeriod(uint64 period) external;
  function setPoolName(string memory name) external;
  function reStake(uint64 votePower) external;

  // pool info
  function poolSummary() external view returns (PoolSummary memory);
  function poolAPY() external view returns (uint32);
  function poolUserShareRatio() external view returns (uint64); // will return pool general user share ratio
  // function userShareRatio() external view returns (uint64);  // will return user share ratio according feeFreeWhiteList
  function poolName() external view returns (string memory);
  function _poolLockPeriod() external view returns (uint64);

  // user functions
  function increaseStake(uint64 votePower) external payable;
  function decreaseStake(uint64 votePower) external;
  function withdrawStake(uint64 votePower) external;
  function userInterest(address _address) external view returns (uint256);
  function claimInterest(uint256 amount) external;
  function claimAllInterest() external;
  function userSummary(address _user) external view returns (UserSummary memory);
  function posAddress() external view returns (bytes32);
  function userInQueue(address account) external view returns (VotePowerQueue.QueueNode[] memory);
  function userOutQueue(address account) external view returns (VotePowerQueue.QueueNode[] memory);
  function userInQueue(address account, uint64 offset, uint64 limit) external view returns (VotePowerQueue.QueueNode[] memory);
  function userOutQueue(address account, uint64 offset, uint64 limit) external view returns (VotePowerQueue.QueueNode[] memory);

  function lockForVotePower(uint256 amount, uint256 unlockBlockNumber) external;
  function castVote(uint64 vote_round, ParamsControl.Vote[] calldata vote_data) external;
  function userLockInfo(address user) external view returns (IVotingEscrow.LockInfo memory);
  function votingEscrow() external view returns (address);
  function userVotePower(address user) external view returns (uint256);
}