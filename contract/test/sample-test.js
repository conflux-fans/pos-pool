/* const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Greeter", function () {
  it("Should return the new greeting once it's changed", async function () {
    const Greeter = await ethers.getContractFactory("Greeter");
    const greeter = await Greeter.deploy("Hello, world!");
    await greeter.deployed();

    expect(await greeter.greet()).to.equal("Hello, world!");

    const setGreetingTx = await greeter.setGreeting("Hola, mundo!");

    // wait until the transaction is mined
    await setGreetingTx.wait();

    expect(await greeter.greet()).to.equal("Hola, mundo!");

    const blockNumBefore = await ethers.provider.getBlockNumber();
    await ethers.provider.send("evm_mine");
    await ethers.provider.send("evm_mine");
    const blockNumAfter = await ethers.provider.getBlockNumber();
    expect(blockNumAfter - blockNumBefore).to.equal(2);
  });
});
 */