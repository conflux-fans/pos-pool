const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PoSRegister", function () {
  it("Should return the correct votes number", async function () {
    const MockPoSRegister = await ethers.getContractFactory("MockPoSRegister");
    const contract = await MockPoSRegister.deploy();
    await contract.deployed();
    // const accounts = await ethers.getSigners();

    const identifier =
      "0x0000000000000000000000000000000000000000000000000000000000000000";

    let votes = await contract.getVotes(identifier);
    expect(votes.length).to.equal(2);
    expect(votes[0]).to.equal(0);
    expect(votes[1]).to.equal(0);

    const registTx = await contract.register(identifier, 1, "0x00", "0x00", [
      "0x00",
      "0x00",
    ]);
    await registTx.wait();

    const _address = await contract.identifierToAddress(identifier);
    expect(_address).to.equal("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");

    const increaseTx = await contract.increaseStake(10);
    await increaseTx.wait();

    votes = await contract.getVotes(identifier);
    expect(votes[0]).to.equal(10);

    const decreaseTx = await contract.retire(5);
    await decreaseTx.wait();

    votes = await contract.getVotes(identifier);
    expect(votes[0]).to.equal(10);
    expect(votes[1]).to.equal(5);
  });
});
