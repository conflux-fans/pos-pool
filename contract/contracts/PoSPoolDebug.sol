//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./PoSPool.sol";
import "./mocks/Staking.sol";
import "./mocks/PoSRegister.sol";

/// This use mock contracts to replace the real PoS contracts.
/// Which enable developer test it in ethereum
contract PoSPoolDebug is PoSPool {
  
  MockStaking private STAKING;
  MockPoSRegister private POS_REGISTER;

  constructor(address _stakingAddress, address _posRegisterAddress) {
    STAKING = MockStaking(_stakingAddress);
    POS_REGISTER = MockPoSRegister(_posRegisterAddress);
  }

  function _stakingDeposit(uint256 _amount) public override {
    // STAKING.deposit(_amount);
    STAKING.deposit{value: _amount}(_amount);
  }

  function _stakingWithdraw(uint256 _amount) public override {
    STAKING.withdraw(_amount);
  }

  function _posRegisterRegister(
    bytes32 indentifier,
    uint64 votePower,
    bytes calldata blsPubKey,
    bytes calldata vrfPubKey,
    bytes[2] calldata blsPubKeyProof
  ) public override {
    POS_REGISTER.register(indentifier, votePower, blsPubKey, vrfPubKey, blsPubKeyProof);
  }

  function _posRegisterIncreaseStake(uint64 votePower) public override {
    POS_REGISTER.increaseStake(votePower);
  }

  function _posRegisterRetire(uint64 votePower) public override {
    POS_REGISTER.retire(votePower);
  }

  receive() external payable {}

}