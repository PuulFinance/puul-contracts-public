const CurveHelper = artifacts.require("CurveHelper");
const CurveHelperLibV2 = artifacts.require("CurveHelperLibV2");
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
    // const puulToken = await PuulToken.at('0x897581168bB658954a811a03de8394EBd42852Ef');
    const puulToken = await PuulToken.deployed();

    const poolhelper = await deployer.deploy(CurveHelperLibV2);
    console.log(`CurveHelperLibV2: '${poolhelper.address}',`);

    const deployPool = Curve3Pool;
    const deployFarm = Curve3PoolFarm;
    await deployer.link(UniswapPoolHelper, deployPool);
    await deployer.link(CurveHelperLibV2, deployPool);   
    // const pool = await Curve3Pool.at('0x83794cB962E7bd4B14230D98bC1e4F5fa34E077D');
    const pool = await deployer.deploy(deployPool, puulFees.address);
    console.log(`Curve3Pool: '${pool.address}',`);
    await pool.initialize();
    await pool.setUni(uhelper.address);
    await pool.setCurve(chelper.address);
    await pool.setLimits(limits.address);

    // const farm = await Curve3PoolFarm.at('0xDFF39C95359178eC686fFe9d8Df0B0eaD118488C');
    const farm = await deployer.deploy(deployFarm, pool.address, [puulToken.address]);
    console.log(`Curve3PoolFarm: '${farm.address}',`);
    await pool.setFarm(farm.address);
    await pool.setupRoles(tl12hours.address, tl12hours.address, tl12hours.address, addrs.harvester, tl12hours.address);
    await farm.setupRoles(tl12hours.address /*defaultAdmin*/, tl12hours.address /*admin*/, tl12hours.address /*extract*/, addrs.harvester);

  });
};
