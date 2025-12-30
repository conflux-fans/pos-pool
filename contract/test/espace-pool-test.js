/* eslint-disable prefer-const */
/* eslint-disable prettier/prettier */
const { expect } = require("chai");
const { ethers } = require("hardhat");
const parseEther = ethers.utils.parseEther;
const getBalance = ethers.provider.getBalance;
const ONE_VOTE_CFX = 1;
const LOCK_PERIOD = 60 * 5;
// const IDENTIFIER = "0x0000000000000000000000000000000000000000000000000000000000000000";

async function mineBlocks(n = 1) {
  for (let i = 0; i < n; i++) {
    await ethers.provider.send("evm_mine");
  }
}

describe("EspaceStaking", async function () {

  let accounts;
  let user1; // defaulet user
  let user2;
  let user3;
  let bridge;
  const DEFAULT_BALANCE = parseEther('10000');

  let pool;

  beforeEach(async function () {
    accounts = await ethers.getSigners();

    user1 = accounts[0]; // defaulet user
    user2 = accounts[1];
    user3 = accounts[2];
    bridge = accounts[19]; // the last account in the list

    const ESpacePoSPool = await ethers.getContractFactory("ESpacePoSPool");
    pool = await ESpacePoSPool.deploy();
    await pool.deployed();

    const setPeriodTx = await pool.setLockPeriod(LOCK_PERIOD);
    await setPeriodTx.wait();
    const setUnlockPeriodTx = await pool.setUnlockPeriod(LOCK_PERIOD);
    await setUnlockPeriodTx.wait();
    const setCfxCountTx = await pool.setCfxCountOfOneVote(ONE_VOTE_CFX);
    await setCfxCountTx.wait();
    const setBridgeTx = await pool.setBridge(bridge.address);
    await setBridgeTx.wait();
  });


  it("eSpace pool stage change tests", async function () {
    // ==================================== User A increase stake
    // total 10
    const increaseTx = await pool.increaseStake(10, {
      value: parseEther(`${ONE_VOTE_CFX * 10}`),
    });
    await increaseTx.wait();

    let user1Summary = await pool.userSummary(user1.address);
    expect(user1Summary.votes).to.equal(10);
    expect(user1Summary.available).to.equal(10);
    expect(user1Summary.locked).to.equal(0);
    expect(user1Summary.unlocked).to.equal(0);
    expect(user1Summary.claimedInterest).to.equal(0);
    expect(user1Summary.currentInterest).to.equal(0);

    let poolSummary = await pool.poolSummary();
    expect(poolSummary.available).to.equal(10);
    expect(poolSummary.interest).to.equal(0);
    expect(poolSummary.totalInterest).to.equal(0);

    const beforeBalance = await getBalance(bridge.address);
    expect(beforeBalance).to.equal(parseEther('10010.0'));

    let crossingVotes = await pool.crossingVotes();
    expect(crossingVotes).to.equal(10);

    await mineBlocks(LOCK_PERIOD + 1);

    user1Summary = await pool.userSummary(user1.address);
    expect(user1Summary.locked).to.equal(10);

    // add interest
    let tx = await pool.connect(bridge).receiveInterest({
      value: parseEther(`${10}`),
    });
    await tx.wait();

    poolSummary = await pool.poolSummary();
    expect(poolSummary.totalInterest).to.equal(parseEther('10'));

    let userInterest = await pool.userInterest(user1.address);
    expect(userInterest).to.equal(parseEther('10'));

    // ==================================== Test B increase stake
    let increaseTx2 = await pool.connect(user2).increaseStake(3, {
      value: parseEther(`${ONE_VOTE_CFX * 3}`),
    });
    await increaseTx2.wait();

    poolSummary = await pool.poolSummary();
    expect(poolSummary.available).to.equal(13);

    let user2Summary = await pool.userSummary(user2.address);
    expect(user2Summary.votes).to.equal(3);
    expect(user2Summary.available).to.equal(3);

    tx = await pool.connect(bridge).receiveInterest({
      value: parseEther(`${10}`),
    });
    await tx.wait();

    poolSummary = await pool.poolSummary();
    expect(poolSummary.totalInterest).to.equal(parseEther('20'));

    let poolBalance = await getBalance(pool.address);
    expect(poolBalance).to.equal(parseEther('20'));

    userInterest = await pool.userInterest(user1.address);
    tx = await pool.claimAllInterest();
    await tx.wait();

    poolBalance = await getBalance(pool.address);
    expect(poolBalance).to.equal(parseEther('20').sub(userInterest));

    user1Summary = await pool.userSummary(user1.address);
    expect(user1Summary.claimedInterest).to.equal(userInterest);
    expect(user1Summary.currentInterest).to.equal(0);


    // ==================================== Test C increase stake
    increaseTx2 = await pool.connect(user3).increaseStake(11, {
      value: parseEther(`${ONE_VOTE_CFX * 11}`),
    });
    await increaseTx2.wait();

    poolSummary = await pool.poolSummary();
    expect(poolSummary.available).to.equal(24);

    user2Summary = await pool.userSummary(user3.address);
    expect(user2Summary.votes).to.equal(11);
    expect(user2Summary.available).to.equal(11);

    // wait specific block number
    // await mineBlocks(LOCK_PERIOD);

    // ==================================== Test decrease stake
    let decreaseTx = await pool.decreaseStake(4);
    await decreaseTx.wait();
    user1Summary = await pool.userSummary(user1.address);
    expect(user1Summary.votes).to.equal(10);
    expect(user1Summary.available).to.equal(6);

    await mineBlocks(LOCK_PERIOD);

    user1Summary = await pool.userSummary(user1.address);
    expect(user1Summary.unlocked).to.equal(4);

    decreaseTx = await pool.connect(user3).decreaseStake(4);
    await decreaseTx.wait();
    user2Summary = await pool.userSummary(user3.address);
    expect(user2Summary.votes).to.equal(11);
    expect(user2Summary.available).to.equal(7);

    // ==================================== handleCrossingVotes
    crossingVotes = await pool.crossingVotes();
    expect(crossingVotes).to.equal(24);

    tx = await pool.connect(bridge).handleCrossingVotes(12);
    await tx.wait();
    crossingVotes = await pool.crossingVotes();
    expect(crossingVotes).to.equal(12);

    crossingVotes = await pool.crossingVotes();
    expect(crossingVotes).to.equal(12);

    // ==================================== Test handleUnlockedIncrease 
    let unstakeLen = await pool.unstakeLen();
    expect(unstakeLen).to.equal(2);

    tx = await pool.connect(bridge).handleUnstakeTask();
    await tx.wait();

    unstakeLen = await pool.unstakeLen();
    expect(unstakeLen).to.equal(1);

    // ==================================== Test handleUnlockedIncrease

    poolBalance = await getBalance(pool.address);

    tx = await pool.connect(bridge).handleUnlockedIncrease(5, {
      value: parseEther(`${ONE_VOTE_CFX * 5}`),
    });
    await tx.wait();

    let newBalance = await getBalance(pool.address);
    expect(newBalance).to.equal(poolBalance.add(parseEther('5')));

    // ==================================== Test withdrawStake
    tx = await pool.withdrawStake(4);
    await tx.wait();

    poolBalance = await getBalance(pool.address);
    expect(poolBalance).to.equal(newBalance.sub(parseEther('4')));

    user1Summary = await pool.userSummary(user1.address);
    expect(user1Summary.unlocked).to.equal(0);
    expect(user1Summary.votes).to.equal(6);
    expect(user1Summary.available).to.equal(6);
    expect(user1Summary.locked).to.equal(6);
  });

  it('eSpace pool userInterest', async function() {
    // user1 stake
    const increaseTx = await pool.increaseStake(10, {
      value: parseEther(`${ONE_VOTE_CFX * 10}`),
    });
    await increaseTx.wait();

    // user2 stake
    let increaseTx2 = await pool.connect(user2).increaseStake(10, {
      value: parseEther(`${ONE_VOTE_CFX * 10}`),
    });
    await increaseTx2.wait();

    let poolSummary = await pool.poolSummary();
    expect(poolSummary.available).to.equal(20);
    expect(poolSummary.interest).to.equal(0);
    expect(poolSummary.totalInterest).to.equal(0);

    // add interest
    let tx = await pool.connect(bridge).receiveInterest({
      value: parseEther(`${10}`),
    });
    await tx.wait();

    poolSummary = await pool.poolSummary();
    expect(poolSummary.totalInterest).to.equal(parseEther('10'));

    let user1Interest = await pool.userInterest(user1.address);
    let user2Interest = await pool.userInterest(user2.address);
    expect(user1Interest).to.equal(user2Interest);
    expect(user1Interest).to.equal(parseEther('5'));

    // user 1 decreaseStake
    await mineBlocks(LOCK_PERIOD);
    let decreaseTx = await pool.decreaseStake(4);
    await decreaseTx.wait();
    user1Summary = await pool.userSummary(user1.address);
    expect(user1Summary.votes).to.equal(10);
    expect(user1Summary.available).to.equal(6);

    await mineBlocks(LOCK_PERIOD);

    user1Summary = await pool.userSummary(user1.address);
    expect(user1Summary.unlocked).to.equal(4);

    tx = await pool.connect(bridge).handleUnlockedIncrease(4, {
      value: parseEther(`${ONE_VOTE_CFX * 4}`),
    });
    await tx.wait();

    user1Interest = await pool.userInterest(user1.address);
    expect(user1Interest).to.equal(parseEther('5'));

    // add more interest
    tx = await pool.connect(bridge).receiveInterest({
      value: parseEther(`${16}`),
    });
    await tx.wait();

    user1Interest = await pool.userInterest(user1.address);
    expect(user1Interest).to.equal(parseEther('11'));

    tx = await pool.withdrawStake(4);
    await tx.wait();


    user2Interest = await pool.userInterest(user2.address);
    expect(user2Interest).to.equal(parseEther('15'));

    user1Interest = await pool.userInterest(user1.address);
    expect(user1Interest).to.equal(parseEther('11'));
    
    tx = await pool.claimAllInterest();
    await tx.wait();

    user1Interest = await pool.userInterest(user1.address);
    expect(user1Interest).to.equal(0);
    user2Interest = await pool.userInterest(user2.address);
    expect(user2Interest).to.equal(parseEther('15'));

  });
});
