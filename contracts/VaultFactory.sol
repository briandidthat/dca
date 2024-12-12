// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./Vault.sol";
import "./VaultStorage.sol";
import "./StorageFacility.sol";
import "./interfaces/IVault.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VaultFactory is Ownable {
    address private treasury;
    address private implementation;
    uint256 private instances;
    uint256 private fee = 0.01 ether;
    address[] private vaultOwners;

    StorageFacility private storageFacility;

    event FactoryLogger(address indexed instance, bytes32 data);
    event FeeChanged(uint256 previousFee, uint256 newFee);
    event NewVault(address indexed instance, address indexed owner);
    event TreasuryChange(address indexed treasury);

    constructor(address _treasury, address _storageFacility) {
        implementation = address(new Vault());
        treasury = _treasury;
        storageFacility = StorageFacility(_storageFacility);
    }

    function setFee(uint256 _newFee) external onlyOwner {
        emit FeeChanged(fee, _newFee);
        fee = _newFee;
    }

    function deployVault() external payable returns (address instance) {
        require(msg.value >= fee, "Must pay fee to deploy Vault");
        bool isVaultOwner = storageFacility.getIsVaultOwner(msg.sender);

        // create new vault storage for the new vault we'll be deploying
        VaultStorage vaultStorage = new VaultStorage(msg.sender, address(this));
        // deploy the new vault proxy contract
        address clone = Clones.clone(implementation);
        IVault(clone).initialize(
            address(this),
            msg.sender,
            msg.sender,
            address(vaultStorage)
        );

        // set the vault address in the vault storage contract
        vaultStorage.setVault(clone);

        // send fees back to treasury
        (bool success, bytes memory data) = treasury.call{value: msg.value}(
            "Vault fees"
        );

        require(success, VaultLibrary.getRevertMsg(data));

        emit NewVault(clone, msg.sender);

        instances++;
        if (!isVaultOwner) {
            vaultOwners.push(msg.sender);
        }

        storageFacility.storeVault(clone, msg.sender);
        instance = clone;
    }

    function setTreasury(address _newTreasury) external onlyOwner {
        treasury = _newTreasury;
        emit TreasuryChange(_newTreasury);
    }

    function getFee() external view returns (uint256) {
        return fee;
    }

    function getTreasury() external view returns (address) {
        return treasury;
    }

    function getStorageAddress() external view returns (address) {
        return address(storageFacility);
    }

    function getInstanceCount() external view returns (uint256) {
        return instances;
    }

    function getVaultOwnersCount() external view returns (uint256) {
        return vaultOwners.length;
    }

    function getUniqueVaultOwners()
        external
        view
        onlyOwner
        returns (address[] memory)
    {
        return vaultOwners;
    }

    function setNewStorageAddress(address _newStorage) external onlyOwner {
        require(_newStorage != address(0), "Storage cannot be zero address");
        storageFacility = StorageFacility(_newStorage);
        emit FactoryLogger(_newStorage, "Storage contract updated");
    }
}
