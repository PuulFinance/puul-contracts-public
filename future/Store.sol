// SPDX-License-Identifier: Apache-2.0-with-puul-exception
pragma solidity >=0.6.12;
import "./Upgradeable.sol";

interface IWriteableStore {
    function setBoolean(bytes32 h, bool v) external;

    function setInt(bytes32 h, int256 v) external;

    function setUint(bytes32 h, uint256 v) external;

    function setAddress(bytes32 h, address v) external;

    function setString(bytes32 h, string calldata v) external;

    function setBytes(bytes32 h, bytes calldata v) external;
}

interface IReadableStore {
    function getBoolean(bytes32 h) external view returns (bool);

    function getInt(bytes32 h) external view returns (int256);

    function getUint(bytes32 h) external view returns (uint256);

    function getAddress(bytes32 h) external view returns (address);

    function getString(bytes32 h) external view returns (string memory);

    function getBytes(bytes32 h) external view returns (bytes memory);
}

struct Storage {
    mapping(bytes32 => bool) _bool;
    mapping(bytes32 => int256) _int;
    mapping(bytes32 => uint256) _uint;
    mapping(bytes32 => string) _string;
    mapping(bytes32 => address) _address;
    mapping(bytes32 => bytes) _bytes;
}

library StoreLib {

    function genKey(address a, string memory s) pure internal returns(bytes32 key) {
        key = keccak256(abi.encodePacked(a, s));
    }

    function getBoolean(Storage storage s, bytes32 h)
        internal
        view
        returns (bool)
    {
        return s._bool[h];
    }

    function getInt(Storage storage s, bytes32 h)
        internal
        view
        returns (int256)
    {
        return s._int[h];
    }

    function getUint(Storage storage s, bytes32 h)
        internal
        view
        returns (uint256)
    {
        return s._uint[h];
    }

    function getAddress(Storage storage s, bytes32 h)
        internal
        view
        returns (address)
    {
        return s._address[h];
    }

    function getString(Storage storage s, bytes32 h)
        internal
        view
        returns (string memory)
    {
        return s._string[h];
    }

    function getBytes(Storage storage s, bytes32 h)
        internal
        view
        returns (bytes memory)
    {
        return s._bytes[h];
    }

    function setBoolean(
        Storage storage s,
        bytes32 h,
        bool v
    ) internal {
        s._bool[h] = v;
    }

    function setInt(
        Storage storage s,
        bytes32 h,
        int256 v
    ) internal {
        s._int[h] = v;
    }

    function setUint(
        Storage storage s,
        bytes32 h,
        uint256 v
    ) internal {
        s._uint[h] = v;
    }

    function setAddress(
        Storage storage s,
        bytes32 h,
        address v
    ) internal {
        s._address[h] = v;
    }

    function setString(
        Storage storage s,
        bytes32 h,
        string memory v
    ) internal {
        s._string[h] = v;
    }

    function setBytes(
        Storage storage s,
        bytes32 h,
        bytes memory v
    ) internal {
        s._bytes[h] = v;
    }
}

contract Store is Upgradeable, IWriteableStore, IReadableStore {
    Storage internal s;

    function getBoolean(bytes32 h) external override view returns (bool) {
        return s._bool[h];
    }

    function getInt(bytes32 h) external override view returns (int256) {
        return s._int[h];
    }

    function getUint(bytes32 h) external override view returns (uint256) {
        return s._uint[h];
    }

    function getAddress(bytes32 h) external override view returns (address) {
        return s._address[h];
    }

    function getString(bytes32 h)
        external
        override
        view
        returns (string memory)
    {
        return s._string[h];
    }

    function getBytes(bytes32 h) external override view returns (bytes memory) {
        return s._bytes[h];
    }

    function setBoolean(bytes32 h, bool v) external override onlyVersion {
        s._bool[h] = v;
    }

    function setInt(bytes32 h, int256 v) external override onlyVersion {
        s._int[h] = v;
    }

    function setUint(bytes32 h, uint256 v) external override onlyVersion {
        s._uint[h] = v;
    }

    function setAddress(bytes32 h, address v) external override onlyVersion {
        s._address[h] = v;
    }

    function setString(bytes32 h, string calldata v)
        external
        override
        onlyVersion
    {
        s._string[h] = v;
    }

    function setBytes(bytes32 h, bytes calldata v) external override onlyVersion {
        s._bytes[h] = v;
    }
}
