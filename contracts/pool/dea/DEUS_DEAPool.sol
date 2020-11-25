// SPDX-License-Identifier: Apache-2.0-with-puul-exception
pragma solidity >=0.6.12;
import "@openzeppelin/contracts/utils/Address.sol";
import '../UniswapPool.sol';

contract DEUS_DEAPool is UniswapPool {
  using Address for address;

  string constant _symbol = 'puDEUS_DEA';
  string constant _name = 'UniswapPoolDEUS_DEA';
  address constant _deus_dea = 0x92Adab6d8dc13Dbd9052b291CFC1D07888299D65;

  constructor (address fees) public UniswapPool(_name, _symbol, _deus_dea, true, fees) { }

}
