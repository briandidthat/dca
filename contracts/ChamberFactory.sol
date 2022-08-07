// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./Chamber.sol";
import "./interfaces/IChamber.sol";
import "./interfaces/TokenLibrary.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ChamberFactory is Ownable {
    address public implementation;
    uint256 private instances;
    uint256 private fee = 0.05 ether;
    mapping(address => ChamberDetails) private chambers;
    mapping(address => bool) private hasChamber;

    event FactoryLogger(address indexed instance, bytes32 data);
    event FeeChanged(uint256 previousFee, uint256 newFee);
    event NewChamber(address indexed instance, address indexed owner);

    struct ChamberDetails {
        address instance;
        address owner;
        uint256 timestamp;
    }

    constructor() {
        implementation = address(new Chamber());
    }

    function deployChamber() external payable returns (address instance) {
        require(msg.value >= fee, "Must pay fee to deploy chamber");

        if (hasChamber[msg.sender]) {
            address existing = chambers[msg.sender].instance;
            emit FactoryLogger(existing, "User already has a chamber");
            return existing;
        }

        address clone = Clones.clone(implementation);
        IChamber(clone).initialize(address(this), msg.sender);

        emit NewChamber(clone, msg.sender);
        // send fees back to owner
        (bool success, bytes memory data) = owner().call{value: msg.value}("");

        require(success, TokenLibrary.getRevertMsg(data));

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

    function setFee(uint256 _newFee) external onlyOwner {
        emit FeeChanged(fee, _newFee);
        fee = _newFee;
    }

    function getChamber(address _beneficiary)
        external
        view
        returns (ChamberDetails memory chamber)
    {
        require(hasChamber[_beneficiary], "No chamber for that address");
        return chambers[_beneficiary];
    }

    function getInstanceCount() external view returns (uint256) {
        return instances;
    }

    function getFee() external view returns (uint256) {
        return fee;
    }
}
