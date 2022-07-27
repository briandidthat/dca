// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;
pragma abicoder v2;

interface IChamber {
    enum Strategy {
        TAKE,
        COMPOUND
    }

    event Supply(address indexed asset, uint256 amount);
    event Deposit(address indexed asset, uint256 amount);
    event Withdraw(address indexed asset, uint256 amount);
    event Redeem(address indexed cToken, uint256 amount);
    event ExecuteSwap(address indexed asset, uint256 amount);

    function getOwner() external view returns (address);

    function getFactory() external view returns (address);

    function supplyETH(uint256 amount) external;

    function redeemETH(uint256 amount) external;

    function buyETH(address asset, uint256 amount) external returns (uint256);

    function deposit(address asset, uint256 amount) external;

    function withdraw(address asset, uint256 amount) external;

    function withdrawETH(uint256 amount) external returns (bool);

    function balanceOf(address asset) external view returns (uint);

    function initialize(address owner, address _uniswapExchange) external;
}
