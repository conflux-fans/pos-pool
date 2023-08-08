//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@confluxfans/contracts/InternalContracts/ParamsControl.sol";
import "./interfaces/IGovernance.sol";
import "./interfaces/IPoSPool.sol";

contract Governance is Ownable, Initializable, IGovernance {
    ParamsControl public constant paramsControl = ParamsControl(0x0888000000000000000000000000000000000007);
    uint256 public constant QUARTER_BLOCK_NUMBER = 2 * 3600 * 24 * 365 / 4; // 3 months
    uint256 public constant CFX_VALUE_OF_ONE_VOTE = 1000 ether;
    
    IPoSPool public posPool;

    mapping(uint256 => uint256) public globalLockAmount; // unlock block => amount (user total lock amount)
    mapping(address => LockInfo) private _userLockInfo;
    uint256 public lastUnlockBlock;

    // round => user => topic => votes
    mapping(uint64 => mapping(address => mapping(uint16 => uint256[3]))) public userVoteInfo;
    // round => topic => votes
    mapping(uint64 => mapping(uint64 => uint256[3])) public poolVoteInfo;

    constructor() {}

    function initialize() public initializer {
    }

    // available staked amount
    function userStakeAmount(address user) public override view returns (uint256) {
        return posPool.userSummary(user).available * CFX_VALUE_OF_ONE_VOTE;
    }

    function createLock(uint256 amount, uint256 unlockBlock) public override {
        unlockBlock = _adjustBlockNumber(unlockBlock);
        require(unlockBlock > block.number, "invalid unlock block");
        require(unlockBlock - block.number > QUARTER_BLOCK_NUMBER, "Governance: unlock block too close");
        require(_userLockInfo[msg.sender].amount == 0 || _userLockInfo[msg.sender].unlockBlock < block.number, "Governance: already locked");
        require(amount <= userStakeAmount(msg.sender), "Governance: insufficient balance");

        _userLockInfo[msg.sender] = LockInfo(amount, unlockBlock);
        globalLockAmount[unlockBlock] += amount;

        _lockStake(unlockBlock);
    }

    function increaseLock(uint256 amount) public override {
        require(_userLockInfo[msg.sender].amount > 0, "Governance: not locked");
        require(_userLockInfo[msg.sender].unlockBlock > block.number, "Governance: already unlocked");
        require(_userLockInfo[msg.sender].amount + amount <= userStakeAmount(msg.sender), "Governance: insufficient balance");

        uint256 unlockBlock = _userLockInfo[msg.sender].unlockBlock;
        _userLockInfo[msg.sender].amount += amount;
        globalLockAmount[unlockBlock] += amount;

        _lockStake(unlockBlock);
    }

    function extendLockTime(uint256 unlockBlock) public override {
        unlockBlock = _adjustBlockNumber(unlockBlock);
        require(_userLockInfo[msg.sender].amount > 0, "Governance: not locked");
        require(_userLockInfo[msg.sender].unlockBlock > block.number, "Governance: already unlocked");
        require(unlockBlock > _userLockInfo[msg.sender].unlockBlock, "Governance: invalid unlock block");

        uint256 oldUnlockNumber = _userLockInfo[msg.sender].unlockBlock;
        uint256 amount = _userLockInfo[msg.sender].amount;

        _userLockInfo[msg.sender].unlockBlock = unlockBlock;
        globalLockAmount[oldUnlockNumber] -= amount;
        globalLockAmount[unlockBlock] += amount;

        _lockStake(unlockBlock);
    }

    function userVotePower(address user) public override view returns (uint256) {
        if (_userLockInfo[user].amount == 0 || _userLockInfo[user].unlockBlock < block.number) {
            return 0;
        }
        
        uint256 period = (_userLockInfo[user].unlockBlock - block.number) / QUARTER_BLOCK_NUMBER;

        // full vote power if period >= 4
        if (period > 4) {
            period = 4;
        }

        if (period == 3) {  // no 0.75
            period = 2;
        }

        return _userLockInfo[user].amount * period / 4;
    }

    function userLockInfo(address user) public override view returns (LockInfo memory) {
        LockInfo memory info = _userLockInfo[user];
        if (info.unlockBlock < block.number) {
            info.amount = 0;
        }
        return info;
    }

    function castVote(uint64 vote_round, uint16 topic_index, uint256[3] memory votes) public override {
        require(vote_round == paramsControl.voteRound(), "Governance: invalid vote round");
        uint256 totalVotes = 0;
        for (uint16 i = 0; i < votes.length; i++) {
            totalVotes += votes[i];
        }
        require(userVotePower(msg.sender) >= totalVotes, "Governance: insufficient vote power");

        // update userVoteInfo and poolVoteInfo
        for (uint16 i = 0; i < votes.length; i++) {
            uint256 delta = votes[i] - userVoteInfo[vote_round][msg.sender][topic_index][i];
            poolVoteInfo[vote_round][topic_index][i] += delta;
            userVoteInfo[vote_round][msg.sender][topic_index][i] = votes[i];
        }

        // do the vote cast
        ParamsControl.Vote[] memory structVotes = new ParamsControl.Vote[](1);
        structVotes[0] = ParamsControl.Vote(topic_index, poolVoteInfo[vote_round][topic_index]);
        posPool.castVote(vote_round, structVotes);

        emit CastVote(msg.sender, vote_round, topic_index, votes);
    }

    // admin functions
    function setPosPool(address _posPool) public onlyOwner {
        posPool = IPoSPool(_posPool);
    }

    // internal functions
    function _adjustBlockNumber(uint256 blockNumber) internal pure returns (uint256) {
        return (blockNumber / QUARTER_BLOCK_NUMBER + 1) * QUARTER_BLOCK_NUMBER;
    }

    function _lockStake(uint256 unlockBlock) internal {
        if (unlockBlock > lastUnlockBlock) {
            lastUnlockBlock = unlockBlock;
        }

        uint256 accAmount = 0;
        uint256 blockNumber = lastUnlockBlock;

        while (blockNumber >= block.number) {
            accAmount += globalLockAmount[blockNumber];
            
            posPool.lockForVotePower(accAmount, blockNumber);
            emit VoteLock(accAmount, blockNumber);

            blockNumber -= QUARTER_BLOCK_NUMBER;
        }
    }
}