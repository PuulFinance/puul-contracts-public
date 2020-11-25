// SPDX-License-Identifier: Apache-2.0-with-puul-exception
pragma solidity >=0.6.12;
import { 
  SynthetixState, 
  LibSynthetixState 
} from "./protocols/synthetix/State.sol";

struct State {
    bool hasError;
    uint256 errorCode;
    bytes reason;

    SynthetixState synState;
}

library LibState {
  function initializeState() internal pure returns (State memory state) {
    return State(
      false, 
      0, 
      "", 
      LibSynthetixState.initializeState());
  }
}
