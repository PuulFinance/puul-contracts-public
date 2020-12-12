// SPDX-License-Identifier: Apache-2.0-with-puul-exception
pragma solidity >=0.6.12;
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import '../../protocols/uniswap-v2/UniswapHelper.sol';
import '../UniswapPoolHelper.sol';
import '../EarnPoolV2.sol';
import '../IPoolFarmExtended.sol';
import '../../farm/IFarm.sol';
import './CurveHelper.sol';
import './CurveHelperLib.sol';
import './ICurveDepositor.sol';
import './ICurveGauge.sol';
import './ICurveRegistry.sol';
import './ICurveVotingEscrow.sol';
import './ICurveMinter.sol';

contract CurveBase is EarnPoolV2, IPoolFarmExtended {
  using Address for address;
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  CurveHelperLib.Storage _storage;

  constructor (string memory name, string memory symbol, address lp, address depositor, address gauge, address fees) public EarnPoolV2(name, symbol, true, fees) {
    _storage.ICRV = IERC20(CurveHelperLib.CRV);
    _storage._registry = ICurveRegistry(CurveHelperLib.CRV_REGISTRY);
    _storage._ve = ICurveVotingEscrow(CurveHelperLib.CRV_VOTING_ESCROW);

    _storage._lp = lp;
    _storage._gauge = ICurveGauge(gauge);
    _storage._depositor = ICurveDepositor(depositor);

    _addReward(CurveHelperLib.CRV);
  }

  function crvReserveToRewards(uint256 amount) onlyHarvester nonReentrant external virtual {
    require(_storage._crvReserve >= amount, '!crv');
    _rewardTotals[_storage.ICRV] = _rewardTotals[_storage.ICRV].add(amount);
    _storage._crvReserve = _storage._crvReserve.sub(amount);
    _updateRewardSharePrice(_storage.ICRV, amount);
  }

  function crvWhitelisted() onlyHarvester nonReentrant external {
    _storage._crvWhitelisted = true;
  }

  function createLock(uint256 amount, uint256 lockTime) onlyHarvester nonReentrant external virtual {
    CurveHelperLib.createLock(_storage, amount, lockTime);
  }

  function increaseLock(uint256 amount) onlyHarvester nonReentrant external virtual {
    CurveHelperLib.increaseLock(_storage, amount);
  }

  function extendLock(uint256 lockTime) onlyHarvester nonReentrant external virtual {
    CurveHelperLib.extendLock(_storage, lockTime);
  }

  function deposit(address token, uint256 amount, uint256 min) onlyMember nonReentrant virtual external {
    uint256 mint = CurveHelperLib.deposit(_storage, token, amount, min);
    _deposit(mint);
  }

  function getMinAmount(address token, uint256 amount, uint256 slippage) external view returns(uint256) {
    return CurveHelperLib.getMinAmount(_storage, token, amount, slippage);
  }

  function _earn() virtual override internal {
    return CurveHelperLib.earn(_storage);
  }

  function _unearn(uint256 amount) virtual override internal {
    _storage._gauge.withdraw(amount);
  }

  function _adjustRewardFees(IERC20 token, uint256 tokenSupply) internal override virtual returns(uint256) {
    if (token == _storage.ICRV && tokenSupply > 0) {
      uint256 feeAmt = CurveHelperLib.convertFees(_fees, token, tokenSupply);
      tokenSupply = tokenSupply.sub(feeAmt, '!fees');
      if (_storage._crvReserveAmount > 0) {
        uint256 reserve = tokenSupply.mul(_storage._crvReserveAmount).div(CurveHelperLib.DIVISOR);
        _storage._crvReserve = _storage._crvReserve.add(reserve);
        tokenSupply = tokenSupply.sub(reserve, 'reserve');
      }
    }
    return tokenSupply;
  }

  function _harvestRewards() override virtual internal {
    ICurveMinter(CurveHelperLib.CRV_MINTER).mint(address(_storage._gauge));
    if (address(_farm) != address(0)) {
      _farm.harvest();
    }
  }

  // noops
  function withdrawAll() nonReentrant external override virtual {}
  function withdraw(uint256 amount) nonReentrant external override virtual {}
  function withdrawFees() onlyWithdrawal nonReentrant override virtual external {}

  function withdrawAllUsd(address token, uint256 min) nonReentrant external virtual {
    uint256 total = balanceOf(msg.sender);
    uint256 afterFee = _withdraw(total);
    CurveHelperLib.removeLiquidity(_storage, token, afterFee, min);
    emit Withdraw(msg.sender, afterFee);
  }

  function withdrawUsd(address token, uint256 amount, uint256 min) nonReentrant external virtual {
    uint256 afterFee = _withdraw(amount);
    CurveHelperLib.removeLiquidity(_storage, token, afterFee, min);
    emit Withdraw(msg.sender, afterFee);
  }

  function estimateWithdrawUsd(address token, uint256 amount, uint256 slippage) external view returns(uint256) {
    (uint256 newAmount, , ) = _splitWithdrawal(amount, msg.sender);
    return CurveHelperLib.estimateWithdraw(_storage, token, newAmount, slippage);
  }

  function estimateWithdrawUsdWithoutFees(address token, uint256 amount, uint256 slippage) external view returns(uint256) {
    return CurveHelperLib.estimateWithdraw(_storage, token, amount, slippage);
  }

  function withdrawFeesUsd(address token, uint256 min) onlyWithdrawal nonReentrant external {
    uint256 amount = _withdrawFees();
    CurveHelperLib.removeLiquidity(_storage, token, amount, min);
    emit Withdraw(msg.sender, amount);
  }

  function withdrawFeesToToken(uint256 amount, address token, uint256 min, uint256 /* minB */, uint256 /* slippageA */, uint256 /* slippageB */) onlyWithdrawal nonReentrant external {
    require(amount > 0 && amount <= balanceOf(msg.sender), '0<amount<bal');
    _unearn(amount);
    _burn(msg.sender, amount);
    CurveHelperLib.removeLiquidity(_storage, token, amount, min);
    emit Withdraw(msg.sender, amount);
  }

  function claimToToken(address token, uint[] memory amounts, uint[] memory mins) external override virtual nonReentrant {
    _updateRewards(msg.sender, balanceOf(msg.sender), true);
    UniswapPoolHelper.claimToToken(_storage._uni, token, amounts, mins, _owedRewards, _rewards, _rewardTotals);
  }

  function setUni(address helper) onlyHarvester nonReentrant external {
    require(helper != address(0), '!uni');
    _storage._uni = UniswapHelper(helper);
  }

  function setCurveReserve(uint256 reserve) onlyHarvester nonReentrant external {
    require(reserve <= CurveHelperLib.MAX_CRV_RESERVE, 'max');
    _storage._crvReserveAmount = reserve;
  }

  function setCurve(address helper) onlyHarvester nonReentrant external {
    require(helper != address(0), '!curve');
    _storage._curve = CurveHelper(helper);
  }

  function _tokenInUse(address token) override virtual internal view returns(bool) {
    return token == address(_storage._lp) || EarnPool._tokenInUse(token);
  }

}
