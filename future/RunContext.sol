// SPDX-License-Identifier: Apache-2.0-with-puul-exception
pragma solidity >=0.6.12;
import "./Store.sol";
import "./State.sol";

library RunContext {
    function store(address storeAddress) internal pure returns (Store result) {
        result = Store(storeAddress);
    }

    function readableStore(address storeAddress) internal pure returns (IReadableStore result) {
        result = IReadableStore(storeAddress);
    }

}
