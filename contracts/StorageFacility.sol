// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./interfaces/VaultLibrary.sol";
import "./interfaces/IStorageFacility.sol";

contract StorageFacility is IStorageFacility {
    address private admin;
    address private factory;

    event Logger(address indexed caller, bytes32 data);

    mapping(address => VaultLibrary.VaultOwner) vaultOwners;
    mapping(address => VaultLibrary.VaultDetails[]) private vaults;

    modifier onlyAdmin() {
        require(
            msg.sender == admin,
            "This function can only be called by an admin"
        );
        _;
    }

    modifier onlyFactory() {
        require(
            msg.sender == factory,
            "This function can only be called by the factory contract"
        );
        _;
    }

    constructor(address _admin, address _factory) {
        admin = _admin;
        factory = _factory;
    }

    function getVaultOwner(
        address _owner
    ) external view override returns (VaultLibrary.VaultOwner memory) {
        VaultLibrary.VaultOwner memory owner = vaultOwners[_owner];
        require(
            owner.owner != address(0),
            "No vaults present for that address"
        );
        return vaultOwners[_owner];
    }

    function getVaults(
        address _owner
    ) external view override returns (VaultLibrary.VaultDetails[] memory) {
        VaultLibrary.VaultDetails[] memory vaultDetails = vaults[
            _owner
        ];
        require(
            vaultDetails.length > 0,
            "No vaults present for that address"
        );
        return vaultDetails;
    }

    function storeVault(
        address _instance,
        address _owner
    ) external override onlyFactory {
        VaultLibrary.VaultOwner memory owner = vaultOwners[_owner];
        // store the owner if it is a first time user
        if (owner.owner == address(0)) {
            owner.owner = _owner;
            emit Logger(_owner, "Storing new owner");
        }

        VaultLibrary.VaultDetails memory vault = VaultLibrary
            .VaultDetails({
                instance: _instance,
                owner: _owner,
                timestamp: block.timestamp
            });

        // increment the amount of Vaults the owner has
        owner.count += 1;
        // add the vault details to the owners array
        vaults[_owner].push(vault);
        // update the current owner struct in the mapping
        vaultOwners[_owner] = owner;
        emit Logger(_instance, "Stored new vault");
    }
}
