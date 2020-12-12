module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {
  
    // Just sets the migration to here so it skips the ones that must be done manually

  });
};
