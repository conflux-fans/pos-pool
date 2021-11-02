const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Staking", function () {
  it("Should return the correct stakeBalance", async function () {
    const Staking = await ethers.getContractFactory("MockStaking");
    const staking = await Staking.deploy();
    await staking.deployed();

    const accounts = await ethers.getSigners();

    /* const balance = await ethers.provider.getBalance(accounts[0].address);
    console.log(balance); */

    expect(await staking.getStakingBalance(accounts[0].address)).to.equal(0);

    const stakingTx = await staking.deposit(100, {
      value: 100,
    });

    // wait until the transaction is mined
    await stakingTx.wait();

    expect(await staking.getStakingBalance(accounts[0].address)).to.equal(100);

    const withdrawTx = await staking.withdraw(50);
    await withdrawTx.wait();
    expect(await staking.getStakingBalance(accounts[0].address)).to.equal(50);
  });
});
