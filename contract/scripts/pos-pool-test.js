/* eslint-disable prettier/prettier */
/* eslint-disable no-unused-vars */
/* eslint-disable node/no-unsupported-features/es-builtins */
const { Conflux, Drip } = require("js-conflux-sdk");
const contractInfo = require("../artifacts/contracts/PoSPool.sol/PoSPool.json");
const poolManagerInfo = require("../artifacts/contracts/PoolManager.sol/PoolManager.json");
const poolContractInfo = require("../artifacts/contracts/PoSPool.sol/PoSPool.json");

const ONE_YEAR_BLOCK = BigInt(2 * 3600 * 24 * 365);
const FAKE_RATIO = BigInt(8); // 8%
const FAKE_PERIOD_MINUTE = 5;
const FAKE_PERIOD = BigInt(2 * 60 * FAKE_PERIOD_MINUTE); // five minutes

const option = {
  url: "http://101.132.158.162:12537",
  networkId: 8888,
};

/* const option = {
  url: "https://test.confluxrpc.com",
  networkId: 1,
}; */

const conflux = new Conflux(option);

const account = conflux.wallet.addPrivateKey(process.env.PRIVATE_KEY);
const account2 = conflux.wallet.addPrivateKey(process.env.PRIVATE_KEY2);

/*
  posPool history:
  cfxtest:aceapcwj3p76bsyfjzdm70v7emshd8wp9p4uxmv0pr
  cfxtest:aca63a4vd2e1ss605f19xvp876zds7h88jwued0yat
  cfxtest:acd8b133upwtdsy0fewecrg38rcde6hkgy5psxw18r
*/

let contractAddress = "CFXTEST:TYPE.CONTRACT:ACE6MMAV9YS8Z5G5XARW32H3GE9KNK1ASPNJC9C09D";
const poolAddress = "NET8888:TYPE.CONTRACT:ACCHHA25SM4P7C0WXC778MMBTVNE99X53PXFWE26UN";
const poolManagerAddress = "NET8888:TYPE.CONTRACT:ACC7GGWT2M5D8VY6F9P9221TN8KB4CRH2UVW0FA9HT";

const contract = conflux.Contract({
  abi: contractInfo.abi,
  bytecode: contractInfo.bytecode,
  address: contractAddress,
});

const poolContract = conflux.Contract({
  abi: poolContractInfo.abi,
  address: poolAddress,
});

async function main() {
  const status = await conflux.cfx.getStatus();
  console.log(`Current block: `, status.blockNumber);

  
  // let apy = await poolContract.poolAPY();
  let apy = await poolContract._poolAPY(status.blockNumber - 10000);
  console.log(apy);

  // await fakeReward(contractAddress);

  // await deployContract();
  // await initContract();
  
  // await register();
  // await increase(2, account);
  // await decrease(8, account);
  // await withdraw(8, account);
  // await poolInfo();
  // await claimAllInterest(account);
  // await userStakeInfo(account);
  // await userInterest(account);
  // await getUserInqueue(account.address);
  // await userStakeInfo(account2);
  // await getUserInqueue(account2.address);
  // await getUserOutqueue(account2.address);
  // await setLockPeriod(2 * 60 * 10);
  // await getRewardSection();
  // await getUserSection(account.address);

}

main().catch(console.log);

async function initContract() {
  await setLockPeriod(2 * 60 * 10);
  await register();
}

async function fakeReward(address) {
  const stakedBalance = await conflux.cfx.getStakingBalance(address);
  if (stakedBalance === 0) return false;
  const value = _calFakeReward(stakedBalance);
  const receipt = await conflux.cfx
    .sendTransaction({
      from: account.address,
      to: address,
      gas: 30000,
      value,
    })
    .executed();
  console.log("Success fake reward", receipt.transactionHash);
}

function _calFakeReward(staked) {
  return (staked * FAKE_RATIO * FAKE_PERIOD) / (ONE_YEAR_BLOCK / BigInt(100));
}

