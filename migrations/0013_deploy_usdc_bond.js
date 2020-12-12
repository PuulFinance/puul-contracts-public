const USDC_BONDPool = artifacts.require("USDC_BONDPool");
const USDC_BONDFarm = artifacts.require("USDC_BONDFarm");
const UniswapPoolHelper = artifacts.require("UniswapPoolHelper");
const UniswapHelper = artifacts.require("UniswapHelper");
const PuulFees = artifacts.require("PuulFees");
const Timelock12Hours = artifacts.require("Timelock12Hours");
const Limits = artifacts.require("Limits");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {
    // Deployed contracts
    const uhelper = await UniswapHelper.deployed();
    const helper = await UniswapPoolHelper.deployed();
    const puulFees = await PuulFees.deployed();
    const tl12hours = await Timelock12Hours.deployed();
    const limits = await Limits.deployed();

    const deployPool = USDC_BONDPool;
    const deployFarm = USDC_BONDFarm;
    let token = '0x0391D2021f89DC339F60Fff84546EA23E337750f';

    await deployer.link(UniswapPoolHelper, deployPool);
    const pool = await deployer.deploy(deployPool, puulFees.address);
    console.log(`USDC_BONDPool: '${pool.address}',`);
    await pool.initialize();
    await pool.setHelper(uhelper.address);
    await pool.setLimits(limits.address);

    const farm = await deployer.deploy(deployFarm, pool.address, [token], puulFees.address);
    console.log(`USDC_BONDFarm: '${farm.address}',`);
    await pool.setFarm(farm.address);
    await pool.setupRoles(tl12hours.address, tl12hours.address, tl12hours.address, addrs.harvester, tl12hours.address);
    await farm.setupRoles(tl12hours.address, tl12hours.address, tl12hours.address);

  });
};
