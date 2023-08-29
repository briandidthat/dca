// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./interfaces/ChamberLibrary.sol";
import "./interfaces/IStorageFacility.sol";

contract StorageFacility is IStorageFacility {
    address private admin;
    address private factory;

    event Logger(address indexed currentCaller, bytes32 data);

    mapping(address => ChamberLibrary.ChamberOwner) chamberOwners;
    mapping(address => ChamberLibrary.ChamberDetails[]) private chambers;

    modifier onlyAdmin() {
        require(
            msg.sender == admin,
            "This operation can only be called by an admin"
        );
        _;
    }

    modifier onlyFactory() {
        require(
            msg.sender == factory,
            "This operation can only be called by the factory contract"
        );
        _;
    }

    constructor(address _admin, address _factory) {
        admin = _admin;
        factory = _factory;
    }

    function getChamberOwner(
        address _owner
    ) external view override returns (ChamberLibrary.ChamberOwner memory) {
        ChamberLibrary.ChamberOwner memory owner = chamberOwners[_owner];
        require(
            owner.owner != address(0),
            "No chambers present for that address"
        );
        return chamberOwners[_owner];
    }

    function getChambers(
        address _owner
    ) external view override returns (ChamberLibrary.ChamberDetails[] memory) {
        ChamberLibrary.ChamberDetails[] memory chamberDetails = chambers[
            _owner
        ];
        require(
            chamberDetails.length > 0,
            "No chambers present for that address"
        );
        return chamberDetails;
    }

    function storeChamber(
        address _instance,
        address _owner
    ) external override onlyFactory {
        ChamberLibrary.ChamberOwner memory owner = chamberOwners[_owner];
        // store the owner if it is a first time user
        if (owner.owner == address(0)) {
            owner.owner = _owner;
            emit Logger(_owner, "Storing new owner");
        }

        ChamberLibrary.ChamberDetails memory chamber = ChamberLibrary
            .ChamberDetails({
                instance: _instance,
                owner: _owner,
                timestamp: block.timestamp
            });

        // increment the amount of chambers the owner has
        owner.count += 1;
        // add the chamber details to the owners array
        chambers[_owner].push(chamber);
        // update the current owner struct in the mapping
        chamberOwners[_owner] = owner;
        emit Logger(_instance, "Stored new chamber");
    }
}
