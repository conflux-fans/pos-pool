//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@confluxfans/contracts/InternalContracts/Staking.sol";
import "@confluxfans/contracts/InternalContracts/PoSRegister.sol";

contract InternalContractHandle {
  Staking private constant STAKING = Staking(0x0888000000000000000000000000000000000002);
  PoSRegister private constant POS_REGISTER = PoSRegister(0x0888000000000000000000000000000000000005);
  
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

  function _posAddressToIdentifier(address _addr) public view returns (bytes32) {
    return POS_REGISTER.addressToIdentifier(_addr);
  }
}