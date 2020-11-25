// SPDX-License-Identifier: Apache-2.0-with-puul-exception
pragma solidity >=0.6.12;

struct SynthetixState {
  bool someSynthetix;
}

library LibSynthetixState {
  function initializeState() internal pure returns (SynthetixState memory state) {
    state = SynthetixState(false);
  }
}
