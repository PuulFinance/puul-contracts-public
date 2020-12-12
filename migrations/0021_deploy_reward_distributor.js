const RewardDistributor = artifacts.require("RewardDistributor");
const Timelock12Hours = artifacts.require("Timelock12Hours");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {
    // Deployed contracts
    const tl12hours = await Timelock12Hours.deployed();

    const dist = await deployer.deploy(RewardDistributor);
    console.log(`RewardDistributor: '${dist.address}',`);
    await dist.setupRoles(tl12hours.address, addrs.harvester);

  });
};
