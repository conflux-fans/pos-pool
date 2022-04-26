/* eslint-disable prefer-const */
/* eslint-disable prettier/prettier */
const { expect } = require("chai");
const { ethers } = require("hardhat");
const ONE_VOTE_CFX = 100;
const LOCK_PERIOD = 60 * 5;
// const IDENTIFIER = "0x0000000000000000000000000000000000000000000000000000000000000000";

async function mineBlocks(n = 1) {
  for (let i = 0; i < n; i++) {
    await ethers.provider.send("evm_mine");
  }
}

describe("EspaceStaking", async function () {
  it("eSpace pool stage change tests", async function () {
    const accounts = await ethers.getSigners();

    const ESpacePoSPool = await ethers.getContractFactory("ESpacePoSPool");
    const pool = await ESpacePoSPool.deploy();
    await pool.deployed();

    const setPeriodTx = await pool.setLockPeriod(LOCK_PERIOD);
    await setPeriodTx.wait();
    const setCfxCountTx = await pool.setCfxCountOfOneVote(ONE_VOTE_CFX);
    await setCfxCountTx.wait();
    const setBridgeTx = await pool.setBridge(accounts[10].address);
    await setBridgeTx.wait();

    const poolRegisted = await pool.poolRegisted();
    expect(poolRegisted).to.equal(true);

    // const beforeBalance = await ethers.provider.getBalance(accounts[0].address);
    // console.log(ethers.utils.formatEther(beforeBalance));

    // ==================================== Test A increase stake
    // total 10
    const increaseTx = await pool.increaseStake(10, {
      value: ethers.utils.parseEther(`${ONE_VOTE_CFX * 10}`),
    });
    await increaseTx.wait();

    let user1Summary = await pool.userSummary(accounts[0].address);
    expect(user1Summary.votes).to.equal(10);
    expect(user1Summary.available).to.equal(10);
    expect(user1Summary.locked).to.equal(0);
    expect(user1Summary.unlocked).to.equal(0);
    expect(user1Summary.claimedInterest).to.equal(0);
    expect(user1Summary.currentInterest).to.equal(0);

    let poolSummary = await pool.poolSummary();
    expect(poolSummary.available).to.equal(10);
    expect(poolSummary.totalStaked).to.equal(10);
    expect(poolSummary.totalWithdraw).to.equal(0);
    expect(poolSummary.interest).to.equal(0);
    expect(poolSummary.totalInterest).to.equal(0);

    const beforeBalance = await ethers.provider.getBalance(accounts[10].address);
    expect(beforeBalance).to.equal(ethers.utils.parseEther('11000.0'));

    let crossingVotes = await pool.crossingVotes();
    expect(crossingVotes).to.equal(10);

    await mineBlocks(LOCK_PERIOD + 1);

    user1Summary = await pool.userSummary(accounts[0].address);
    expect(user1Summary.locked).to.equal(10);

    let tx = await pool.connect(accounts[10]).receiveInterest({
      value: ethers.utils.parseEther(`${10}`),
    });
    await tx.wait();

    poolSummary = await pool.poolSummary();
    expect(poolSummary.totalInterest).to.equal(ethers.utils.parseEther('10'));

    let userInterest = await pool.userInterest(accounts[0].address);
    expect(userInterest).to.equal(ethers.utils.parseEther('10'));

    // ==================================== Test B increase stake
    let increaseTx2 = await pool.connect(accounts[1]).increaseStake(3, {
      value: ethers.utils.parseEther(`${ONE_VOTE_CFX * 3}`),
    });
    await increaseTx2.wait();

    poolSummary = await pool.poolSummary();
    expect(poolSummary.available).to.equal(13);

    let user2Summary = await pool.userSummary(accounts[1].address);
    expect(user2Summary.votes).to.equal(3);
    expect(user2Summary.available).to.equal(3);

    tx = await pool.connect(accounts[10]).receiveInterest({
      value: ethers.utils.parseEther(`${10}`),
    });
    await tx.wait();

    poolSummary = await pool.poolSummary();
    expect(poolSummary.totalInterest).to.equal(ethers.utils.parseEther('20'));

    let poolBalance = await ethers.provider.getBalance(pool.address);
    expect(poolBalance).to.equal(ethers.utils.parseEther('20'));

    userInterest = await pool.userInterest(accounts[0].address);
    tx = await pool.claimAllInterest();
    await tx.wait();

    poolBalance = await ethers.provider.getBalance(pool.address);
    expect(poolBalance).to.equal(ethers.utils.parseEther('20').sub(userInterest));

    user1Summary = await pool.userSummary(accounts[0].address);
    expect(user1Summary.claimedInterest).to.equal(userInterest);
    expect(user1Summary.currentInterest).to.equal(0);


    // ==================================== Test C increase stake
    increaseTx2 = await pool.connect(accounts[2]).increaseStake(11, {
      value: ethers.utils.parseEther(`${ONE_VOTE_CFX * 11}`),
    });
    await increaseTx2.wait();

    poolSummary = await pool.poolSummary();
    expect(poolSummary.available).to.equal(24);

    user2Summary = await pool.userSummary(accounts[2].address);
    expect(user2Summary.votes).to.equal(11);
    expect(user2Summary.available).to.equal(11);

    // wait specific block number
    // await mineBlocks(LOCK_PERIOD);

    // ==================================== Test decrease stake
    let decreaseTx = await pool.decreaseStake(4);
    await decreaseTx.wait();
    user1Summary = await pool.userSummary(accounts[0].address);
    expect(user1Summary.votes).to.equal(10);
    expect(user1Summary.available).to.equal(6);

    await mineBlocks(LOCK_PERIOD);

    user1Summary = await pool.userSummary(accounts[0].address);
    expect(user1Summary.unlocked).to.equal(4);

    decreaseTx = await pool.connect(accounts[2]).decreaseStake(4);
    await decreaseTx.wait();
    user2Summary = await pool.userSummary(accounts[2].address);
    expect(user2Summary.votes).to.equal(11);
    expect(user2Summary.available).to.equal(7);

    // ==================================== handleCrossingVotes
    crossingVotes = await pool.crossingVotes();
    expect(crossingVotes).to.equal(24);

    tx = await pool.connect(accounts[10]).handleCrossingVotes(12);
    await tx.wait();
    crossingVotes = await pool.crossingVotes();
    expect(crossingVotes).to.equal(12);

    crossingVotes = await pool.crossingVotes();
    expect(crossingVotes).to.equal(12);

    // ==================================== Test handleUnlockedIncrease 
    let unstakeLen = await pool.unstakeLen();
    expect(unstakeLen).to.equal(2);

    tx = await pool.connect(accounts[10]).handleWithdrawTask();
    await tx.wait();

    unstakeLen = await pool.unstakeLen();
    expect(unstakeLen).to.equal(1);

    // ==================================== Test handleUnlockedIncrease

    poolBalance = await ethers.provider.getBalance(pool.address);

    tx = await pool.connect(accounts[10]).handleUnlockedIncrease(5, {
      value: ethers.utils.parseEther(`${ONE_VOTE_CFX * 5}`),
    });
    await tx.wait();

    let newBalance = await ethers.provider.getBalance(pool.address);
    expect(newBalance).to.equal(poolBalance.add(ethers.utils.parseEther('500')));

    // ==================================== Test withdrawStake
    tx = await pool.withdrawStake(4);
    await tx.wait();

    poolBalance = await ethers.provider.getBalance(pool.address);
    expect(poolBalance).to.equal(newBalance.sub(ethers.utils.parseEther('400')));

    user1Summary = await pool.userSummary(accounts[0].address);
    expect(user1Summary.unlocked).to.equal(0);
    expect(user1Summary.votes).to.equal(6);
    expect(user1Summary.available).to.equal(6);
    expect(user1Summary.locked).to.equal(6);
  });
});
