const USDC_PUULPool = artifacts.require("USDC_PUULPool");
const USDC_PUULFarm = artifacts.require("USDC_PUULFarm");
const UniswapPoolHelper = artifacts.require("UniswapPoolHelper");
const UniswapHelper = artifacts.require("UniswapHelper");
const PuulRewardFees = artifacts.require("PuulRewardFees");
const PuulToken = artifacts.require("PuulToken");
const Timelock12Hours = artifacts.require("Timelock12Hours");
const Limits = artifacts.require("Limits");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {
    // Deployed contracts
    const uhelper = await UniswapHelper.deployed();
    const helper = await UniswapPoolHelper.deployed();
    const tl12hours = await Timelock12Hours.deployed();
    const limits = await Limits.deployed();
    const puulToken = await PuulToken.at('0x897581168bB658954a811a03de8394EBd42852Ef');
    const rewardFees = await PuulRewardFees.deployed();

    const deployPool = USDC_PUULPool;
    const deployFarm = USDC_PUULFarm;

    await deployer.link(UniswapPoolHelper, deployPool);
    const pool = await deployer.deploy(deployPool, rewardFees.address);
    console.log(`USDC_PUULPool: '${pool.address}',`);
    await pool.initialize();
    await pool.setHelper(uhelper.address);
    await pool.setLimits(limits.address);

    const farm = await deployer.deploy(deployFarm, pool.address, [puulToken.address]);
    console.log(`USDC_PUULFarm: '${farm.address}',`);
    await pool.setFarm(farm.address);
    await pool.setupRoles(tl12hours.address, tl12hours.address, tl12hours.address, addrs.harvester, tl12hours.address);
    await farm.setupRoles(tl12hours.address, tl12hours.address, tl12hours.address, addrs.harvester);

  });
};

// const PUUL_USDCPool = artifacts.require("USDC_PUULPool");
// const PUUL_USDCFarm = artifacts.require("USDC_PUULFarm");
// const UniswapPoolHelper = artifacts.require("UniswapPoolHelper");
// const UniswapHelper = artifacts.require("UniswapHelper");
// const PuulFees = artifacts.require("PuulFees");
// const PuulRewardFees = artifacts.require("PuulRewardFees");
// const PuulToken = artifacts.require("PuulToken");
// const Timelock12Hours = artifacts.require("Timelock12Hours");
// const Limits = artifacts.require("Limits");
// const IUniswapV2Router02 = artifacts.require("IUniswapV2Router02");
// const IUniswapV2Factory = artifacts.require("IUniswapV2Factory");
// const IUniswapV2Pair = artifacts.require("IUniswapV2Pair");
// const IERC20 = artifacts.require("IERC20");
// const IWETH = artifacts.require("IWETH");
// const PuulRewardFeesEndpoint = artifacts.require("PuulRewardFeesEndpoint");
// const PuulWithdrawalFeesEndpoint = artifacts.require("PuulWithdrawalFeesEndpoint");

// const BN = require('bn.js');

// module.exports = async function (deployer, network, accounts) {
//   const addrs = require('./utils/accounts.js')(accounts, network);

//   deployer.then(async () => {
//     // Deployed contracts
//     const uhelper = await UniswapHelper.deployed();
//     const helper = await UniswapPoolHelper.deployed();
//     const puulFees = await PuulFees.deployed();
//     const tl12hours = await Timelock12Hours.deployed();
//     const limits = await Limits.deployed();
//     const puulToken = await PuulToken.deployed()
//     // const puulToken = await PuulToken.at('0x897581168bB658954a811a03de8394EBd42852Ef');
//     const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
//     const puulWithdrawalFeesEndpoint = await PuulWithdrawalFeesEndpoint.deployed();
//     const puulRewardFeesEndpoint = await PuulRewardFeesEndpoint.deployed();

//     if (addrs.isDev) {
//       const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
//       const IERC20WETH = await IERC20.at(WETH);
//       const amount = web3.utils.toWei('5');
//       const IWETHSWAP = await IWETH.at(WETH)
//       await IWETHSWAP.deposit({from: addrs.deployer, value: amount});
//       const amt = web3.utils.toWei('1');
//       const router = await IUniswapV2Router02.at('0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F');
//       await IERC20WETH.approve(router.address, amt);
//       await router.swapExactTokensForTokens(amt, 0, [WETH, USDC], addrs.deployer, Date.now() + 1800);
//     }
//     const IUSDC = await IERC20.at(USDC)
//     const UNI_FACTORY = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
//     const factory = await IUniswapV2Factory.at(UNI_FACTORY)
//     console.log('createPair migrate', puulToken.address)
//     console.log('createPair migrate', USDC)
//     const tx = await factory.createPair(puulToken.address, USDC);
//     await tx;
//     const PAIR = await factory.getPair(puulToken.address, USDC);
//     const pair = await IUniswapV2Pair.at(PAIR);

//     await IUSDC.transfer(pair.address, web3.utils.toWei('2', 'picoether')) // $2 - deployer needs 2 usdc on prod
//     await puulToken.transfer(pair.address, web3.utils.toWei('100', 'milli')) // .1 = 20$ for initial PUUL Token - deployer needs .1 PUUL on prod
//     await pair.mint(addrs.dev)

//     const deployPool = PUUL_USDCPool;
//     const deployFarm = PUUL_USDCFarm;

//     // We want these fees to get converted to PUUL
//     const rewardFees = await deployer.deploy(PuulRewardFees, uhelper.address, puulWithdrawalFeesEndpoint.address, 150, puulRewardFeesEndpoint.address, 1000);
//     console.log(`PuulRewardFees: '${rewardFees.address}',`);
//     await rewardFees.setupRoles(tl12hours.address)

//     await deployer.link(UniswapPoolHelper, deployPool);
//     const pool = await deployer.deploy(deployPool, PAIR, rewardFees.address);
//     console.log(`PUUL_USDCPool: '${pool.address}',`);
//     await pool.initialize();
//     await pool.setHelper(uhelper.address);
//     await pool.setLimits(limits.address);

//     const farm = await deployer.deploy(deployFarm, pool.address, [puulToken.address]);
//     console.log(`PUUL_USDCFarm: '${farm.address}',`);
//     await pool.setFarm(farm.address);
//     await pool.setupRoles(tl12hours.address, tl12hours.address, tl12hours.address, addrs.harvester, tl12hours.address);
//     await farm.setupRoles(tl12hours.address, tl12hours.address, tl12hours.address, addrs.harvester);

//   });
// };
