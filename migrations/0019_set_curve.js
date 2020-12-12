const UniswapHelper = artifacts.require("UniswapHelper");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  let weth = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  let usdc = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  let dai = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
  let usdt = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
  let wbtc = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';

  let token = '0xD533a949740bb3306d119CC777fa900bA034cd52';

  deployer.then(async () => {
    // Uniswap helper contract
    const helper = await UniswapHelper.deployed();

    if (addrs.isDev) { // after 0011_set_admin, harvester must do this on prod
      await helper.addPath('CRV/WETH', [token, weth]);
      await helper.addPath('WETH/CRV', [weth, token]);
      await helper.addPath('CRV/USDC', [token, weth, usdc]);
      await helper.addPath('USDC/CRV', [usdc, weth, token]);
      await helper.addPath('CRV/USDT', [token, weth, usdt]);
      await helper.addPath('USDT/CRV', [usdt, weth, token]);
      await helper.addPath('DAI/CRV', [dai, weth, token]);
      await helper.addPath('CRV/DAI', [token, weth, dai]);
    }
  });
};
