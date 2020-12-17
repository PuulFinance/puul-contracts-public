const PuulRewardFeesEndpoint = artifacts.require("PuulRewardFeesEndpoint");
const PuulWithdrawalFeesEndpoint = artifacts.require("PuulWithdrawalFeesEndpoint");
const Curve3Pool = artifacts.require("Curve3Pool");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {

    if (addrs.isDev) { // after 0011_set_admin, harvester must do this on prod
      const pool = await Curve3Pool.deployed();
      const puulRewardFeesEndpoint = await PuulRewardFeesEndpoint.deployed();
      const puulWithdrawalFeesEndpoint = await PuulWithdrawalFeesEndpoint.deployed();
      puulRewardFeesEndpoint.addPool(pool.address);
      puulWithdrawalFeesEndpoint.addPool(pool.address);
      
    }
  });
};
