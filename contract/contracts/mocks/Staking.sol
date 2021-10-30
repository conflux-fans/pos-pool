// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract FakeStaking {
    using SafeMath for uint256;

    address private _admin;

    constructor() {
      _admin = msg.sender;
    }

    mapping(address => uint256) private _userStakes;

    /*** Query Functions ***/
    /**
     * @dev get user's staking balance
     * @param user The address of specific user
     */
    function getStakingBalance(address user) public view returns (uint256) {
      return _userStakes[user];
    }

    /**
     * @dev get user's locked staking balance at given blockNumber
     * @param user The address of specific user
     * @param blockNumber The blockNumber as index.
     */
    function getLockedStakingBalance(address user, uint256 blockNumber) public pure returns (uint256) {
      // TODO implement
      return 0;
    }

    /**
     * @dev get user's vote power staking balance at given blockNumber
     * @param user The address of specific user
     * @param blockNumber The blockNumber as index.
     */
    function getVotePower(address user, uint256 blockNumber) public pure returns (uint256) {
      // TODO
      return 0;
    }

    function deposit(uint256 amount) public payable {
      _userStakes[msg.sender] = _userStakes[msg.sender].add(amount);
    }

    function withdraw(uint256 amount) public {
      require(_userStakes[msg.sender] >= amount, "Insufficient balance");
      _userStakes[msg.sender] = _userStakes[msg.sender].sub(amount);
      uint256 interest = amount.mul(400).div(10000);  // TODO use a more realistic interest rate
      amount = amount.add(interest);
      address payable receiver = payable(msg.sender);
      receiver.transfer(amount);
    }

    function voteLock(uint256 amount, uint256 unlockBlockNumber) external {
      // TODO
    }

    function addInterest() public payable {
      require(msg.sender == _admin, "Only admin can add interest");
    }
}
