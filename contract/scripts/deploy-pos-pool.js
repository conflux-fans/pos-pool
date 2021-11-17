/* eslint-disable prettier/prettier */
/* eslint-disable prefer-const */
/* eslint-disable no-unused-vars */
/* eslint-disable node/no-missing-require */
const {conflux, Drip, account} = require("./conflux.js");
const poolDebugInfo = require("../artifacts/contracts/PoSPoolDebug.sol/PoSPoolDebug.json");
const poolManagerInfo = require("../artifacts/contracts/PoolManager.sol/PoolManager.json");
const poolInfo = require("../artifacts/contracts/PoSPool.sol/PoSPool.json");
const mockStakingInfo = require("../artifacts/contracts/mocks/Staking.sol/MockStaking.json");
const mockPosRegisterInfo = require("../artifacts/contracts/mocks/PoSRegister.sol/MockPoSRegister.json");

let poolAddress;
let poolManagerAddress;

poolAddress = "NET8888:TYPE.CONTRACT:ACCHHA25SM4P7C0WXC778MMBTVNE99X53PXFWE26UN";
poolManagerAddress = "NET8888:TYPE.CONTRACT:ACC7GGWT2M5D8VY6F9P9221TN8KB4CRH2UVW0FA9HT";

const registData = '0xe335b4519ec6302aca39b1f58375f0e835e4ac7472618f2fef7b4cdefa1e657683881f25000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000308ff838a518ea03260c912ffc8b38a74467a23218c2042110b8e0a740eebd5a99036383fed6207dc3fbf0f1784f18f796000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000021021c1a2b1a0367dd5bc13ebf961389f6bbaa76de02b76a6b7ae44e9ef585e8033400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000030a3d6dd2086e7e27a6c6a5d05960ad6b814528ee42ce7bf9ee1dd96e307f36eeec78399d8b03049d8b7b5b389503e517e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002080d2cef79f9b0618109f59dd0f3201ebebfae766a83577b0742658cbd0eb9646';
// 9ec6302aca39b1f58375f0e835e4ac7472618f2fef7b4cdefa1e657683881f25
const mockPosRegisterAddress = 'NET8888:TYPE.CONTRACT:ACGMCGJFNJ1SSPHC1497RKC1VW6N7Z5D1J5TU8KN4D';
const mockStakingAddress = 'NET8888:TYPE.CONTRACT:ACF4KU7SD1B3YMUTESMYAFGZDJDKP39PBAT9AKU8JM';
const posPoolDebugAddress = 'NET8888:TYPE.CONTRACT:ACBZXYTA8P9WSH6GJXZTXPFMMWS6J0ACJJG6XKR7W3';

/*
  0. 部署矿池 Manager 合约
  1. 部署矿池合约
  2. 对矿池进行注册
  3. 将矿池合约添加到矿池Manager合约
*/

async function main() {
  const { abi, bytecode } = poolInfo;
  const poolContract = conflux.Contract({
    abi,
    address: poolAddress,
  });

  const poolContractDebug = conflux.Contract({
    abi,
    address: posPoolDebugAddress,
  });

  const managerContract = conflux.Contract({
    abi: poolManagerInfo.abi,
    address: poolManagerAddress,
  });
  // poolAddress = await deployPool();
  // poolManagerAddress = await deployPoolManager();
  // await addPoolToManager(managerContract, posPoolDebugAddress);
  // await setPoolName(poolContractDebug, "PoSPoolDebug");
  // await setPoolLockPeriod(poolContractDebug, 2 * 60 * 30);
  // await getPools(managerContract);
  // await getPoolInfo(poolContract);
  await registerPool(posPoolDebugAddress, registData);
  // await setCfxCountOfOneVote(poolContractDebug, 100);
  // await increaseStake(poolContract, 1);

  // await increaseStake(poolContract, 601);

  // await deployMockPosRegister();
  // await deployMockStaking();
  // await deployPoolDebug(mockStakingAddress, mockPosRegisterAddress);
}

