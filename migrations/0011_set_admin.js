const UniswapHelper = artifacts.require("UniswapHelper");
const Timelock12Hours = artifacts.require("Timelock12Hours");
const PuulRewardFeesEndpoint = artifacts.require("PuulRewardFeesEndpoint");
const PuulWithdrawalFeesEndpoint = artifacts.require("PuulWithdrawalFeesEndpoint");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {
  
    // Close up helper, from now on only harvester can do addPath
    const helper = await UniswapHelper.deployed();
    const timelock12Hours = await Timelock12Hours.deployed();
    await helper.setupRoles(timelock12Hours.address, addrs.harvester);

    // Close up endpoints, from now on only harvester can do addPool
    const puulRewardFeesEndpoint = await PuulRewardFeesEndpoint.deployed();
    const puulWithdrawalFeesEndpoint = await PuulWithdrawalFeesEndpoint.deployed();
    await puulRewardFeesEndpoint.setupRoles(timelock12Hours.address /*defaultAdmin*/, timelock12Hours.address /*admin*/, timelock12Hours.address /*extract*/, addrs.harvester);
    await puulWithdrawalFeesEndpoint.setupRoles(timelock12Hours.address /*defaultAdmin*/, timelock12Hours.address /*admin*/, timelock12Hours.address /*extract*/, addrs.harvester);

  });
};
