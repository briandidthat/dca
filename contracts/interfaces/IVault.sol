//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.15;

interface IVault {
    function deposit(uint256 amount) external;

    function withdraw(uint256 amount) external;

    function newStrategy(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint8 frequency
    ) external;

    function executeStrategy(
        address tokenOut,
        address tokenIn,
        uint256 amount
    ) external;

    function deprecate() external;

    event Deposit(address indexed from, address indexed token, uint256 amount);
    event Withdrawal(address indexed to, address indexed token, uint256 amount);
    event NewStrategy(
        address indexed tokenIn,
        address indexed tokenOut,
        uint8 frequency
    );
}
