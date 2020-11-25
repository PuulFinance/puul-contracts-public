// SPDX-License-Identifier: Apache-2.0-with-puul-exception
pragma solidity >=0.6.12;
import "@openzeppelin/contracts/utils/Address.sol";
import "../BaseFarm.sol";
import "../../utils/Console.sol";
import "../../protocols/deusfinance/IDeusStaking.sol";

contract DeaStakingFarm is BaseFarm {
  using Address for address;
  
  constructor (address pool, address farm, address staking, address[] memory rewards, address fees) public BaseFarm(pool, farm, staking, rewards, fees) {
  }

  function _deposit(uint256 amount) internal override {
    IDeusStaking(_targetFarm).deposit(amount);
  }

  function _harvest() internal override {
    IDeusStaking(_targetFarm).deposit(0);
  }

  function _withdraw(uint256 amount) internal override {
    IDeusStaking(_targetFarm).withdraw(amount);
  }

}