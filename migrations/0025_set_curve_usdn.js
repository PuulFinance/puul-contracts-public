const PuulRewardFeesEndpoint = artifacts.require("PuulRewardFeesEndpoint");
const PuulWithdrawalFeesEndpoint = artifacts.require("PuulWithdrawalFeesEndpoint");
const CurveUsdn = artifacts.require("CurveUsdn");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {

    if (addrs.isDev) { // after 0011_set_admin, harvester must do this on prod
      // const pool = await CurveUsdn.deployed();
      const pool = await CurveUsdn.at('0x11Ce37fffdAd8131F84069d59aEe0832eba8049F');

      const puulRewardFeesEndpoint = await PuulRewardFeesEndpoint.deployed();
      const puulWithdrawalFeesEndpoint = await PuulWithdrawalFeesEndpoint.deployed();
      puulRewardFeesEndpoint.addPool(pool.address);
      puulWithdrawalFeesEndpoint.addPool(pool.address);
    }
  });
};
