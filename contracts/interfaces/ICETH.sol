// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;

interface ICETH {
    function mint() external payable;

    function exchangeRateCurrent() external returns (uint256);

    function supplyRatePerBlock() external returns (uint256);

    function redeem(uint) external returns (uint);

    function redeemUnderlying(uint) external returns (uint);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address dst, uint amount) external returns (bool);

}