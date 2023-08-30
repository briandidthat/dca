// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./VaultLibrary.sol";

interface IStorageFacility {
    struct VaultOwner {
        address owner;
        uint8 count;
    }

    struct VaultDetails {
        address instance;
        address owner;
        uint256 timestamp;
    }

    function setFactoryAddress(address _factory) external;

    function storeVault(address _instance, address _owner) external;

    function getVaultOwner(
        address _owner
    ) external view returns (VaultOwner memory);

    function getVaults(
        address _owner
    ) external view returns (VaultDetails[] memory);
}
