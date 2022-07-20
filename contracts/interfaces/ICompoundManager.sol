// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;

interface ICompoundManager {
    event Logger(string message, address caller, uint256 amount);
    event Supply(address indexed owner, address indexed asset, uint256 amount);
    event Redeem(address indexed owner, address indexed asset, uint256 amount);

    function supplyETH(address owner) external payable returns (bool);

    function redeemETH(uint256 amount, address owner) external returns (bool);

    function supplyStablecoin(
        address underlying,
        uint256 amount,
        address owner
    ) external returns (uint256);

    function redeemStablecoin(
        address _cToken,
        uint256 _amount,
        address _owner
    ) external;
}