async function getPoolInfo(contract) {
  const summary = await contract.poolSummary();
  console.log("Summary: ", summary);
  const _poolName = await contract._poolName();
  console.log("Pool name: ", _poolName);
  const poolApy = await contract.poolAPY();
  console.log("Pool APY: ", poolApy);
  // const poolApy = await contract._poolAPY(16392);
  // console.log(poolApy);
}

async function setPoolName(contract, name) {
  console.log("==================== Set pool name");
  let result = await contract.setPoolName(name).sendTransaction({
    from: account.address
  }).executed();
  _checkReceipt(result);
}

async function setPoolLockPeriod(contract, period) {
  console.log("==================== Set pool lockPeriod");
  let result = await contract.setLockPeriod(period).sendTransaction({
    from: account.address
  }).executed();
  _checkReceipt(result);
}

async function setCfxCountOfOneVote(contract, count) {
  console.log("==================== Set pool cfxCountOfOneVote");
  let result = await contract.setCfxCountOfOneVote(count).sendTransaction({
    from: account.address
  }).executed();
  _checkReceipt(result);
}

async function increaseStake(contract, votePower) {
  console.log("==================== increase stake");
  const receipt = await contract.increaseStake(votePower).sendTransaction({
    from: account.address,
    value: Drip.fromCFX(votePower * 1000),
  }).executed();
  _checkReceipt(receipt);
}


async function getPools (contract) {
  const pools = await contract.getPools();
  console.log("Pool list: ", pools);
}

async function deployContract(abi, bytecode, ...args) {
  const contract = conflux.Contract({
    abi,
    bytecode,
  });
  const receipt = await contract
    .constructor(...args)
    .sendTransaction({
      from: account.address,
    })
    .executed();

  if (receipt.outcomeStatus) {
    throw new Error("Deploy contract failed", receipt);
  }
  console.log("New deployed contract address", receipt.contractCreated);

  return receipt.contractCreated;
}

async function deployMockStaking() {
  console.log("==================== Deploying mock staking");
  const { abi, bytecode } = mockStakingInfo;
  return await deployContract(abi, bytecode);
}

async function deployMockPosRegister() {
  console.log("==================== Deploying mock pos register");
  const { abi, bytecode } = mockPosRegisterInfo;
  return await deployContract(abi, bytecode);
}

async function deployPoolDebug(stakingAddress, posRegisterAddress) {
  console.log("================ Deploy PoSPoolDebug");
  const { abi, bytecode } = poolDebugInfo;
  return await deployContract(abi, bytecode, stakingAddress, posRegisterAddress);
}

async function deployPool() {
  console.log("==================== Deploying pool");
  const { abi, bytecode } = poolInfo;
  return await deployContract(abi, bytecode);
}

async function deployPoolManager() {
  console.log("=================== Deploying manager");
  const { abi, bytecode } = poolManagerInfo;
  return await deployContract(abi, bytecode);
}

async function addPoolToManager(contract, poolAddress) {
  console.log("=================== Adding pool to manager");
  const receipt = await contract
    .addPool(poolAddress)
    .sendTransaction({
      from: account.address,
    })
    .executed();

  console.log("Pool added to manager result: ", receipt.outcomeStatus);
}

async function registerPool(poolAddress, data, value = 1000) {
  console.log("=================== Register pool");
  const receipt = await conflux.sendTransaction({
    from: account.address,
    to: poolAddress,
    data,
    value: Drip.fromCFX(value),
  }).executed();

  console.log("Pool register result: ", receipt.outcomeStatus);
}

async function _checkReceipt(receipt) {
  if (!receipt) {
    console.log('Receipt is null');
    return;
  }
  console.log(`${receipt.transactionHash} status: ${receipt.outcomeStatus}`);
}

main().catch(console.log);
