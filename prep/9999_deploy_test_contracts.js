const Fees = artifacts.require("Fees");
const EarnPool = artifacts.require("TestEarnPool");
const RewardToken = artifacts.require("TestRewardToken");
const Timelock12Hours = artifacts.require("Timelock12Hours");
const UniswapHelper = artifacts.require("UniswapHelper");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {

    if (addrs.isDev) {
      const uhelper = await UniswapHelper.deployed();
      const tl12hours = await Timelock12Hours.deployed();
      const fees = await deployer.deploy(Fees, uhelper.address, addrs.deployer, 200, addrs.deployer, 300);
      const rewardToken = await deployer.deploy(RewardToken, 'TestRewardToken', 'TESTREW');
      const earnPool = await deployer.deploy(EarnPool, 'TestEarnPool', 'TESTEARN', true, fees.address);
      await earnPool.addReward(rewardToken.address);
      await earnPool.initialize();
      await earnPool.setupRoles(tl12hours.address, tl12hours.address, tl12hours.address, addrs.harvester, tl12hours.address);
    }

  });
};
