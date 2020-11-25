const Timelock12Hours = artifacts.require("Timelock12Hours");
const Timelock1Day = artifacts.require("Timelock1Day");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);
  console.log('accounts', addrs);
  console.log(`Harvester: '${addrs.harvester}',`);

  deployer.then(async () => {
    // Timelocks
    const timelock12Hours = await deployer.deploy(Timelock12Hours, addrs.timelock);
    console.log(`Timelock12Hours: '${timelock12Hours.address}',`);
    const timelock1Day = await deployer.deploy(Timelock1Day, addrs.timelock);
    console.log(`Timelock1Day: '${timelock1Day.address}',`);

  });
};
