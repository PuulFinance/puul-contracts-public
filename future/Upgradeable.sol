// SPDX-License-Identifier: Apache-2.0-with-puul-exception
pragma solidity >=0.6.12;
import "@openzeppelin/contracts/access/Ownable.sol";

contract Upgradeable is Ownable {
    address version = msg.sender;

    modifier onlyVersion() {
        require(msg.sender == version);
        _;
    }

    function upgrade(address _version) public {
        require(msg.sender == owner());
        version = _version;
    }
}
