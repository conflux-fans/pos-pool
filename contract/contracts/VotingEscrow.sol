//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@confluxfans/contracts/InternalContracts/ParamsControl.sol";
import "./interfaces/IVotingEscrow.sol";
import "./interfaces/IPoSPool.sol";

contract VotingEscrow is Ownable, Initializable, IVotingEscrow {
    // Add the library methods
    using EnumerableSet for EnumerableSet.AddressSet;

    ParamsControl public constant paramsControl = ParamsControl(0x0888000000000000000000000000000000000007);
    uint256 public constant ONE_DAY_BLOCK_NUMBER = 2 * 3600 * 24;
    uint256 public constant QUARTER_BLOCK_NUMBER = ONE_DAY_BLOCK_NUMBER * 365 / 4; // 3 months
    uint256 public constant CFX_VALUE_OF_ONE_VOTE = 1000 ether;
    
    IPoSPool public posPool;

    mapping(uint256 => uint256) public globalLockAmount; // unlock block => amount (user total lock amount)
    mapping(address => LockInfo) private _userLockInfo;
    uint256 public lastUnlockBlock;

    // round => user => topic => votes
    mapping(uint64 => mapping(address => mapping(uint16 => uint256[3]))) private userVoteInfo;
    // round => topic => votes
    mapping(uint64 => mapping(uint16 => uint256[3])) public poolVoteInfo;

    struct VoteMeta {
        uint256 blockNumber;
        uint256 availablePower;
    }

    // round => user => topic => meta
    mapping(uint64 => mapping(address => mapping(uint16 => VoteMeta))) private userVoteMeta;
    // round => topic => users
    mapping(uint64 => mapping(uint16 => EnumerableSet.AddressSet)) private topicSpecialVoters; // voters who's vote power maybe will change at round end block

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

    function userVotePower(address user, uint256 blockNumber) public override view returns (uint256) {
        if (_userLockInfo[user].amount == 0 || _userLockInfo[user].unlockBlock < blockNumber) {
            return 0;
        }
        
        uint256 period = (_userLockInfo[user].unlockBlock - blockNumber) / QUARTER_BLOCK_NUMBER;

        // full vote power if period >= 4
        if (period > 4) {
            period = 4;
        }

        if (period == 3) {  // no 0.75
            period = 2;
        }

        return _userLockInfo[user].amount * period / 4;
    }

    function userVotePower(address user) public override view returns (uint256) {
        return userVotePower(user, block.number);
    }

    function userLockInfo(address user) public override view returns (LockInfo memory) {
        return userLockInfo(user, block.number);
    }

    function userLockInfo(address user, uint256 blockNumber) public override view returns (LockInfo memory) {
        LockInfo memory info = _userLockInfo[user];
        if (info.unlockBlock < blockNumber) {
            info.amount = 0;
            info.unlockBlock = 0;
        }
        return info;
    }

    function castVote(uint64 vote_round, uint16 topic_index, uint256[3] memory votes) public override {
        require(_onlyOneVote(votes), "Only one vote is allowed");
        require(vote_round == paramsControl.currentRound(), "Governance: invalid vote round");
        uint256 totalVotes = _sumVote(votes);
        require(userVotePower(msg.sender) >= totalVotes, "Governance: insufficient vote power");

        // if one user's vote power maybe will change, add it to topicSpecialVoters
        if (userVotePower(msg.sender, _currentRoundEndBlock()) < totalVotes) {
            topicSpecialVoters[vote_round][topic_index].add(msg.sender);
            userVoteMeta[vote_round][msg.sender][topic_index] = VoteMeta(block.number, totalVotes);
        }

        // update userVoteInfo and poolVoteInfo
        for (uint16 i = 0; i < votes.length; i++) {
            uint256 lastVote = userVoteInfo[vote_round][msg.sender][topic_index][i];
            if (votes[i] > lastVote) {
                uint256 delta = votes[i] - lastVote;
                poolVoteInfo[vote_round][topic_index][i] += delta;
            } else {
                uint256 delta = lastVote - votes[i];
                poolVoteInfo[vote_round][topic_index][i] -= delta;
            }
            userVoteInfo[vote_round][msg.sender][topic_index][i] = votes[i];
        }

        // update users who's vote power have changed
        if (topicSpecialVoters[vote_round][topic_index].length() > 0) {
            for(uint256 i = 0; i < topicSpecialVoters[vote_round][topic_index].length(); i ++) {
                address addr = topicSpecialVoters[vote_round][topic_index].at(i);
                /* if (addr == msg.sender) {
                    continue;
                } */
                // uint256 lastBlockNumber = userVoteMeta[vote_round][addr][topic_index].blockNumber;
                uint256 lastPower = userVoteMeta[vote_round][addr][topic_index].availablePower;
                uint256 currentPower = userVotePower(addr);
                if (lastPower > currentPower) {
                    uint256 delta = lastPower - currentPower;
                    uint256 index = _findVoteIndex(userVoteInfo[vote_round][addr][topic_index]);
                    userVoteInfo[vote_round][addr][topic_index][index] -= delta;
                    poolVoteInfo[vote_round][topic_index][index] -= delta;
                    if (currentPower == userVotePower(addr, _currentRoundEndBlock())) {
                        topicSpecialVoters[vote_round][topic_index].remove(msg.sender);
                        delete userVoteMeta[vote_round][addr][topic_index];
                    } else {
                        userVoteMeta[vote_round][addr][topic_index] = VoteMeta(block.number, currentPower);
                    }
                }
            }
        }

        // do the vote cast
        ParamsControl.Vote[] memory structVotes = new ParamsControl.Vote[](1);
        structVotes[0] = ParamsControl.Vote(topic_index, poolVoteInfo[vote_round][topic_index]);
        posPool.castVote(vote_round, structVotes);

        emit CastVote(msg.sender, vote_round, topic_index, votes);
    }

    function readVote(address addr, uint16 topicIndex) public override view returns (ParamsControl.Vote memory) {
        ParamsControl.Vote memory vote = ParamsControl.Vote(topicIndex, userVoteInfo[paramsControl.currentRound()][addr][topicIndex]);
        return vote;
    }

    // admin functions
    function setPosPool(address _posPool) public onlyOwner {
        posPool = IPoSPool(_posPool);
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

    function _currentRoundEndBlock() internal view returns (uint256) {
        // not sure 8888 network one round period is how long
        return _onChainDaoStartBlock() + paramsControl.currentRound() * ONE_DAY_BLOCK_NUMBER * 60;
    }

    function _onChainDaoStartBlock() internal view returns (uint256) {
        uint256 cid = _getChainID();
        if (cid == 1) {
            return 112400000;
        } else if (cid == 1029) {
            return 133800000;
        } else if (cid == 8888) {
            return 360000;  // maybe will change
        }
        return 0;
    }

    function _getChainID() internal view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }

    // internal functions
    function _adjustBlockNumber(uint256 blockNumber) internal pure returns (uint256) {
        uint256 adjusted = (blockNumber / QUARTER_BLOCK_NUMBER) * QUARTER_BLOCK_NUMBER;
        if (adjusted < blockNumber) { // if not divide exactly
            return adjusted + QUARTER_BLOCK_NUMBER;
        }
        return adjusted;
    }

    function _sumVote(uint256[3] memory votes) internal pure returns (uint256) {
        uint256 totalVotes = 0;
        for (uint16 i = 0; i < 3; i++) {
            totalVotes += votes[i];
        }
        return totalVotes;
    }

    function _onlyOneVote(uint256[3] memory votes) internal pure returns (bool) {
        uint256 count = 0;
        for (uint16 i = 0; i < 3; i++) {
            if (votes[i] > 0) {
                count++;
            }
        }
        return count == 1;
    }

    function _findVoteIndex(uint256[3] memory votes) internal pure returns (uint256) {
        for (uint16 i = 0; i < 3; i++) {
            if (votes[i] > 0) {
                return i;
            }
        }
        return votes.length; // no index found
    }
}