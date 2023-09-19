// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./VaultLibrary.sol";

interface IStorageFacility {
    struct VaultOwner {
        address owner;
        uint256 count;
        address facility;
        uint256 dateJoined;
    }

    struct VaultDetails {
        address instance;
        address owner;
        uint256 timestamp;
    }

    event Logger(address indexed caller, bytes32 data);
    event StoreVault(
        address indexed instance,
        address indexed owner,
        uint256 count
    );
    event NewFactory(address indexed oldFactory, address indexed newFactory);

    function setFactoryAddress(address _factory) external;

    function setAdmin(address _admin) external;

    function revokeAdminRights(address _admin) external;

    function storeVault(address _instance, address _owner) external;

    function getFactoryAddress() external view returns (address);

    function getIsVaultOwner(address _owner) external view returns (bool);

    function getVaultOwner(
        address _owner
    ) external view returns (VaultOwner memory);

    function getVaultOwners() external view returns (address[] memory);

    function getVaults(
        address _owner
    ) external view returns (VaultDetails[] memory);
}
