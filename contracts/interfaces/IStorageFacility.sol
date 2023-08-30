// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./VaultLibrary.sol";

interface IStorageFacility {

    function storeVault(address _instance, address _owner) external;

    function getVaultOwner(
        address _owner
    ) external view returns (VaultLibrary.VaultOwner memory);

    function getVaults(
        address _owner
    ) external view returns (VaultLibrary.VaultDetails[] memory);
}
