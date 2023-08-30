// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./VaultLibrary.sol";

interface IStorageFacility {
    struct VaultOwner {
        address owner;
        uint8 count;
        uint256 dateJoined;
    }

    struct VaultDetails {
        address instance;
        address owner;
        uint256 timestamp;
    }

    event Logger(address indexed caller, bytes32 data);

    function setFactoryAddress(address _factory) external;

    function setAdmin(address _admin) external;

    function revokeAdminRights(address _admin) external;

    function storeVault(address _instance, address _owner) external;

    function getVaultOwner(
        address _owner
    ) external view returns (VaultOwner memory);

    function getVaults(
        address _owner
    ) external view returns (VaultDetails[] memory);
}
