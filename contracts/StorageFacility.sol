// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./interfaces/IStorageFacility.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StorageFacility is IStorageFacility, Ownable {
    address private factory;

    mapping(address => bool) private isAdmin;
    mapping(address => VaultOwner) private vaultOwners;
    mapping(address => VaultDetails[]) private vaults;

    modifier onlyAdmin() {
        require(
            isAdmin[msg.sender],
            "This function can only be called by an admin"
        );
        _;
    }

    modifier onlyFactory() {
        require(factory != address(0), "Factory has not been set yet");
        require(
            msg.sender == factory,
            "This function can only be called by the factory contract"
        );
        _;
    }

    function setFactoryAddress(address _factory) external override onlyOwner {
        factory = _factory;
    }

    function setAdmin(address _admin) external override onlyOwner {
        isAdmin[_admin] = true;
    }

    function revokeAdminRights(address _admin) external override onlyOwner {
        isAdmin[_admin] = false;
    }

    function getVaultOwner(
        address _vaultOwner
    ) external view override returns (VaultOwner memory) {
        VaultOwner memory vaultOwner = vaultOwners[_vaultOwner];
        require(
            vaultOwner.owner != address(0),
            "No vaults present for that address"
        );
        return vaultOwners[_vaultOwner];
    }

    function getVaults(
        address _vaultOwner
    ) external view override returns (VaultDetails[] memory) {
        VaultDetails[] memory vaultDetails = vaults[_vaultOwner];
        require(vaultDetails.length > 0, "No vaults present for that address");
        return vaultDetails;
    }

    function storeVault(
        address _instance,
        address _vaultOwner
    ) external override onlyFactory {
        VaultOwner memory vaultOwner = vaultOwners[_vaultOwner];
        // store the owner if it is a first time user
        if (vaultOwner.owner == address(0)) {
            vaultOwner.owner = _vaultOwner;
            vaultOwner.dateJoined = block.timestamp;
            emit Logger(_vaultOwner, "Storing new owner");
        }

        VaultDetails memory vault = VaultDetails({
            instance: _instance,
            owner: _vaultOwner,
            timestamp: block.timestamp
        });

        // increment the amount of vaults the owner has
        vaultOwner.count += 1;
        // add the vault details to the owners array
        vaults[_vaultOwner].push(vault);
        // update the current owner struct in the mapping
        vaultOwners[_vaultOwner] = vaultOwner;
        emit Logger(_instance, "Stored new vault");
    }
}
