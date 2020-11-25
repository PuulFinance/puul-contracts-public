// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.6.12;

interface IDeusStaking {
  function deposit(uint256 amount) external;
  function withdraw(uint256 amount) external;
}
