// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./Vault.sol";
import "./StorageFacility.sol";
import "./interfaces/IVault.sol";
import "./interfaces/VaultLibrary.sol";
import "./interfaces/IStorageFacility.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VaultFactory is Ownable {
    address private treasury;
    address private implementation;
    uint256 private instances;
    uint256 private fee = 0.05 ether;
    address[] private deployers;

    mapping(address => bool) private hasVault;

    IStorageFacility private storageFacility;

    event FactoryLogger(address indexed instance, bytes32 data);
    event FeeChanged(uint256 previousFee, uint256 newFee);
    event NewVault(address indexed instance, address indexed owner);
    event TreasuryChange(address indexed treasury);

    constructor(address _treasury, address _storageFacility) {
        implementation = address(new Vault());
        treasury = _treasury;
        storageFacility = IStorageFacility(_storageFacility);
    }

    function setFee(uint256 _newFee) external onlyOwner {
        emit FeeChanged(fee, _newFee);
        fee = _newFee;
    }

    function deployVault() external payable returns (address instance) {
        require(msg.value >= fee, "Must pay fee to deploy Vault");
        bool ownsVault = hasVault[msg.sender];

        address clone = Clones.clone(implementation);
        IVault(clone).initialize(address(this), msg.sender, msg.sender);

        emit NewVault(clone, msg.sender);
        // send fees back to treasury
        (bool success, bytes memory data) = treasury.call{value: msg.value}(
            "Vault fees"
        );

        require(success, VaultLibrary.getRevertMsg(data));

        instances++;
        if (!ownsVault) {
            hasVault[msg.sender] = true;
            deployers.push(msg.sender);
        }

        storageFacility.storeVault(clone, msg.sender);

        emit FactoryLogger(address(this), "State has been updated");
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

    function getUniqueDeployersCount() external view returns (uint256) {
        return deployers.length;
    }

    function getUniqueDeployers()
        external
        view
        onlyOwner
        returns (address[] memory)
    {
        return deployers;
    }

    function setNewStorageAddress(address _newStorage) external onlyOwner {
        storageFacility = IStorageFacility(_newStorage);
        emit FactoryLogger(
            address(storageFacility),
            "Storage contract updated"
        );
    }
}
