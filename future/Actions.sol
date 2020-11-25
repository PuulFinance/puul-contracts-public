// SPDX-License-Identifier: Apache-2.0-with-puul-exception
pragma solidity >=0.6.12;

struct Action {
  address reducer;
  uint256 action;
  bytes payload;
}

library Actions {
    function createAction(address reducer, uint256 action) internal pure returns (Action memory result) {
        result = Action(reducer, action, new bytes(0));
    }
    function createAction(address reducer, uint256 action, bytes memory payload) internal pure returns (Action memory result) {
        result = Action(reducer, action, payload);
    }
}
