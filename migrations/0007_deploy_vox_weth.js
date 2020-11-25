const VOX_WETHPool = artifacts.require("VOX_WETHPool");
const VOX_WETHFarm = artifacts.require("VOX_WETHFarm");
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

    const deployPool = VOX_WETHPool;
    const deployFarm = VOX_WETHFarm;
    let token = '0x12D102F06da35cC0111EB58017fd2Cd28537d0e1';

    await deployer.link(UniswapPoolHelper, deployPool);
    const pool = await deployer.deploy(deployPool, puulFees.address);
    console.log(`VOX_WETHPool: '${pool.address}',`);
    await pool.initialize();
    await pool.setHelper(uhelper.address);
    await pool.setLimits(limits.address);
    // const maxDeposit = web3.utils.toWei('2.775'); // About 5000 USDC
    // const maxTotal = web3.utils.toWei(`${(2.775 * 50).toFixed(6)}`); // About 250K USDC
    // await limits.setMaxDeposit(pool.address, maxDeposit)
    // await limits.setMaxTotal(pool.address, maxTotal)

    const puulRewardFeesEndpoint = await PuulRewardFeesEndpoint.deployed();
    const puulWithdrawalFeesEndpoint = await PuulWithdrawalFeesEndpoint.deployed();
    puulRewardFeesEndpoint.addPool(pool.address);
    puulWithdrawalFeesEndpoint.addPool(pool.address);
  
    const farm = await deployer.deploy(deployFarm, pool.address, [token], puulFees.address);
    console.log(`VOX_WETHFarm: '${farm.address}',`);
    await pool.setFarm(farm.address);
    await pool.setupRoles(tl12hours.address, tl12hours.address, tl12hours.address, addrs.harvester, tl12hours.address);
    await farm.setupRoles(tl12hours.address, tl12hours.address, tl12hours.address);

  });
};
