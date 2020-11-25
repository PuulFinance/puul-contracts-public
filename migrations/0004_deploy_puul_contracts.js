const PuulToken = artifacts.require("PuulToken");
const PuulRewardsFeeToken = artifacts.require("PuulRewardsFeeToken");
const PuulWithdrawalFeeToken = artifacts.require("PuulWithdrawalFeeToken");
const PuulFees = artifacts.require("PuulFees");
const PuulStakingFees = artifacts.require("PuulStakingFees");
const PuulStakingPool = artifacts.require("PuulStakingPool");
const PuulStakingPoolEndpoint = artifacts.require("PuulStakingPoolEndpoint");
const UniswapHelper = artifacts.require("UniswapHelper");
const UniswapPoolHelper = artifacts.require("UniswapPoolHelper");
const PuulRewardFeesEndpoint = artifacts.require("PuulRewardFeesEndpoint");
const PuulWithdrawalFeesEndpoint = artifacts.require("PuulWithdrawalFeesEndpoint");
const Timelock12Hours = artifacts.require("Timelock12Hours");
const Timelock1Day = artifacts.require("Timelock1Day");
const Limits = artifacts.require("Limits");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);
  
  let usdc = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

  deployer.then(async () => {

    // Deployed Contracts
    const timelock12Hours = await Timelock12Hours.deployed();
    const timelock1Day = await Timelock1Day.deployed();
    const unihelper = await UniswapHelper.deployed();
    const poolhelper = await UniswapPoolHelper.deployed();
    const fees = await PuulFees.deployed();
    const stakingFees = await PuulStakingFees.deployed();

    // PUUL Token
    // const puulToken = await PuulToken.at('0x897581168bB658954a811a03de8394EBd42852Ef');
    const puulToken = await deployer.deploy(PuulToken, unihelper.address, addrs.dev);
    console.log(`PuulToken: '${puulToken.address}',`);
    await puulToken.initialize();
    await puulToken.setupRoles(timelock12Hours.address /*defaultAdmin*/, timelock12Hours.address /*admin*/, timelock12Hours.address /*extract*/, addrs.harvester, timelock1Day.address /*minter*/);

    // PUUL Staking Token/Pool and composite farm
    // const puulStakingToken = await PuulStakingPool.at('0xD99ea23f1E50d4c117371C31f0C990B1e1ece1d5')
    const puulStakingToken = await deployer.deploy(PuulStakingPool, puulToken.address, stakingFees.address, unihelper.address);
    console.log(`PuulStakingPool: '${puulStakingToken.address}',`);
    await puulStakingToken.initialize();
    // const stakingPoolEndpoint = await PuulStakingPoolEndpoint.at('0x7f52707e39c67031Dc720dcc190eC1C98118b09C');
    const stakingPoolEndpoint = await deployer.deploy(PuulStakingPoolEndpoint, puulStakingToken.address, [usdc, puulToken.address]);
    console.log(`PuulStakingPoolEndpoint: '${stakingPoolEndpoint.address}',`);
    await puulStakingToken.setFarm(stakingPoolEndpoint.address);
    await puulStakingToken.setupRoles(timelock12Hours.address /*defaultAdmin*/, timelock12Hours.address /*admin*/, timelock12Hours.address /*extract*/, addrs.harvester, timelock1Day.address /*minter*/)

    // PUULREW Token/Pool and farm
    // const puulRewardsFeeToken = await PuulRewardsFeeToken.at('0x0d30D4D59FD2A8C354087bbEdEb1d877048a02ee');
    const puulRewardsFeeToken = await deployer.deploy(PuulRewardsFeeToken, unihelper.address);
    console.log(`PuulRewardsFeeToken: '${puulRewardsFeeToken.address}',`);
    const puulRewardFeesEndpoint = await deployer.deploy(PuulRewardFeesEndpoint, puulRewardsFeeToken.address, [usdc]);
    console.log(`PuulRewardFeesEndpoint: '${puulRewardFeesEndpoint.address}',`);
    await puulRewardsFeeToken.setFarm(puulRewardFeesEndpoint.address);
    await puulRewardsFeeToken.setupRoles(timelock12Hours.address /*defaultAdmin*/, timelock12Hours.address /*admin*/, timelock12Hours.address /*extract*/, addrs.harvester, timelock1Day.address /*minter*/)

    // PUULWTH Token/Pool and farm
    const puulWithdrawalFeeToken = await deployer.deploy(PuulWithdrawalFeeToken, unihelper.address);
    console.log(`PuulWithdrawalFeeToken: '${puulWithdrawalFeeToken.address}',`);
    const puulWithdrawalFeesEndpoint = await deployer.deploy(PuulWithdrawalFeesEndpoint, puulWithdrawalFeeToken.address, [usdc, puulToken.address]);
    console.log(`PuulWithdrawalFeesEndpoint: '${puulWithdrawalFeesEndpoint.address}',`);
    await puulWithdrawalFeeToken.setFarm(puulWithdrawalFeesEndpoint.address);
    await puulWithdrawalFeeToken.setupRoles(timelock12Hours.address /*defaultAdmin*/, timelock12Hours.address /*admin*/, timelock12Hours.address /*extract*/, addrs.harvester, timelock1Day.address /*minter*/)
    await puulWithdrawalFeesEndpoint.addPool(puulStakingToken.address);

    // The fees go to a farm, which are harvested by a token/pool. Onwers of those pool tokens can claim the rewards
    await fees.setRewardFee(puulRewardFeesEndpoint.address, 300); // 3% 
    await fees.setWithdrawalFee(puulWithdrawalFeesEndpoint.address, 200); // 2%
    await fees.setupRoles(timelock12Hours.address)
    await stakingFees.setWithdrawalFee(puulWithdrawalFeesEndpoint.address, 100); // 1%
    await stakingFees.setupRoles(timelock12Hours.address)

    // PUULREW initial distribution. 10000 are created, with each token representing .1% of the rewards fees
    // 85% of reward fees go to staking pool endpoint, which will farm them into the staking pool
    // 15% goes to the developer
    puulRewardsFeeToken.transfer(stakingPoolEndpoint.address, web3.utils.toWei('85000')); 
    puulRewardsFeeToken.transfer(addrs.dev, web3.utils.toWei('15000')); 

    // PUULWTH initial distribution. 10000 are created, with each token representing .1% of the withdraw fees and rewards
    // 85% of fees go to staking pool endpoint, which will farm them into the staking pool
    // 15% goes to the developer
    puulWithdrawalFeeToken.transfer(stakingPoolEndpoint.address, web3.utils.toWei('85000'));
    puulWithdrawalFeeToken.transfer(addrs.dev, web3.utils.toWei('15000')); 

    // Add the fee pools to the staking pool endpoint farm. This will farm the fees into the staking pool 
    await stakingPoolEndpoint.addPool(puulRewardsFeeToken.address);
    await stakingPoolEndpoint.addPool(puulWithdrawalFeeToken.address);
    await stakingPoolEndpoint.setupRoles(timelock12Hours.address /*defaultAdmin*/, timelock12Hours.address /*admin*/, timelock12Hours.address /*extract*/, addrs.harvester);

    // Limits
    const limits = await deployer.deploy(Limits, puulToken.address, puulStakingToken.address);
    console.log(`Limits: '${limits.address}',`);
    
  });
};
