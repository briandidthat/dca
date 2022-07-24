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

    event NewChamber(address indexed instance, address indexed owner);

    struct ChamberDetails {
        address instance;
        address owner;
        bool initialized;
        uint256 timestamp;
    }

    constructor(address _compoundManager, address _uniswapExchange) {
        implementation = address(new Chamber());
        compoundManager = _compoundManager;
        uniswapExchange = _uniswapExchange;
    }

    function deployChamber() external returns (address instance) {
        require(
            chambers[msg.sender].initialized != true,
            "User already has a chamber"
        );
        address clone = Clones.clone(implementation);
        IChamber(clone).initialize(
            msg.sender,
            compoundManager,
            uniswapExchange
        );

        emit NewChamber(clone, msg.sender);

        ChamberDetails memory chamber = ChamberDetails({
            instance: clone,
            owner: msg.sender,
            initialized: true,
            timestamp: block.timestamp
        });

        chambers[msg.sender] = chamber;
        instances++;
        instance = clone;
    }

    function getChamber(address _beneficiary)
        external
        view
        returns (ChamberDetails memory chamber)
    {
        return chambers[_beneficiary];
    }

    function getInstanceCount() external view returns (uint count) {
        count = instances;
    }
}
