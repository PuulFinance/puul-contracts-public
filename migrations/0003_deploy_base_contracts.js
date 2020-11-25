const PuulFees = artifacts.require("PuulFees");
const PuulStakingFees = artifacts.require("PuulStakingFees");
const UniswapHelper = artifacts.require("UniswapHelper");
const UniswapPoolHelper = artifacts.require("UniswapPoolHelper");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {
    // Uniswap helper contract
    const unihelper = await deployer.deploy(UniswapHelper);
    console.log(`UniswapHelper: '${unihelper.address}',`);
    // Uniswap pool helper library
    const poolhelper = await deployer.deploy(UniswapPoolHelper);
    // PuulFees contract
    const fees = await deployer.deploy(PuulFees, unihelper.address, addrs.deployer, 200, addrs.deployer, 300);
    console.log(`PuulFees: '${fees.address}',`);
    // PuulStakingFees
    const stakingFees = await deployer.deploy(PuulStakingFees, unihelper.address, addrs.deployer, 100);
    console.log(`PuulStakingFees: '${stakingFees.address}',`);
  });
};
