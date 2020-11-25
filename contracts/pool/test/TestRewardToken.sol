// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.6.12;
import "../../token/ERC20/ERC20.sol";

contract TestRewardToken is ERC20 {

  constructor (string memory name, string memory symbol) public ERC20(name, symbol) {
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }

}
