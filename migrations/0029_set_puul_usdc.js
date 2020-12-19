const PuulRewardFeesEndpoint = artifacts.require("PuulRewardFeesEndpoint");
const PuulWithdrawalFeesEndpoint = artifacts.require("PuulWithdrawalFeesEndpoint");
const PUUL_USDCPool = artifacts.require("PUUL_USDCPool");
const PuulToken = artifacts.require("PuulToken");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {

    if (addrs.isDev) { // after 0011_set_admin, harvester must do this on prod
      // const pool = await PUUL_USDCPool.deployed();
      // const puulToken = await PuulToken.deployed()
      // const puulRewardFeesEndpoint = await PuulRewardFeesEndpoint.deployed();
      // const puulWithdrawalFeesEndpoint = await PuulWithdrawalFeesEndpoint.deployed();
      // puulRewardFeesEndpoint.addReward(puulToken.address);
      // puulRewardFeesEndpoint.addPool(pool.address);
      // puulWithdrawalFeesEndpoint.addPool(pool.address);
    }
  });
};
