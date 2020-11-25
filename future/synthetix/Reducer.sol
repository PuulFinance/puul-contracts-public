// SPDX-License-Identifier: Apache-2.0-with-puul-exception
pragma solidity >=0.6.12;
import "../../State.sol";
import "../../Actions.sol";

library LibSynthetixReducer {
  address constant public reducer = address(0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F);
  uint256 constant actionCreate = uint256(keccak256("create"));

  function createAction(uint256 action) internal pure returns (Action memory result) {
    result = Actions.createAction(reducer, action);
  }

  function createAction(uint256 action, bytes memory payload) internal pure returns (Action memory result) {
    result = Actions.createAction(reducer, action, payload);
  }

  function reduce(Action memory action, State memory state) pure internal {
    if (action.action == actionCreate) {
      state.synState.someSynthetix = true;
    }
  }
}
