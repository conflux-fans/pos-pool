// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PoolContext.sol";

contract LockTest is PoolContext {
    struct LockInfo {
        uint256 amount;
        uint256 unlockBlock;
    }

    event VoteLock(uint256 indexed amount, uint256 indexed unlockBlock);

    uint256 public constant QUARTER_BLOCK_NUMBER = 2 * 3600 * 24 * 365 / 4; // 3 months

    uint256 public totalStakedAmount;
    mapping(address => uint256) public userStakeAmount;

    mapping(uint256 => uint256) public globalLockAmount; // unlock block => amount (user total lock amount)
    mapping(address => LockInfo) public userLockInfo;

    uint256 public lastUnlockBlock;

    constructor() {}

    function stake(uint256 _amount) public payable {
        require(_amount >= 1 ether, "LockTest: amount too small");
        
        _stakingDeposit(_amount);
        totalStakedAmount += _amount;
        userStakeAmount[msg.sender] += _amount;
    }

    function unstake(uint256 _amount) public {
        require(userStakeAmount[msg.sender] >= _amount, "LockTest: insufficient balance");

        _stakingWithdraw(_amount);
        payable(msg.sender).transfer(_amount);

        totalStakedAmount -= _amount;
        userStakeAmount[msg.sender] -= _amount;
    }

    function stakingBalance() public view returns (uint256) {
        return _stakingBalance();
    }

    function stakingLockedStakingBalance(uint256 blockNumber) internal view returns (uint256) {
        return _stakingLockedStakingBalance(blockNumber);
    }

    function stakingVotePower(uint256 blockNumber) public view returns (uint256) {
        return _stakingVotePower(blockNumber);
    }

    function createLock(uint256 amount, uint256 unlockBlock) public {
        unlockBlock = _adjustBlockNumber(unlockBlock);
        require(userLockInfo[msg.sender].amount == 0 || userLockInfo[msg.sender].unlockBlock < block.number, "LockTest: already locked");
        require(unlockBlock > block.number, "LockTest: invalid unlock block");
        require(unlockBlock - block.number > QUARTER_BLOCK_NUMBER, "LockTest: unlock block too close");
        require(amount <= userStakeAmount[msg.sender], "LockTest: insufficient balance");

        userLockInfo[msg.sender] = LockInfo(amount, unlockBlock);
        globalLockAmount[unlockBlock] += amount;

        _lockStake(unlockBlock);
    }

    function increaseLock(uint256 amount) public {
        require(userLockInfo[msg.sender].amount > 0, "LockTest: not locked");
        require(userLockInfo[msg.sender].unlockBlock > block.number, "LockTest: already unlocked");
        require(userLockInfo[msg.sender].amount + amount <= userStakeAmount[msg.sender], "LockTest: insufficient balance");

        uint256 unlockBlock = userLockInfo[msg.sender].unlockBlock;
        userLockInfo[msg.sender].amount += amount;
        globalLockAmount[unlockBlock] += amount;

        _lockStake(unlockBlock);
    }

    function extendLockTime(uint256 unlockBlock) public {
        unlockBlock = _adjustBlockNumber(unlockBlock);
        require(userLockInfo[msg.sender].amount > 0, "LockTest: not locked");
        require(userLockInfo[msg.sender].unlockBlock > block.number, "LockTest: already unlocked");
        require(unlockBlock > userLockInfo[msg.sender].unlockBlock, "LockTest: invalid unlock block");

        uint256 oldUnlockNumber = userLockInfo[msg.sender].unlockBlock;
        uint256 amount = userLockInfo[msg.sender].amount;

        userLockInfo[msg.sender].unlockBlock = unlockBlock;
        globalLockAmount[oldUnlockNumber] -= amount;
        globalLockAmount[unlockBlock] += amount;

        _lockStake(unlockBlock);
    }

    function userVotePower(address _user) public view returns (uint256) {
        if (userLockInfo[_user].amount == 0 || userLockInfo[_user].unlockBlock < block.number) {
            return 0;
        }
        
        uint256 period = (userLockInfo[_user].unlockBlock - block.number) / QUARTER_BLOCK_NUMBER;

        // full vote power if period >= 4
        if (period > 4) {
            period = 4;
        }

        if (period == 3) {  // no 0.75
            period = 2;
        }

        return userLockInfo[_user].amount * period / 4;
    }

    // direct invoke _stakingVoteLock
    function justLock(uint256 amount, uint256 unlockBlock) public {
        _stakingVoteLock(amount, unlockBlock);
    }

    function _adjustBlockNumber(uint256 blockNumber) internal view returns (uint256) {
        return (blockNumber / QUARTER_BLOCK_NUMBER + 1) * QUARTER_BLOCK_NUMBER;
    }

    // do the real lock
    function _lockStake(uint256 unlockBlock) internal {
        if (unlockBlock > lastUnlockBlock) {
            lastUnlockBlock = unlockBlock;
        }

        uint256 accAmount = 0;
        uint256 blockNumber = lastUnlockBlock;

        while (blockNumber >= block.number) {
            accAmount += globalLockAmount[blockNumber];
            
            _stakingVoteLock(accAmount, blockNumber);
            emit VoteLock(accAmount, blockNumber);

            blockNumber -= QUARTER_BLOCK_NUMBER;
        }
    }

}