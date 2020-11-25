const UniswapHelper = artifacts.require("UniswapHelper");

module.exports = async function (deployer, network, accounts) {

  let weth = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  let pickle = '0x429881672b9ae42b8eba0e26cd9c73711b891ca5';
  let usdc = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  let dai = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
  let usdt = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
  let wbtc = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';

  deployer.then(async () => {
    // Uniswap helper contract
    const helper = await UniswapHelper.deployed();

    // PICKLE
    await helper.addPath('PICKLE/WETH', [pickle, weth]);
    await helper.addPath('WETH/PICKLE', [weth, pickle]);
    await helper.addPath('PICKLE/USDC', [pickle, weth, usdc]);
    await helper.addPath('USDC/PICKLE', [usdc, weth, pickle]);
    await helper.addPath('PICKLE/USDT', [pickle, weth, usdt]);
    await helper.addPath('USDT/PICKLE', [usdt, weth, pickle]);
    await helper.addPath('PICKLE/WBTC', [pickle, weth, wbtc]);
    await helper.addPath('WBTC/PICKLE', [wbtc, weth, pickle]);
    await helper.addPath('DAI/PICKLE', [dai, weth, pickle]);
    await helper.addPath('PICKLE/DAI', [pickle, weth, dai]);    

  });
};
