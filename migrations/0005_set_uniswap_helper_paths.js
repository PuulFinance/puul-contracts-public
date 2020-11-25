const UniswapHelper = artifacts.require("UniswapHelper");

module.exports = async function (deployer, network, accounts) {

  let weth = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  let pickle = '0x429881672b9ae42b8eba0e26cd9c73711b891ca5';
  let usdc = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  let dai = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
  let usdt = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
  let dea = '0x80ab141f324c3d6f2b18b030f1c4e95d4d658778';
  let deus = '0x3b62f3820e0b035cc4ad602dece6d796bc325325';


  deployer.then(async () => {
    // Uniswap helper contract
    const helper = await UniswapHelper.deployed();

    await helper.addPath('USDT/USDC', [usdt, usdc]);
    await helper.addPath('USDC/USDT', [usdc, usdt]);
    await helper.addPath('DAI/USDC', [dai, usdc]);
    await helper.addPath('USDC/DAI', [usdc, dai]);
    await helper.addPath('USDT/USDC/DAI', [usdt, usdc, dai]);
    await helper.addPath('DAI/USDC/USDT', [usdt, usdc, dai]);

    await helper.addPath('WETH/USDC', [weth, usdc]);
    await helper.addPath('USDC/WETH', [usdc, weth]);
    await helper.addPath('WETH/USDT', [weth, usdt]);
    await helper.addPath('USDT/WETH', [usdt, weth]);
    await helper.addPath('WETH/DAI', [weth, dai]);
    await helper.addPath('DAI/WETH', [dai, weth]);

  });
};
