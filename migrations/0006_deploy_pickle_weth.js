const PICKLE_WETHPool = artifacts.require("PICKLE_WETHPool");
const PICKLE_WETHStakingFarm = artifacts.require("PICKLE_WETHStakingFarm");
const UniswapPoolHelper = artifacts.require("UniswapPoolHelper");
const UniswapHelper = artifacts.require("UniswapHelper");
const PuulFees = artifacts.require("PuulFees");
const Timelock12Hours = artifacts.require("Timelock12Hours");
const PuulRewardFeesEndpoint = artifacts.require("PuulRewardFeesEndpoint");
const PuulWithdrawalFeesEndpoint = artifacts.require("PuulWithdrawalFeesEndpoint");
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

    const deployPool = PICKLE_WETHPool;
    const deployFarm = PICKLE_WETHStakingFarm;
    let pickle = '0x429881672B9AE42b8EbA0E26cD9C73711b891Ca5';

    await deployer.link(UniswapPoolHelper, deployPool);
    const pickle_wethPool = await deployer.deploy(deployPool, puulFees.address);
    console.log(`PICKLE_WETHPool: '${pickle_wethPool.address}',`);
    await pickle_wethPool.initialize();
    await pickle_wethPool.setHelper(uhelper.address);
    await pickle_wethPool.setLimits(limits.address);
    const maxDeposit = 20; // About 4000 USDC
    const maxTotal = maxDeposit * 50; // About 200K USDC
    await limits.setMaxDeposit(pickle_wethPool.address, web3.utils.toWei(maxDeposit.toString()))
    await limits.setMaxTotal(pickle_wethPool.address, web3.utils.toWei(maxTotal.toString()))
    await limits.setupRoles(tl12hours.address /*defaultAdmin*/, tl12hours.address /*admin*/, addrs.harvester /* harvester */);

    const puulRewardFeesEndpoint = await PuulRewardFeesEndpoint.deployed();
    const puulWithdrawalFeesEndpoint = await PuulWithdrawalFeesEndpoint.deployed();
    puulRewardFeesEndpoint.addPool(pickle_wethPool.address);
    puulWithdrawalFeesEndpoint.addPool(pickle_wethPool.address);
  
    const pickle_wethStakingFarm = await deployer.deploy(PICKLE_WETHStakingFarm, pickle_wethPool.address, [pickle], puulFees.address);
    console.log(`PICKLE_WETHStakingFarm: '${pickle_wethStakingFarm.address}',`);
    await pickle_wethPool.setFarm(pickle_wethStakingFarm.address);
    await pickle_wethPool.setupRoles(tl12hours.address, tl12hours.address, tl12hours.address, addrs.harvester, tl12hours.address);
    await pickle_wethStakingFarm.setupRoles(tl12hours.address, tl12hours.address, tl12hours.address);

  });
};
