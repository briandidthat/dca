// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;
pragma abicoder v2;

import "./Chamber.sol";
import "./interfaces/IChamber.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ChamberFactory is Ownable {
    address public implementation;
    address public compoundManager;
    address public uniswapExchange;
    uint256 private instances;
    mapping(address => ChamberDetails) private chambers;
    mapping(address => bool) hasChamber;

    event ChamberLogger(address indexed instance, bytes32 data);
    event NewChamber(address indexed instance, address indexed owner);

    struct ChamberDetails {
        address instance;
        address owner;
        uint256 timestamp;
    }

    constructor(address _uniswapExchange) {
        implementation = address(new Chamber());
        uniswapExchange = _uniswapExchange;
    }

    function deployChamber() external returns (address instance) {
        if (hasChamber[msg.sender]) {
            address chmbrAddr = chambers[msg.sender].instance;
            emit ChamberLogger(chmbrAddr, "Has existing chamber");
            return chmbrAddr;
        }

        address clone = Clones.clone(implementation);
        IChamber(clone).initialize(address(this), msg.sender, uniswapExchange);

        emit NewChamber(clone, msg.sender);

        ChamberDetails memory chamber = ChamberDetails({
            instance: clone,
            owner: msg.sender,
            timestamp: block.timestamp
        });

        instances++;
        hasChamber[msg.sender] = true;
        chambers[msg.sender] = chamber;

        emit ChamberLogger(address(this), "State has been updated");
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

    function getInstanceCount() external view returns (uint count) {
        count = instances;
    }
}
