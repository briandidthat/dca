// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./Chamber.sol";
import "./interfaces/IChamber.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ChamberFactory is Ownable {
    address public implementation;
    uint256 private instances;
    mapping(address => ChamberDetails) private chambers;
    mapping(address => bool) private hasChamber;

    event FactoryLogger(address indexed instance, bytes32 data);
    event NewChamber(address indexed instance, address indexed owner);

    struct ChamberDetails {
        address instance;
        address owner;
        uint256 timestamp;
    }

    constructor() {
        implementation = address(new Chamber());
    }

    function deployChamber() external returns (address instance) {
        if (hasChamber[msg.sender]) {
            address existing = chambers[msg.sender].instance;
            emit FactoryLogger(existing, "User already has a chamber");
            return existing;
        }

        address clone = Clones.clone(implementation);
        IChamber(clone).initialize(address(this), msg.sender);

        emit NewChamber(clone, msg.sender);

        ChamberDetails memory chamber = ChamberDetails({
            instance: clone,
            owner: msg.sender,
            timestamp: block.timestamp
        });

        instances++;
        hasChamber[msg.sender] = true;
        chambers[msg.sender] = chamber;

        emit FactoryLogger(address(this), "State has been updated");
        instance = clone;
    }

    function getChamber(address _beneficiary)
        external
        view
        returns (ChamberDetails memory chamber)
    {
        require(hasChamber[_beneficiary], "No chamber for that address");
        return chambers[_beneficiary];
    }

    function getInstanceCount() external view returns (uint256 count) {
        count = instances;
    }
}
