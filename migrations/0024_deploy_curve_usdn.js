const CurveHelper = artifacts.require("CurveHelper");
const CurveHelperLibV2 = artifacts.require("CurveHelperLibV2");
const CurveUsdn = artifacts.require("CurveUsdn");
const CurveUsdnFarm = artifacts.require("CurveUsdnFarm");
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
    // const puulToken = await PuulToken.at('0x897581168bB658954a811a03de8394EBd42852Ef');
    const puulToken = await PuulToken.deployed();

    const deployPool = CurveUsdn;
    const deployFarm = CurveUsdnFarm;
    await deployer.link(UniswapPoolHelper, deployPool);
    await deployer.link(CurveHelperLibV2, deployPool);    
    const pool = await deployer.deploy(deployPool, puulFees.address);
    console.log(`CurveUsdn: '${pool.address}',`);
    await pool.initialize();
    await pool.setUni(uhelper.address);
    await pool.setCurve(chelper.address);
    await pool.setLimits(limits.address);

    const farm = await deployer.deploy(deployFarm, pool.address, [puulToken.address]);
    console.log(`CurveUsdnFarm: '${farm.address}',`);
    await pool.setFarm(farm.address);
    await pool.setupRoles(tl12hours.address, tl12hours.address, tl12hours.address, addrs.harvester, tl12hours.address);
    await farm.setupRoles(tl12hours.address /*defaultAdmin*/, tl12hours.address /*admin*/, tl12hours.address /*extract*/, addrs.harvester);

  });
};
