const CurveHelper = artifacts.require("CurveHelper");
const CurveHelperLib = artifacts.require("CurveHelperLib");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {
    // Curve helper contract
    const helper = await deployer.deploy(CurveHelper);
    console.log(`CurveHelper: '${helper.address}',`);
    // Curve helper library
    const poolhelper = await deployer.deploy(CurveHelperLib);
    console.log(`CurveHelperLib: '${poolhelper.address}',`);
  });
};
