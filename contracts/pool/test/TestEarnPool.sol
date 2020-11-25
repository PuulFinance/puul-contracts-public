// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.6.12;
import "@openzeppelin/contracts/utils/Address.sol";
import "../EarnPool.sol";
import "./TestRewardToken.sol";
import "../../utils/Console.sol";
import "../../fees/Fees.sol";

contract TestEarnPool is EarnPool {
  using Address for address;

  constructor (string memory name, string memory symbol, bool allowAll, address fees) public EarnPool(name, symbol, allowAll, fees) {
  }

  function _harvestRewards() override internal {
    uint256 amount = 100 ether;
    TestRewardToken(address(_rewards[0])).mint(address(this), amount);
  }

  function deposit(uint256 amount) external {
    _deposit(amount);
  }

}
