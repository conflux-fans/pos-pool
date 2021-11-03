//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@confluxfans/contracts/InternalContracts/Staking.sol";
import "@confluxfans/contracts/InternalContracts/PoSRegister.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./PoolContext.sol";
import "./VotePowerQueue.sol";

///
///  @title PoSPool
///  @author Pana.W
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
contract PoSPool is PoolContext {
  using SafeMath for uint256;

  uint64 constant private ONE_DAY_BLOCK_COUNT = 2 * 3600 * 24;
  uint64 constant private SEVEN_DAY_BLOCK_COUNT = ONE_DAY_BLOCK_COUNT * 7;
  uint64 constant private ONE_YEAR_BLOCK_COUNT = ONE_DAY_BLOCK_COUNT * 365;
  uint32 constant private RATIO_BASE = 10000;
  uint256 constant private CFX_COUNT_OF_ONE_VOTE = 100 ether; // NOTE: mainnet will be 1000
  
  // ======================== Pool config =========================

  address private _poolAdmin;
  bool public _poolRegisted;
  uint32 public poolUserShareRatio; // ratio shared by user: 1-10000
  uint64 public _poolLockPeriod = SEVEN_DAY_BLOCK_COUNT;
  string public _poolName;

  Staking private constant STAKING = Staking(0x0888000000000000000000000000000000000002);
  PoSRegister private constant POS_REGISTER = PoSRegister(0x0888000000000000000000000000000000000005);

  // ======================== Struct definitions =========================

  struct PoolSummary {
    // uint64 allVotes;  // can get through PoS RPC
    uint64 available;
    uint256 interest;
    uint256 totalInterest; // total interest of all pools
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

  PoolSummary public poolSummary;

  RewardSection[] internal rewardSections;
  mapping(address => VotePowerSection[]) internal votePowerSections;
  mapping(uint256 => uint256) private rewardSectionIndexByBlockNumber; // from blockNumber to section index in array, used to fast find rewardSection
  
  PoolShot internal lastPoolShot;
  mapping(address => UserShot) internal lastUserShots;

  mapping(address => UserSummary) private userSummaries;
  mapping(address => VotePowerQueue.InOutQueue) internal userInqueues;
  mapping(address => VotePowerQueue.InOutQueue) internal userOutqueues;

  // ======================== Modifiers =========================

  modifier onlyRegisted() {
    require(_poolRegisted, "Pool is not registed");
    _;
  }

  modifier onlyOwner() {
    require(msg.sender == _poolAdmin, "Only pool admin can do this");
    _;
  }

  // ======================== Helpers =========================

  function _updateLastPoolShot() private {
    lastPoolShot.available = poolSummary.available;
    lastPoolShot.blockNumber = _blockNumber();
    lastPoolShot.balance = _selfBalance();
  }

  function _shotRewardSection() private {
    if (_selfBalance() < lastPoolShot.balance) {
      revert UnnormalReward(lastPoolShot.balance, _selfBalance(), block.number);
    }
    // create section startBlock number -> section index mapping
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
    uint _poolShare = reward.mul(RATIO_BASE - poolUserShareRatio).div(RATIO_BASE);
    poolSummary.interest = poolSummary.interest.add(_poolShare);
    poolSummary.totalInterest = poolSummary.totalInterest.add(reward);
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

  // ======================== InternalContract's method wrapper ==============
  function _stakingDeposit(uint256 _amount) public virtual {
    STAKING.deposit(_amount);
  }

  function _stakingWithdraw(uint256 _amount) public virtual {
    STAKING.withdraw(_amount);
  }

  function _posRegisterRegister(
    bytes32 indentifier,
    uint64 votePower,
    bytes calldata blsPubKey,
    bytes calldata vrfPubKey,
    bytes[2] calldata blsPubKeyProof
  ) public virtual {
    POS_REGISTER.register(indentifier, votePower, blsPubKey, vrfPubKey, blsPubKeyProof);
  }

  function _posRegisterIncreaseStake(uint64 votePower) public virtual {
    POS_REGISTER.increaseStake(votePower);
  }

  function _posRegisterRetire(uint64 votePower) public virtual {
    POS_REGISTER.retire(votePower);
  }

  // ======================== Events =========================

  event IncreasePoSStake(address indexed user, uint64 votePower);

  event DecreasePoSStake(address indexed user, uint64 votePower);

  event WithdrawStake(address indexed user, uint64 votePower);

  event ClaimInterest(address indexed user, uint256 amount);

  event RatioChanged(uint32 ratio);

  error UnnormalReward(uint256 previous, uint256 current, uint256 blockNumber);

  // ======================== Contract methods =========================

  constructor() {
    _poolAdmin = msg.sender;
    poolUserShareRatio = 9000; // default user ratio
    poolSummary = PoolSummary({
      available: 0,
      interest: 0,
      totalInterest: 0
    });
  }

  ///
  /// @notice Enable admin to set the user share ratio
  /// @dev The ratio base is 10000, only admin can do this
  /// @param ratio The interest user share ratio (1-10000), default is 9000
  ///
  function setPoolUserShareRatio(uint32 ratio) public onlyOwner {
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
    _poolName = name;
  }

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
    poolSummary.available += votePower;
    userSummaries[msg.sender].votes += votePower;
    userSummaries[msg.sender].available += votePower;
    userSummaries[msg.sender].locked += votePower;  // directly add to admin's locked votes
    // create the initial shot of pool and admin
    _updateLastUserShot();
    _updateLastPoolShot();
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
    poolSummary.available += votePower;
    userSummaries[msg.sender].votes += votePower;
    userSummaries[msg.sender].available += votePower;

    // put stake info in queue
    VotePowerQueue.InOutQueue storage q = userInqueues[msg.sender];
    VotePowerQueue.enqueue(q, VotePowerQueue.QueueNode(votePower, _blockNumber() + _poolLockPeriod));

    _shotVotePowerSectionAndUpdateLastShot();
    _shotRewardSectionAndUpdateLastShot();
  }

  ///
  /// @notice Decrease PoS vote power
  /// @param votePower The number of vote power to decrease
  ///
  function decreaseStake(uint64 votePower) public virtual onlyRegisted {
    userSummaries[msg.sender].locked += VotePowerQueue.collectEndedVotes(userInqueues[msg.sender]);
    require(userSummaries[msg.sender].locked >= votePower, "Locked is not enough");
    _posRegisterRetire(votePower);
    emit DecreasePoSStake(msg.sender, votePower);
    //
    poolSummary.available -= votePower;
    userSummaries[msg.sender].available -= votePower;
    userSummaries[msg.sender].locked -= votePower;

    //
    VotePowerQueue.InOutQueue storage q = userOutqueues[msg.sender];
    VotePowerQueue.enqueue(q, VotePowerQueue.QueueNode(votePower, _blockNumber() + _poolLockPeriod));

    _shotVotePowerSectionAndUpdateLastShot();
    _shotRewardSectionAndUpdateLastShot();
  }

  ///
  /// @notice Withdraw PoS vote power
  /// @param votePower The number of vote power to withdraw
  ///
  function withdrawStake(uint64 votePower) public onlyRegisted {
    userSummaries[msg.sender].unlocked += VotePowerQueue.collectEndedVotes(userOutqueues[msg.sender]);
    require(userSummaries[msg.sender].unlocked >= votePower, "Unlocked is not enough");
    _stakingWithdraw(votePower * CFX_COUNT_OF_ONE_VOTE);
    //    
    userSummaries[msg.sender].unlocked -= votePower;
    userSummaries[msg.sender].votes -= votePower;
    
    address payable receiver = payable(msg.sender);
    receiver.transfer(votePower * CFX_COUNT_OF_ONE_VOTE);
    emit WithdrawStake(msg.sender, votePower);
  }

  function _calculateShare(uint256 reward, uint64 userVotes, uint64 poolVotes) private view returns (uint256) {
    return reward.mul(userVotes).mul(poolUserShareRatio).div(poolVotes * RATIO_BASE);
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

  // collet all user section interest to currentInterest and clear user's votePowerSections
  function _collectUserInterestAndCleanVoteSection() private onlyRegisted {
    uint256 collectedInterest = _userSectionInterest(msg.sender);
    userSummaries[msg.sender].currentInterest = userSummaries[msg.sender].currentInterest.add(collectedInterest);
    delete votePowerSections[msg.sender]; // delete this user's all votePowerSection or use arr.length = 0
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

    summary.locked += VotePowerQueue.sumEndedVotes(userInqueues[_user]);
    summary.unlocked += VotePowerQueue.sumEndedVotes(userOutqueues[_user]);

    return summary;
  }

  function _rewardSectionAPY(RewardSection memory _section) private pure returns (uint256) {
    uint256 sectionBlockCount = _section.endBlock - _section.startBlock;
    if (_section.reward == 0 || sectionBlockCount == 0) {
      return 0;
    }
    uint256 baseCfx = uint256(_section.available).mul(CFX_COUNT_OF_ONE_VOTE);
    uint256 apy = _section.reward.mul(RATIO_BASE).mul(ONE_YEAR_BLOCK_COUNT).div(baseCfx).div(sectionBlockCount);
    return apy;
  }

  function _poolAPY(uint256 startBlock) public view returns (uint32) {
    uint256 totalAPY = 0;
    uint256 apyCount = 0;

    // latest section APY
    RewardSection memory latestSection = RewardSection({
      startBlock: lastPoolShot.blockNumber,
      endBlock: _blockNumber(),
      reward: _selfBalance().sub(lastPoolShot.balance),
      available: lastPoolShot.available
    });
    totalAPY = totalAPY.add(_rewardSectionAPY(latestSection));
    apyCount += 1;

    for (uint256 i = rewardSections.length - 1; i >= 0; i++) {
      RewardSection memory section = rewardSections[i];
      if (section.endBlock < startBlock) {
        break;
      }
      uint256 apy = _rewardSectionAPY(section);
      totalAPY = totalAPY.add(apy);
      apyCount += 1;
    }

    return uint32(totalAPY.div(apyCount));
  }

  function poolAPY () public view returns (uint32) {
    uint256 oneDayAgoBlock = block.number - ONE_DAY_BLOCK_COUNT;
    return _poolAPY(oneDayAgoBlock);
  }

  /// 
  /// @notice Query pools contract address
  /// @return Pool's PoS address
  ///
  function posAddress() public view onlyRegisted returns (bytes32) {
    return POS_REGISTER.addressToIdentifier(address(this));
  }

  function userInQueue(address account) public view returns (VotePowerQueue.QueueNode[] memory) {
    return VotePowerQueue.queueItems(userInqueues[account]);
  }

  function userOutQueue(address account) public view returns (VotePowerQueue.QueueNode[] memory) {
    return VotePowerQueue.queueItems(userOutqueues[account]);
  }

  function userInQueue(address account, uint64 offset, uint64 limit) public view returns (VotePowerQueue.QueueNode[] memory) {
    return VotePowerQueue.queueItems(userInqueues[account], offset, limit);
  }

  function userOutQueue(address account, uint64 offset, uint64 limit) public view returns (VotePowerQueue.QueueNode[] memory) {
    return VotePowerQueue.queueItems(userOutqueues[account], offset, limit);
  }

  // ======================== admin methods =====================

  /* function _withdrawAll() public onlyOwner {
    // TODO retire logic
    uint256 _balance = STAKING.getStakingBalance(address(this));
    STAKING.withdraw(_balance);
    address payable receiver = payable(msg.sender);
    receiver.transfer(_balance);
  } */

}