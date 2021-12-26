const { expect } = require("chai");
const { ethers } = require("hardhat");
const ONE_VOTE_CFX = 100;
const LOCK_PERIOD = 2 * 60 * 5;
const IDENTIFIER =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

async function mineBlocks(n = 1) {
  for (let i = 0; i < n; i++) {
    await ethers.provider.send("evm_mine");
  }
}

describe("Staking", async function () {
  it("PoS pool state change tests", async function () {
    const MockStaking = await ethers.getContractFactory("MockStaking");
    const staking = await MockStaking.deploy();
    await staking.deployed();

    const MockPoSRegister = await ethers.getContractFactory("MockPoSRegister");
    const posRegister = await MockPoSRegister.deploy();
    await posRegister.deployed();

    const PoSPool = await ethers.getContractFactory("PoSPoolDebug");
    const pool = await PoSPool.deploy(staking.address, posRegister.address);
    await pool.deployed();

    const accounts = await ethers.getSigners();
    const setPeriodTx = await pool.setLockPeriod(LOCK_PERIOD);
    await setPeriodTx.wait();
    const setCfxCountTx = await pool.setCfxCountOfOneVote(100);
    await setCfxCountTx.wait();

    /* const account0Balance = await ethers.provider.getBalance(accounts[0].address);
    console.log(account0Balance.toString());
    console.log("Account 0 balance:", ethers.utils.formatEther(account0Balance.toString())); */

    // ================================= Test register
    // total 1
    const blsPubKeyProof = ["0x00", "0x00"];
    const blsPubKey = "0x00";
    const vrfPubKey = "0x00";
    const registTx = await pool.register(
      IDENTIFIER,
      1,
      blsPubKey,
      vrfPubKey,
      blsPubKeyProof,
      {
        value: ethers.utils.parseEther(`${ONE_VOTE_CFX}`),
      }
    );
    await registTx.wait();

    let poolSummary = await pool.poolSummary();
    expect(poolSummary.available).to.equal(1);
    expect(poolSummary.interest).to.equal(0);

    // ==================================== Test A increase stake
    // total 11
    const increaseTx = await pool.increaseStake(10, {
      value: ethers.utils.parseEther(`${ONE_VOTE_CFX * 10}`),
    });
    await increaseTx.wait();

    let user1Summary = await pool.userSummary(accounts[0].address);
    expect(user1Summary.votes).to.equal(11);
    expect(user1Summary.available).to.equal(11);

    let user1Shot = await pool._userShot(accounts[0].address);
    expect(user1Shot.available).to.equal(11);

    let poolShot = await pool._poolShot();
    expect(poolShot.available).to.equal(11);

    poolSummary = await pool.poolSummary();
    expect(poolSummary.available).to.equal(11);

    // ====================================== Test B increase stake
    // total 14
    const increaseTx2 = await pool.connect(accounts[1]).increaseStake(3, {
      value: ethers.utils.parseEther(`${ONE_VOTE_CFX * 3}`),
    });
    await increaseTx2.wait();

    poolSummary = await pool.poolSummary();
    expect(poolSummary.available).to.equal(14);

    poolShot = await pool._poolShot();
    expect(poolShot.available).to.equal(14);

    const user2Summary = await pool.userSummary(accounts[1].address);
    expect(user2Summary.votes).to.equal(3);
    expect(user2Summary.available).to.equal(3);

    const user2Shot = await pool._userShot(accounts[1].address);
    expect(user2Shot.available).to.equal(3);

    let poolStakeBalance = await staking.getStakingBalance(pool.address);
    expect(ethers.utils.formatEther(poolStakeBalance)).to.equal(
      14 * ONE_VOTE_CFX + ".0"
    );

    const sendUserInterestTx = await staking._sendUserInterest(
      pool.address,
      10,
      {
        value: ethers.utils.parseEther(`10`),
      }
    );
    await sendUserInterestTx.wait();

    // wait specific block number
    await mineBlocks(LOCK_PERIOD);

    // ====================================== Test A decrease stake
    // total 9
    const decreaseTx = await pool.decreaseStake(5);
    await decreaseTx.wait();

    poolSummary = await pool.poolSummary();
    expect(poolSummary.available).to.equal(9);

    const user1Interest = await pool.userInterest(accounts[0].address);

    user1Summary = await pool.userSummary(accounts[0].address);
    expect(user1Summary.available).to.equal(6);
    expect(user1Summary.votes).to.equal(11);

    user1Shot = await pool._userShot(accounts[0].address);
    expect(user1Shot.available).to.equal(6);

    // wait specific block number
    await mineBlocks(LOCK_PERIOD);

    user1Summary = await pool.userSummary(accounts[0].address);
    expect(user1Summary.unlocked).to.equal(5);

    await pool.withdrawStake(5);

    user1Summary = await pool.userSummary(accounts[0].address);
    expect(user1Summary.unlocked).to.equal(0);
    expect(user1Summary.votes).to.equal(6);

    poolStakeBalance = await staking.getStakingBalance(pool.address);
    expect(poolStakeBalance).to.equal(
      ethers.utils.parseEther(`${9 * ONE_VOTE_CFX}`)
    );

    const beforeBalance = await ethers.provider.getBalance(pool.address);

    // claim
    const claimInterestTx = await pool.claimAllInterest();
    await claimInterestTx.wait();

    const afterBalance = await ethers.provider.getBalance(pool.address);
    expect(afterBalance).to.equal(beforeBalance.sub(user1Interest));

    poolShot = await pool._poolShot();
    expect(poolShot.balance).to.equal(afterBalance);
  });

  it("PoS reward calculate - one user", async function () {
    // one people
  });

  it("PoS reward calculate - two user", async function () {
    // two people
  });

  it("PoS restake", async function () {});
});
