// SPDX-License-Identifier: Apache-2.0-with-puul-exception
pragma solidity >=0.6.12;
import "@openzeppelin/contracts/utils/Address.sol";
import '../UniswapPool.sol';

contract DEA_USDCPool is UniswapPool {
  using Address for address;

  string constant _symbol = 'puDEA_USDC';
  string constant _name = 'UniswapPoolDEA_USDC';
  address constant _dea_usdc = 0x83973dcaa04A6786ecC0628cc494a089c1AEe947;

  constructor (address fees) public UniswapPool(_name, _symbol, _dea_usdc, true, fees) { }

}
