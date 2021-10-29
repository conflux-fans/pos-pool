//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./PoSPool.sol";

/**
  How to test?
  1. Override PoSPool and remove the PoSRegister interactions
  2. Shot the lock & unlock period
  3. Dev a offline task to send reward to contract regularly
  4. Test the five main interaction method: register, increaseStake, decreaseStake, withdrawStake, claimInterest
  5. Test the query methods: userInterest
 */

contract PoSPoolTest is PoSPool {

  function register(bytes32 indentifier, uint64 votePower, bytes calldata blsPubKey, bytes calldata vrfPubKey, bytes[2] calldata blsPubKeyProof) public override payable onlyAdmin {
    super.register(indentifier, votePower, blsPubKey, vrfPubKey, blsPubKeyProof);
  }

  function increaseStake(uint64 votePower) public override payable onlyRegisted {
    super.increaseStake(votePower);
  }
  function decreaseStake(uint64 votePower) public override onlyRegisted {
    super.decreaseStake(votePower);
  }
}