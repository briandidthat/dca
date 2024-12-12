// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract StorageFacility is Ownable {
    address private factory;
    address[] private deployers;

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

    mapping(address => bool) private isAdmin;
    mapping(address => bool) private isVaultOwner;
    mapping(address => VaultDetails[]) private vaults;
    mapping(address => VaultOwner) private vaultOwners;

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

    function storeVault(
        address _instance,
        address _vaultOwner
    ) external onlyFactory {
        bool ownsVault = isVaultOwner[_vaultOwner];
        VaultOwner memory vaultOwner = vaultOwners[_vaultOwner];
        // store the owner if it is a first time user
        if (!ownsVault) {
            isVaultOwner[_vaultOwner] = true;
            deployers.push(_vaultOwner);
            vaultOwner.owner = _vaultOwner;
            vaultOwner.dateJoined = block.timestamp;
            vaultOwner.facility = address(this);

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
        emit StoreVault(_instance, _vaultOwner, vaultOwner.count);
    }

    function setFactoryAddress(
        address _newFactory
    ) external onlyOwner {
        emit NewFactory(factory, _newFactory);
        factory = _newFactory;
    }

    function setAdmin(address _admin) external onlyOwner {
        isAdmin[_admin] = true;
    }

    function revokeAdminRights(address _admin) external onlyOwner {
        isAdmin[_admin] = false;
    }

    function getFactoryAddress() external view returns (address) {
        return factory;
    }

    function getIsVaultOwner(
        address _vaultOwner
    ) external view returns (bool) {
        return isVaultOwner[_vaultOwner];
    }

    function getVaults(
        address _vaultOwner
    ) external view returns (VaultDetails[] memory) {
        require(
            isVaultOwner[_vaultOwner],
            "No vaults present for that address"
        );
        VaultDetails[] memory vaultDetails = vaults[_vaultOwner];
        return vaultDetails;
    }

    function getVaultOwner(
        address _vaultOwner
    ) external view returns (VaultOwner memory) {
        require(
            isVaultOwner[_vaultOwner],
            "No vaults present for that address"
        );

        return vaultOwners[_vaultOwner];
    }

    function getVaultOwners() external view returns (address[] memory) {
        return deployers;
    }
}
