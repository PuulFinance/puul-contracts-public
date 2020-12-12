const CurveHelper = artifacts.require("CurveHelper");
const CurveHelperLib = artifacts.require("CurveHelperLib");
const Curve3Pool = artifacts.require("Curve3Pool");
const Curve3PoolFarm = artifacts.require("Curve3PoolFarm");
const UniswapPoolHelper = artifacts.require("UniswapPoolHelper");
const UniswapHelper = artifacts.require("UniswapHelper");
const PuulFees = artifacts.require("PuulFees");
const PuulToken = artifacts.require("PuulToken");
const Timelock12Hours = artifacts.require("Timelock12Hours");
const Limits = artifacts.require("Limits");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {
    // Deployed contracts
    const uhelper = await UniswapHelper.deployed();
    const chelper = await CurveHelper.deployed();
    const puulFees = await PuulFees.deployed();
    const tl12hours = await Timelock12Hours.deployed();
    const limits = await Limits.deployed();
    const puulToken = await PuulToken.deployed();

    const deployPool = Curve3Pool;
    const deployFarm = Curve3PoolFarm;
    await deployer.link(UniswapPoolHelper, deployPool);
    await deployer.link(CurveHelperLib, deployPool);    
    const pool = await deployer.deploy(deployPool, puulFees.address);
    console.log(`Curve3Pool: '${pool.address}',`);
    await pool.initialize();
    await pool.setUni(uhelper.address);
    await pool.setCurve(chelper.address);
    await pool.setLimits(limits.address);

    const farm = await deployer.deploy(deployFarm, pool.address, [puulToken.address]);
    console.log(`Curve3PoolFarm: '${farm.address}',`);
    await pool.setFarm(farm.address);
    await pool.setupRoles(tl12hours.address, tl12hours.address, tl12hours.address, addrs.harvester, tl12hours.address);
    await farm.setupRoles(tl12hours.address /*defaultAdmin*/, tl12hours.address /*admin*/, tl12hours.address /*extract*/, addrs.harvester);

  });
};
