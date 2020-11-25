// SPDX-License-Identifier: Apache-2.0-with-puul-exception
pragma solidity >=0.6.12;
import "./State.sol";
import { Action } from "./Actions.sol";
import { LibSynthetixReducer } from "./protocols/synthetix/Reducer.sol";

library Reducers {

  function reduce(Action memory action, State memory state) pure internal {
    if (action.reducer == LibSynthetixReducer.reducer) {
      LibSynthetixReducer.reduce(action, state);
    }
  }
}
