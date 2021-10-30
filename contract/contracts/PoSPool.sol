//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

// import "@confluxfans/contracts/InternalContracts/InternalContractsLib.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@confluxfans/contracts/InternalContracts/PoSRegister.sol";
import "@confluxfans/contracts/InternalContracts/Staking.sol";
import "@confluxfans/contracts/InternalContracts/AdminControl.sol";

 /**
  * Key points:
  * 1. Record pool and user state correctly
  * 2. Calculate user reward correctly
  * 
  * Note:
  * 1. Do not send CFX directly to the pool contract
  * 
  */
contract PoSPool {
  using SafeMath for uint256;

  uint64 constant private ONE_DAY_BLOCK_COUNT = 2 * 3600 * 24;
  uint64 constant private SEVEN_DAY_BLOCK_COUNT = ONE_DAY_BLOCK_COUNT * 7;
  uint32 constant private RATIO_BASE = 10000;
  
  // ======================== Pool config =========================

  address private _poolAdmin;
  bool private _poolRegisted;
  uint32 private _poolUserShareRatio; // ratio shared by user: 1-10000
  uint64 private _poolLockPeriod = SEVEN_DAY_BLOCK_COUNT;

  // Internal contracts
  AdminControl private constant ADMIN_CONTROL = AdminControl(0x0888000000000000000000000000000000000000);
  Staking private STAKING = Staking(0x0888000000000000000000000000000000000002);
  PoSRegister private POS_REGISTER = PoSRegister(0x0888000000000000000000000000000000000005);

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
  mapping(uint256 => uint256) private rewardSectionIndexByBlockNumber; // from blockNumber to section index in array, used to fast find rewardSection
  
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
    address _checkAdmin = ADMIN_CONTROL.getAdmin(address(this));
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
      if (q.items[i].endBlock > block.number) {
        break;
      }
      total += q.items[i].votePower;
      dequeue(q);
    }
    return total;
  }

  function _sumEndedVotesFromQueue(InOutQueue storage q) private view returns (uint64) {
    uint64 total = 0;
    for (uint64 i = q.start; i < q.end; i++) {
      if (q.items[i].endBlock > block.number) {
        break;
      }
      total += q.items[i].votePower;
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
      revert UnnormalReward(lastPoolShot.balance, _selfBalance(), block.number);
    }
    // create startBlock number -> section index mapping
    rewardSectionIndexByBlockNumber[lastPoolShot.blockNumber] = rewardSections.length;
    // save new section
    uint reward = _selfBalance().sub(lastPoolShot.balance);
    rewardSections.push(RewardSection({
      startBlock: lastPoolShot.blockNumber,
      endBlock: _blockNumber(),
      available: lastPoolShot.available,
      reward: reward
    }));
    // acumulate pool interest
    uint _poolShare = reward.mul(RATIO_BASE - _poolUserShareRatio).div(RATIO_BASE);
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
    _poolUserShareRatio = 9000; // default user ratio
    poolSummary = PoolSummary({
      availableVotes: 0,
      poolInterest: 0
    });
  }

  function setPoolUserShareRatio(uint8 ratio) public onlyAdmin {
    require(ratio > 0 && ratio <= RATIO_BASE, "ratio should be 1-10000");
    _poolUserShareRatio = ratio;
  }

  // 10 minutes: 2 * 60 * 10
  function setLockPeriod(uint64 period) public onlyAdmin {
    _poolLockPeriod = period;
  }

  function register(
    bytes32 indentifier,
    uint64 votePower,
    bytes calldata blsPubKey,
    bytes calldata vrfPubKey,
    bytes[2] calldata blsPubKeyProof
  ) public virtual payable onlyAdmin {
    require(!_poolRegisted, "Pool is already registed");
    require(votePower == 1, "votePower should be 1");
    require(msg.value == votePower * 100 ether, "The tx value can only be 100 CFX");
    STAKING.deposit(msg.value);
    POS_REGISTER.register(indentifier, votePower, blsPubKey, vrfPubKey, blsPubKeyProof);
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

  function increaseStake(uint64 votePower) public virtual payable onlyRegisted {
    require(votePower > 0, "Minimal votePower is 1");
    require(msg.value == votePower * 100 ether, "The msg.value should be votePower * 100 ether");
    STAKING.deposit(msg.value);
    POS_REGISTER.increaseStake(votePower);
    emit IncreasePoSStake(msg.sender, votePower);
    //
    poolSummary.availableVotes += votePower;
    userSummaries[msg.sender].votes += votePower;
    userSummaries[msg.sender].available += votePower;

    // put stake info in queue
    InOutQueue storage q = userInqueues[msg.sender];
    enqueue(q, QueueNode(votePower, _blockNumber() + _poolLockPeriod));

    _shotVotePowerSectionAndUpdateLastShot();
    _shotRewardSectionAndUpdateLastShot();
  }

  function decreaseStake(uint64 votePower) public virtual onlyRegisted {
    userSummaries[msg.sender].locked += _collectEndedVotesFromQueue(userInqueues[msg.sender]);
    require(userSummaries[msg.sender].locked >= votePower, "Locked is not enough");
    POS_REGISTER.retire(votePower);
    emit DecreasePoSStake(msg.sender, votePower);
    //
    poolSummary.availableVotes -= votePower;
    userSummaries[msg.sender].available -= votePower;
    userSummaries[msg.sender].locked -= votePower;

    //
    InOutQueue storage q = userOutqueues[msg.sender];
    enqueue(q, QueueNode(votePower, _blockNumber() + _poolLockPeriod));

    _shotVotePowerSectionAndUpdateLastShot();
    _shotRewardSectionAndUpdateLastShot();
  }

  function withdrawStake(uint64 votePower) public onlyRegisted {
    userSummaries[msg.sender].unlocked += _collectEndedVotesFromQueue(userOutqueues[msg.sender]);
    require(userSummaries[msg.sender].unlocked >= votePower, "Unlocked is not enough");
    STAKING.withdraw(votePower * 100 ether);
    //    
    userSummaries[msg.sender].unlocked -= votePower;
    userSummaries[msg.sender].votes -= votePower;
    
    address payable receiver = payable(msg.sender);
    receiver.transfer(votePower * 100 ether);
    emit WithdrawStake(msg.sender, votePower);
  }

  function _calculateShare(uint256 reward, uint64 userVotes, uint64 poolVotes) private view returns (uint256) {
    return reward.mul(userVotes).mul(_poolUserShareRatio).div(poolVotes * RATIO_BASE);
  }

  function _rSectionStartIndex(uint256 _bNumber) private view returns (uint64) {
    return uint64(rewardSectionIndexByBlockNumber[_bNumber]);
  }

  /**
    Calculate user's latest interest not in sections
   */
  function _userLatestInterest(address _address) private view returns (uint256) {
    uint latestInterest = 0;
    UserShot memory uShot = lastUserShots[_address];
    uint64 start = _rSectionStartIndex(uShot.blockNumber);
    for (uint64 i = start; i < rewardSections.length; i++) {
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

  function _userSectionInterest(address _address) private view returns (uint256) {
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

  /*
   * Currently user's total interest
  */
  function userInterest(address _address) public view returns (uint256) {
    uint interest = 0;
    interest = interest.add(_userSectionInterest(_address));
    interest = interest.add(_userLatestInterest(_address));
    return interest.add(userSummaries[_address].currentInterest);
  }

  // collet all user section interest to currentInterest and clear user's votePowerSections
  function _collectUserInterestAndCleanVoteSection() private onlyRegisted {
    uint256 collectedInterest = _userSectionInterest(msg.sender);
    userSummaries[msg.sender].currentInterest = userSummaries[msg.sender].currentInterest.add(collectedInterest);
    delete votePowerSections[msg.sender]; // delete this user's all votePowerSection or use arr.length = 0
  }

  function claimInterest(uint amount) public onlyRegisted {
    uint claimableInterest = userInterest(msg.sender);
    require(claimableInterest >= amount, "You can not claim so much interest");
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

  function claimAllInterest() public onlyRegisted {
    uint claimableInterest = userInterest(msg.sender);
    require(claimableInterest > 0, "You can not claim so much interest");
    claimInterest(claimableInterest);
  }

  function userSummary(address _user) public view returns (UserSummary memory) {
    UserSummary memory summary = userSummaries[_user];

    summary.locked += _sumEndedVotesFromQueue(userInqueues[_user]);
    summary.unlocked += _sumEndedVotesFromQueue(userOutqueues[_user]);

    return summary;
  }

  function posAddress() public view returns (bytes32) {
    return POS_REGISTER.addressToIdentifier(address(this));
  }

  // ====== Debug methods(will removed when publish) ======

  function _userInOutQueue(address _address, bool inOrOut) public view returns (QueueNode[] memory) {
    InOutQueue storage q;
    if (inOrOut) {
      q = userInqueues[_address];
    } else {
      q = userOutqueues[_address];
    }
    uint64 qLen = q.end - q.start;
    QueueNode[] memory nodes = new QueueNode[](qLen);
    uint64 j = 0;
    for(uint64 i = q.start; i < q.end; i++) {
      nodes[j++] = q.items[i];
    }
    return nodes;
  }

  function _rewardSections() public view returns (RewardSection[] memory) {
    return rewardSections;
  }

  function _votePowerSections(address _address) public view returns (VotePowerSection[] memory) {
    return votePowerSections[_address];
  }

  function _userShot(address _address) public view returns (UserShot memory) {
    return lastUserShots[_address];
  }

  function _poolShot() public view returns (PoolShot memory) {
    return lastPoolShot;
  }

  receive() external payable {}

  // used for test
  function _withdrawAll() public onlyAdmin {
    uint256 _balance = STAKING.getStakingBalance(address(this));
    STAKING.withdraw(_balance);
    address payable receiver = payable(msg.sender);
    receiver.transfer(_balance);
  }

  function _setStakingContract(address _stakingContractAddress) public onlyAdmin {
    STAKING = Staking(_stakingContractAddress);
  }

  function _setPoSRegisterContract(address _posRegisterContractAddress) public onlyAdmin {
    POS_REGISTER = PoSRegister(_posRegisterContractAddress);
  }
}