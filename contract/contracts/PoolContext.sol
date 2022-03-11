// SPDX-License-Identifier: MIT
import "@confluxfans/contracts/InternalContracts/Staking.sol";
import "@confluxfans/contracts/InternalContracts/PoSRegister.sol";

pragma solidity ^0.8.0;

abstract contract PoolContext {
  function _selfBalance() internal view virtual returns (uint256) {
    return address(this).balance;
  }

  function _blockNumber() internal view virtual returns (uint256) {
    return block.number;
  }

  Staking private constant STAKING = Staking(0x0888000000000000000000000000000000000002);
  PoSRegister private constant POS_REGISTER = PoSRegister(0x0888000000000000000000000000000000000005);
  
  function _stakingDeposit(uint256 _amount) internal virtual {
    STAKING.deposit(_amount);
  }

  function _stakingWithdraw(uint256 _amount) internal virtual {
    STAKING.withdraw(_amount);
  }

  function _posRegisterRegister(
    bytes32 indentifier,
    uint64 votePower,
    bytes calldata blsPubKey,
    bytes calldata vrfPubKey,
    bytes[2] calldata blsPubKeyProof
  ) internal virtual {
    POS_REGISTER.register(indentifier, votePower, blsPubKey, vrfPubKey, blsPubKeyProof);
  }

  function _posRegisterIncreaseStake(uint64 votePower) internal virtual {
    POS_REGISTER.increaseStake(votePower);
  }

  function _posRegisterRetire(uint64 votePower) internal virtual {
    POS_REGISTER.retire(votePower);
  }

  function _posAddressToIdentifier(address _addr) internal view returns (bytes32) {
    return POS_REGISTER.addressToIdentifier(_addr);
  }
}