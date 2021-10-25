//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@confluxfans/contracts/InternalContracts/InternalContractsLib.sol";

contract PoSPool {
  address private _admin;
  uint8 private _poolRatio; // pool share ratio

  struct UserInfo {
    uint totalStake;
    uint claimedInterest;
  }

  struct PoolInfo {
    uint totalStake;
    uint totalInterest;
  }
  
  struct UserAction {
    address user;
    uint8 operateType;
    uint amount;
    uint happenBlockNumber; // action happen block number
    uint endBlockNumber; // action end block number
  }

  modifier onlyAdmin() {
    require(msg.sender == getAdmin(), "need admin permission");
    _;
  }

  function getAdmin() public view returns (address) {
    address _checkAdmin = InternalContracts.ADMIN_CONTROL.getAdmin(address(this));
    return _checkAdmin;
  }

  constructor() {
    _admin = msg.sender;
  }

  function register(bytes32 indentifier, bytes calldata blsPubKey, bytes calldata vrfPubKey, bytes[2] calldata blsPubKeyProof) public payable onlyAdmin {
    require(msg.value == 100 ether, "The tx value can only be 100 CFX");
    InternalContracts.STAKING.deposit(msg.value);
    InternalContracts.POS_REGISTER.register(indentifier, 1, blsPubKey, vrfPubKey, blsPubKeyProof);
  }

  function increaseStake(uint amount) public {
    // TODO
  }

  function decreaseStake(uint amount) public {
    // TODO
  }

  function claimInterest(uint amount) public {
    // TODO
  }

  function stakerInfo() public {
    // TODO
  }

  function poolInfo() public {
    // TODO
  }

  function setPoolShareRatio(uint8 ratio) public onlyAdmin {
    _poolRatio = ratio;
  }

  // 增加质押
  event IncreaseStake(address indexed user, uint amount, uint blockNumber);

  // 退休
  event Retire(address indexed user, uint amount, uint blockNumber);

  // 从 PoS 池撤出 CFX 
  event RevokeStake(address indexed user, uint amount, uint blockNumber);

  // 领取收益
  event ClaimInterest(address indexed user, uint amount, uint blockNumber);
}

/**
  每次有人 stake/unstake 需记录：操作的 blockNumber, amount, operateType
 */