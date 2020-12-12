// SPDX-License-Identifier: Apache-2.0-with-puul-exception
pragma solidity >=0.6.12;
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import './CurveBase.sol';

contract Curve3Pool is CurveBase {
  using Address for address;
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  string constant SYMBOL = 'puCrv3Pool';
  string constant NAME = 'Puul Crv3Pool';

  constructor (address fees) 
    public CurveBase(NAME, SYMBOL, CurveHelperLib.CRV_3POOL_LP, CurveHelperLib.CRV_3POOL_DEPOSIT, CurveHelperLib.CRV_3POOL_GAUGE, fees) 
  {
    // These must be in the right order - see the curve pool
    _storage._coins.push(CurveHelperLib.DAI);
    _storage._coins.push(CurveHelperLib.USDC);
    _storage._coins.push(CurveHelperLib.USDT);

    _storage._decimals[CurveHelperLib.DAI] = 18;
    _storage._decimals[CurveHelperLib.USDC] = 6;
    _storage._decimals[CurveHelperLib.USDT] = 6;
  }

}
