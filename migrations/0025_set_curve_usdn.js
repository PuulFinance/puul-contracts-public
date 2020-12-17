const PuulRewardFeesEndpoint = artifacts.require("PuulRewardFeesEndpoint");
const PuulWithdrawalFeesEndpoint = artifacts.require("PuulWithdrawalFeesEndpoint");
const CurveUsdn = artifacts.require("CurveUsdn");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {

    if (addrs.isDev) { // after 0011_set_admin, harvester must do this on prod
      const pool = await CurveUsdn.deployed();
      const puulRewardFeesEndpoint = await PuulRewardFeesEndpoint.deployed();
      const puulWithdrawalFeesEndpoint = await PuulWithdrawalFeesEndpoint.deployed();
      puulRewardFeesEndpoint.addPool(pool.address);
      puulWithdrawalFeesEndpoint.addPool(pool.address);
    }
  });
};
