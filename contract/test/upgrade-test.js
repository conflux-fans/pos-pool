const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Upgrade", function () {
  it("Should upgrade", async function () {
    const StorageProxy = await ethers.getContractFactory("StorageProxy");
    const storageProxy = await StorageProxy.deploy();
    await storageProxy.deployed();

    const StorageLogic = await ethers.getContractFactory("StorageLogic");
    const storageLogic = await StorageLogic.deploy();
    await storageLogic.deployed();

    const [owner, addr1] = await ethers.getSigners();

    let tx = await storageProxy.setLogicAddress(storageLogic.address);
    await tx.wait();

    const newLogic = await storageLogic.attach(storageProxy.address);

    tx = await newLogic.setValue(1);
    await tx.wait();

    let value = await newLogic.getValue();
    expect(value).to.equal(1);

    /* tx = await newLogic.connect(addr1).setValue(2);
    await tx.wait(); // .should.be.rejectedWith("VM Exception while processing transaction: reverted with reason string 'Ownable: caller is not the owner'") */

    value = await newLogic.getValue();
    expect(value).to.equal(2);
  });
});
