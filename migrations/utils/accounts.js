require('dotenv').config();

module.exports = function(accounts, network) {
  const isProduction = network === 'mainnet';
  const isDev = !isProduction;
  let dev;
  let timelock;
  let harvester;
  let deployer = accounts[0]
  switch (network) {
    case 'mainnet':
      dev = process.env.MAINNET_DEV;
      timelock = process.env.MAINNET_TIMELOCK;
      harvester = process.env.MAINNET_HARVESTER;
      break;
    case 'rinkeby':
      dev = accounts[0];
      timelock = accounts[0];
      harvester = accounts[0];
      break;
    default:
      dev = accounts[0];
      timelock = accounts[0];
      harvester = accounts[0];    
  }

  return {
    isProduction,
    isDev,
    dev,
    harvester,
    timelock,
    deployer,
  };
}
