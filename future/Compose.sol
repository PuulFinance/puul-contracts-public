// SPDX-License-Identifier: Apache-2.0-with-puul-exception
pragma solidity >=0.6.12;
import "./State.sol";
import "./Reducers.sol";

library Compose {

    function run(Action[] memory actions, State memory state) internal pure {
        for (uint i = 0; i < actions.length; i++) {
            Reducers.reduce(actions[i], state);
        }
    }
}
