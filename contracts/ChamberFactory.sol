// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./Chamber.sol";
import "./interfaces/IChamber.sol";
import "./interfaces/ChamberLibrary.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ChamberFactory is Ownable {
    address private treasury;
    address private implementation;
    uint256 private instances;
    uint256 private fee = 0.05 ether;
    address[] private deployers;
    mapping(address => ChamberOwner) chamberOwners;
    mapping(address => ChamberDetails[]) private chambers;
    mapping(address => bool) private hasChamber;

    event FactoryLogger(address indexed instance, bytes32 data);
    event FeeChanged(uint256 previousFee, uint256 newFee);
    event NewChamber(address indexed instance, address indexed owner);
    event TreasuryChange(address indexed treasury);

    struct ChamberOwner {
        address owner;
        bytes32 username;
        uint8 limit;
        uint8 count;
    }

    struct ChamberDetails {
        address instance;
        address owner;
        uint256 timestamp;
    }

    constructor(address _treasury) {
        implementation = address(new Chamber());
        treasury = _treasury;
    }

    function setFee(uint256 _newFee) external onlyOwner {
        emit FeeChanged(fee, _newFee);
        fee = _newFee;
    }

    function deployChamber() external payable returns (address instance) {
        require(msg.value >= fee, "Must pay fee to deploy chamber");
        bool ownsChamber = hasChamber[msg.sender];

        if (ownsChamber) {
            require(
                chambers[msg.sender].length < 5,
                "You have reached max chamber amount"
            );
        }

        address clone = Clones.clone(implementation);
        IChamber(clone).initialize(address(this), msg.sender, msg.sender);

        emit NewChamber(clone, msg.sender);
        // send fees back to treasury
        (bool success, bytes memory data) = treasury.call{value: msg.value}("");

        require(success, ChamberLibrary.getRevertMsg(data));

        ChamberDetails memory chamber = ChamberDetails({
            instance: clone,
            owner: msg.sender,
            timestamp: block.timestamp
        });

        instances++;
        if (!ownsChamber) {
            hasChamber[msg.sender] = true;
            deployers.push(msg.sender);
        }

        chambers[msg.sender].push(chamber);

        emit FactoryLogger(address(this), "State has been updated");
        instance = clone;
    }

    function setTreasury(address _newTreasury) external onlyOwner {
        treasury = _newTreasury;
        emit TreasuryChange(_newTreasury);
    }

    function getChambers(address _beneficiary)
        external
        view
        returns (ChamberDetails[] memory)
    {
        require(
            hasChamber[_beneficiary],
            "No chambers present for that address"
        );
        return chambers[_beneficiary];
    }

    function getFee() external view returns (uint256) {
        return fee;
    }

    function getTreasury() external view returns (address) {
        return treasury;
    }

    function getInstanceCount() external view returns (uint256) {
        return instances;
    }
}
