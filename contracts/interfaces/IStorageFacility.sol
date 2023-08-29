// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "../Chamber.sol";
import "./ChamberLibrary.sol";

interface IStorageFacility {

    function storeChamber(address _instance, address _owner) external;

    function getChamberOwner(
        address _owner
    ) external view returns (ChamberLibrary.ChamberOwner memory);

    function getChambers(
        address _owner
    ) external view returns (ChamberLibrary.ChamberDetails[] memory);
}
