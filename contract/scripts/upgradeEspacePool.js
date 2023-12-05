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

    console.log('New Impl deployed to:', pool.address);

    const proxy = await ethers.getContractAt("Proxy1967", process.env.ESPACE_POOL_ADDRESS);
    await proxy.upgradeTo(pool.address);

    console.log('Finished');
}

main().catch(console.log);