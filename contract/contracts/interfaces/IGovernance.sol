//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IGovernance {
    struct LockInfo {
        uint256 amount;
        uint256 unlockBlock;
    }

    function userStakeAmount(address _user) external view returns (uint256);

    function createLock(uint256 amount, uint256 unlockBlock) external;
    function increaseLock(uint256 amount) external;
    function extendLockTime(uint256 unlockBlock) external;
    function userLockInfo(address user) external view returns (LockInfo memory);
    function userVotePower(address user) external view returns (uint256);

    function castVote(uint64 vote_round, uint16 topic_index, uint256[3] memory votes) external;

    event VoteLock(uint256 indexed amount, uint256 indexed unlockBlock);
    event CastVote(address indexed user, uint256 indexed round, uint256 indexed topicIndex, uint256[3] votes);
}