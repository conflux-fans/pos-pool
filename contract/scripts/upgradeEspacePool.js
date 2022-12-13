require('dotenv').config();
const hre = require("hardhat");
const { ethers } = hre;

/*
    * This script upgrades the ESpacePoSPool implementation.
    1. First update the proxyAddr variable with the address of the ESpacePoSPool proxy.
    2. Run the script with `npx hardhat run scripts/upgradeEspacePool.js --network espace`
*/ 

async function main() {
    const ESpacePoSPool = await ethers.getContractFactory("ESpacePoSPool");
    const pool = await ESpacePoSPool.deploy();
    await pool.deployed();

    console.log('Impl deployed to:', pool.address);

    const proxyAddr = 'REPLACE-WITH-YOUR-ESPACE-POOL-PROXY-ADDRESS';

    const proxy = await ethers.getContractAt("Proxy1967", proxyAddr);
    await proxy.upgradeTo(pool.address);

    const ePool = await ethers.getContractAt("ESpacePoSPool", proxyAddr);

    let tx = await ePool.setLockPeriod(2250000);
    await tx.wait();

    tx = await ePool.setUnlockPeriod(176400);
    await tx.wait();

    console.log('Finished');
}

main().catch(console.log);