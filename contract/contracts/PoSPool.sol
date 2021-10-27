//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@confluxfans/contracts/InternalContracts/InternalContractsLib.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
  TODO
  1. deal pool retired situation
  2. upgradable
  3, binded PoS address
 */
contract PoSPool {
  using SafeMath for uint256;
  using SafeMath for uint64;

  uint64 constant private ONE_DAY_BLOCK_COUNT = 2 * 60 * 60 * 24;
  uint64 constant private SEVEN_DAY_BLOCK_COUNT = ONE_DAY_BLOCK_COUNT * 7;

  // ======================== Pool config =========================

  address private _poolAdmin;
  bool private _poolRegisted;
  uint8 private _poolUserShareRatio; // ratio shared by user: 1-100

  // ======================== Struct definitions =========================

  struct PoolSummary {
    // uint64 allVotes;  // can get through PoS RPC or 
    uint64 availableVotes;
    // uint poolInterest; // TODO pool vailable interest
  }

  struct UserSummary {
    uint64 votes;  // Total votes in PoS system, including locking, locked, unlocking, unlocked
    uint64 available; // locking + locked
    uint64 locked;
    uint64 unlocked;
    uint claimedInterest;
  }

  struct PoolShot {
    uint64 available;
    uint64 blockNumber;
    uint balance;
  } 

  struct UserShot {
    uint64 available;
    uint64 blockNumber;
  }

  struct RewardSection {
    uint64 startBlock;
    uint64 endBlock;
    uint64 available;
    uint reward;
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
  
  PoolShot private lastPoolShot;
  mapping(address => UserShot) private lastUserShots;

  mapping(address => UserSummary) private userInfos;
  mapping(address => InOutQueue) private userInqueues;
  mapping(address => InOutQueue) private userOutqueues;

  // ======================== Modifiers =========================

  modifier onlyAdmin() {
    require(msg.sender == getAdmin(), "need admin permission");
    _;
  }

  function getAdmin() public view returns (address) {
    address _checkAdmin = InternalContracts.ADMIN_CONTROL.getAdmin(address(this));
    return _checkAdmin;
  }

  modifier onlyRegisted() {
    require(_poolRegisted, "Pool is not registed");
    _;
  }

  // ======================== Helpers =========================

  function _moveLockedFromQueueToTotal() private {
    InOutQueue storage q = userInqueues[msg.sender];
    uint64 locked = 0;
    for (uint64 i = q.start; i < q.end; i++) {
      if (q.items[i].endBlock >= block.number) {
        locked += q.items[i].votePower;
        dequeue(q);
      } else {
        break;
      }
    }
    userInfos[msg.sender].locked += locked;
  }

  function _moveUnlockedFromQueueToTotal() private {
    InOutQueue storage q = userOutqueues[msg.sender];
    uint64 unlocked = 0;
    for (uint64 i = q.start; i < q.end; i++) {
      if (q.items[i].endBlock > block.number) {
        unlocked += q.items[i].votePower;
        dequeue(q);
      } else {
        break;
      }
    }
    userInfos[msg.sender].unlocked += unlocked;
  }

  function _updateLastPoolShot() private {
    lastPoolShot.available = poolSummary.availableVotes;
    lastPoolShot.blockNumber = _blockNumber();
    lastPoolShot.balance = _selfBalance();
  }

  function _shotPoolSection() private {
    uint reward = _selfBalance() - lastPoolShot.balance; // TODO check negative situation
    rewardSections.push(RewardSection({
      startBlock: lastPoolShot.blockNumber, 
      endBlock: _blockNumber(), 
      reward: reward,
      available: lastPoolShot.available
    }));
  }

  function _shotPoolSectionAndUpdateLastShot() private {
    _shotPoolSection();
    _updateLastPoolShot();
  }

  function _updateLastUserShot() private {
    lastUserShots[msg.sender].available = userInfos[msg.sender].available;
    lastUserShots[msg.sender].blockNumber = _blockNumber();
  }

  function _shotUserSection() private {
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

  function _shotUserSectionAndUpdateLastShot() private {
    _shotUserSection();
    _updateLastUserShot();
  }

  function _selfBalance() private view returns (uint) {
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

  // ======================== Contract methods =========================

  constructor() {
    _poolAdmin = msg.sender;
    poolSummary = PoolSummary(0);
    _poolUserShareRatio = 90; // default user ratio
  }

  function register(bytes32 indentifier, bytes calldata blsPubKey, bytes calldata vrfPubKey, bytes[2] calldata blsPubKeyProof) public payable onlyAdmin {
    uint64 votePower = 1;
    require(msg.value == votePower * 100 ether, "The tx value can only be 100 CFX");
    InternalContracts.STAKING.deposit(msg.value);
    InternalContracts.POS_REGISTER.register(indentifier, votePower, blsPubKey, vrfPubKey, blsPubKeyProof);
    _poolRegisted = true;
    // update pool and user info
    poolSummary.availableVotes += votePower;
    userInfos[msg.sender].votes += votePower;
    userInfos[msg.sender].available += votePower;
    userInfos[msg.sender].locked += votePower;
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
    userInfos[msg.sender].votes += votePower;
    userInfos[msg.sender].available += votePower;

    // put stake info in queue
    InOutQueue storage q = userInqueues[msg.sender];
    enqueue(q, QueueNode(votePower, _blockNumber() + SEVEN_DAY_BLOCK_COUNT));

    _shotUserSectionAndUpdateLastShot();
    _shotPoolSectionAndUpdateLastShot();
  }

  function decreaseStake(uint64 votePower) public onlyRegisted {
    _moveLockedFromQueueToTotal();
    require(userInfos[msg.sender].locked >= votePower, "Locked is not enough");
    InternalContracts.POS_REGISTER.retire(votePower);
    emit DecreasePoSStake(msg.sender, votePower);
    //
    poolSummary.availableVotes -= votePower;
    userInfos[msg.sender].available -= votePower;
    userInfos[msg.sender].locked -= votePower;

    //
    InOutQueue storage q = userOutqueues[msg.sender];
    enqueue(q, QueueNode(votePower, _blockNumber() + SEVEN_DAY_BLOCK_COUNT));

    _shotUserSectionAndUpdateLastShot();
    _shotPoolSectionAndUpdateLastShot();
  }

  function withdrawStake(uint64 votePower) public onlyRegisted {
    _moveUnlockedFromQueueToTotal();
    require(userInfos[msg.sender].unlocked >= votePower, "Unlocked is not enough");
    InternalContracts.STAKING.withdraw(votePower * 100 ether);

    //    
    userInfos[msg.sender].unlocked -= votePower;
    userInfos[msg.sender].votes -= votePower;
    
    address payable receiver = payable(msg.sender);
    receiver.transfer(votePower * 100 ether);
    emit WithdrawStake(msg.sender, votePower);
  }

  function userInterest() public view onlyRegisted returns (uint) {
    uint totalIntereset = 0;
    VotePowerSection[] memory uSections = votePowerSections[msg.sender];
    for (uint32 i = 0; i < rewardSections.length; i++) {
      RewardSection memory pSection = rewardSections[i];
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
        totalIntereset += (pSection.reward * _poolUserShareRatio / 100) * uSections[j].available / pSection.available;
      }
    }

    // calculate lastest section;
    UserShot memory uShot = lastUserShots[msg.sender];
    for (uint32 i = 0; i < rewardSections.length; i++) {
      RewardSection memory pSection = rewardSections[i];
      if (uShot.blockNumber >= pSection.endBlock) {
        continue;
      }
      totalIntereset += (pSection.reward * _poolUserShareRatio / 100) * uShot.available / pSection.available;
    }
    return totalIntereset - userInfos[msg.sender].claimedInterest;
  }

  function claimInterest(uint amount) public onlyRegisted {
    uint claimableInterest = userInterest();
    require(claimableInterest >= amount, "You can not claim so much interest");

    userInfos[msg.sender].claimedInterest += amount;

    _shotUserSectionAndUpdateLastShot();

    /*
      NOTE: The order is important:
      1. shot pool section
      2. send reward
      3. update lastPoolShot
    */
    _shotPoolSection();
    //
    address payable receiver = payable(msg.sender);
    receiver.transfer(amount);
    emit ClaimInterest(msg.sender, amount);
    //
    _updateLastPoolShot();
  }

  function userSummary() public view returns (UserSummary memory) {
    return userInfos[msg.sender];
  }

  function setPoolUserShareRatio(uint8 ratio) public onlyAdmin {
    require(ratio > 0 && ratio <= 100, "ratio should be 1-100");
    _poolUserShareRatio = ratio;
  }
}