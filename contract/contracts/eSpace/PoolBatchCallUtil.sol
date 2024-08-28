//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@confluxfans/contracts/InternalContracts/Staking.sol";
import "../interfaces/IPoSPool.sol";
import "../interfaces/IVotingEscrow.sol";

/**
 * Batch query user's staking information in multiple mining pools
 */
contract EPoSPoolBatchCall is Ownable {

    struct StakeInfo {
        address pool;
        string name;
        uint256 stakeAmount;
        uint256 lockAmount;
        uint256 unlockBlock;
        uint256 votePower;
        uint64 apy;
    }

    struct SelfStakeInfo {
        uint256 stakeAmount;
        uint256 lockAmount;
        uint256 unlockBlock;
        uint256 votePower;
    }

    address[] private posPools;

    function getStakeInfos(address[] memory pools, address user) public view returns (StakeInfo[] memory) {
        StakeInfo[] memory stakeInfos = new StakeInfo[](pools.length + posPools.length);
        for (uint256 i = 0; i < pools.length; i++) {
            stakeInfos[i] = getStakeInfo(pools[i], user);
        }
        for (uint256 i = 0; i < posPools.length; i++) {
            stakeInfos[i + pools.length] = getStakeInfo(posPools[i], user);
        }
        return stakeInfos;
    }

    /**
        Require the pool contract to implement the IPoSPool interface:
        poolName() returns (string)
        userSummary(address) returns (UserSummary)
        userLockInfo(address) returns (LockInfo)
        poolAPY() returns (uint64)
        votingEscrow() returns (address)
     */
    function getStakeInfo(address pool, address user) public view returns (StakeInfo memory) {
        StakeInfo memory stakeInfo;
        stakeInfo.pool = pool;
        stakeInfo.name = IPoSPool(pool).poolName();
        stakeInfo.stakeAmount = uint256(IPoSPool(pool).userSummary(user).votes) * 1000 ether;
        stakeInfo.lockAmount = IPoSPool(pool).userLockInfo(user).amount;
        stakeInfo.unlockBlock = IPoSPool(pool).userLockInfo(user).unlockBlock;
        stakeInfo.apy = uint64(IPoSPool(pool).poolAPY());
        stakeInfo.votePower = IVotingEscrow(IPoSPool(pool).votingEscrow()).userVotePower(user);
        return stakeInfo;
    }

    function addPoSPool(address pool) public onlyOwner {
        posPools.push(pool);
    }

    function removePool(address pool) public onlyOwner {
        // todo
        posPools.pop();
    }
}
