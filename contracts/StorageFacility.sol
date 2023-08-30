// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./interfaces/VaultLibrary.sol";
import "./interfaces/IStorageFacility.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StorageFacility is IStorageFacility, Ownable {
    address private factory;

    event Logger(address indexed caller, bytes32 data);

    mapping(address => VaultOwner) vaultOwners;
    mapping(address => VaultDetails[]) private vaults;

    // modifier onlyAdmin() {
    //     require(
    //         msg.sender == admin,
    //         "This function can only be called by an admin"
    //     );
    //     _;
    // }

    modifier onlyFactory() {
        require(factory != address(0), "Factory has not been set yet");
        require(
            msg.sender == factory,
            "This function can only be called by the factory contract"
        );
        _;
    }

    constructor() {}

    function setFactoryAddress(address _factory) external override onlyOwner {
        factory = _factory;
    }

    function getVaultOwner(
        address _owner
    ) external view override returns (VaultOwner memory) {
        VaultOwner memory owner = vaultOwners[_owner];
        require(
            owner.owner != address(0),
            "No vaults present for that address"
        );
        return vaultOwners[_owner];
    }

    function getVaults(
        address _owner
    ) external view override returns (VaultDetails[] memory) {
        VaultDetails[] memory vaultDetails = vaults[_owner];
        require(vaultDetails.length > 0, "No vaults present for that address");
        return vaultDetails;
    }

    function storeVault(
        address _instance,
        address _owner
    ) external override onlyFactory {
        VaultOwner memory owner = vaultOwners[_owner];
        // store the owner if it is a first time user
        if (owner.owner == address(0)) {
            owner.owner = _owner;
            emit Logger(_owner, "Storing new owner");
        }

        VaultDetails memory vault = VaultDetails({
            instance: _instance,
            owner: _owner,
            timestamp: block.timestamp
        });

        // increment the amount of vaults the owner has
        owner.count += 1;
        // add the vault details to the owners array
        vaults[_owner].push(vault);
        // update the current owner struct in the mapping
        vaultOwners[_owner] = owner;
        emit Logger(_instance, "Stored new vault");
    }
}