async function deployContract() {
  const receipt = await contract
    .constructor()
    .sendTransaction({
      from: account.address,
    })
    .executed();
  
  if (!receipt.contractCreated) throw new Error('Deploy failed');

  console.log(
    `Deployed contract address: ${receipt.contractCreated}, hash: ${receipt.transactionHash}`
  );

  contractAddress = receipt.contractAddress;
  contract.address = receipt.contractAddress;
}

async function register() {
  // need a way to get register data: indentifier, blsPubKey, vrfPubKey, blsPubKeyProof
  /* const receipt = await contract.register().sendTransaction({
    from: account.address,
    value: Drip.fromCFX(100),
  }); */
  const data =
    "0xe335b45123ffe1c93323e776626b051de04aa4f59cf77defb4fe8d765a7c9535a04443e4000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000030b0bffd10427fe5997128e22387da2af3aef9039d02e2e77febbb215862df3246035547c54f9957146d448f9d86f6ff660000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000210303a3f089b2db8b16205760ce078a29b448a96ae7403937cd0dc3e1b2e5d47bee00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000030a3d6dd2086e7e27a6c6a5d05960ad6b814528ee42ce7bf9ee1dd96e307f36eeec78399d8b03049d8b7b5b389503e517e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002074468cf4aca40d0e010bb088c82ed85b7f0c034a498ed40dc5b6e5d8d769173f";
  const receipt = await conflux.cfx
    .sendTransaction({
      from: account.address,
      to: contractAddress,
      value: Drip.fromCFX(100),
      data,
    })
    .executed();
  console.log(`Register executed ${receipt.transactionHash}`);
}

async function increase(votes, _account) {
  const receipt = await contract
    .increaseStake(votes)
    .sendTransaction({
      from: _account.address,
      value: Drip.fromCFX(100 * votes),
    })
    .executed();
  console.log(`Increase stake executed ${receipt.transactionHash}`);
}

async function decrease(votes, _account) {
  const receipt = await contract
    .decreaseStake(votes)
    .sendTransaction({
      from: _account.address,
    })
    .executed();
  console.log(`Increase stake executed ${receipt.transactionHash}`);
}

async function withdraw(votes, _account) {
  const receipt = await contract
    .withdrawStake(votes)
    .sendTransaction({
      from: _account.address,
    })
    .executed();
  console.log(`Increase stake executed ${receipt.transactionHash}`);
}

async function claim(amount, _account) {
  const receipt = await contract
    .claimInterest(amount)
    .sendTransaction({
      from: _account.address,
    })
    .executed();
  console.log(`Increase stake executed ${receipt.transactionHash}`);
}

async function poolInfo() {
  const info = await contract.poolSummary();
  console.log(info);
}

async function userStakeInfo(_account) {
  const info = await contract.userSummary(_account.address);
  console.log(info);
}

async function userInterest(_account) {
  const info = await contract.userInterest(_account.address);
  console.log(info);
}

async function setLockPeriod(blockNumber) {
  const receipt = await contract.setLockPeriod(blockNumber).sendTransaction({
    from: account.address,
  }).executed();
  console.log('Set period hash', receipt.transactionHash);
}

async function getRewardSection() {
  const sections = await contract._rewardSections();
  console.log(sections);
}

async function getUserSection(address) {
  const sections = await contract._votePowerSections(address);
  console.log(sections);
}

async function getUserInqueue(address) {
  const sections = await contract._userInOutQueue(address, true);
  console.log(sections);
}

async function getUserOutqueue(address) {
  const sections = await contract._userInOutQueue(address, false);
  console.log(sections);
}

async function claimAllInterest(account) {
  const receipt = await contract.claimAllInterest().sendTransaction({
    from: account
  }).executed();
  console.log('Claim interest result: ', receipt.outcomeStatus);
}

/**
 * 1. 如何验证存的状态是否正确: rewardSections, votePowerSections
 * 2. 如何验证利息计算是否正确: 
 */