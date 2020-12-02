const MPH_WETHPool = artifacts.require("MPH_WETHPool");
const MPH_WETHFarm = artifacts.require("MPH_WETHFarm");
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

    const deployPool = MPH_WETHPool;
    const deployFarm = MPH_WETHFarm;
    let token = '0x8888801aF4d980682e47f1A9036e589479e835C5';

    await deployer.link(UniswapPoolHelper, deployPool);
    const pool = await deployer.deploy(deployPool, puulFees.address);
    console.log(`MPH_WETHPool: '${pool.address}',`);
    await pool.initialize();
    await pool.setHelper(uhelper.address);
    await pool.setLimits(limits.address);

    const farm = await deployer.deploy(deployFarm, pool.address, [token], puulFees.address);
    console.log(`MPH_WETHFarm: '${farm.address}',`);
    await pool.setFarm(farm.address);
    await pool.setupRoles(tl12hours.address, tl12hours.address, tl12hours.address, addrs.harvester, tl12hours.address);
    await farm.setupRoles(tl12hours.address, tl12hours.address, tl12hours.address);

  });
};
