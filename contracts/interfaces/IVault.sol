// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./IExecutor.sol";

interface IVault is IExecutor {
    enum Status {
        ACTIVE,
        FROZEN,
        DEPRECATED
    }

    function setVaultStatus(uint8) external;

    function setOperator(address) external;

    function deposit(address asset, uint256 amount) external;

    function depositETH() external payable;

    function wrapETH(uint256 amount) external;

    function unwrapETH(uint256 amount) external;

    function withdraw(address asset, uint256 amount) external;

    function withdrawETH(uint256 amount) external returns (bool);

    function balanceOf(address asset) external view returns (uint256);

    function getOwner() external view returns (address);

    function getFactory() external view returns (address);

    function getOperator() external view returns (address);

    function getStatus() external view returns (Status);

    function initialize(
        address factory,
        address owner,
        address operator,
        address vaultStorage
    ) external;

    function executeSwap(
        address sellToken,
        address buyToken,
        uint256 amount,
        address spender,
        address payable swapTarget,
        bytes calldata swapCallData
    ) external payable;

    function executeStrategy(
        bytes32 hashId,
        address spender,
        address payable swapTarget,
        bytes calldata swapCallData
    ) external;

    event NewOperator(address indexed operator);
    event Deposit(address indexed asset, uint256 amount);
    event Withdraw(address indexed asset, uint256 amount);
    event ExecuteSwap(
        address indexed sellToken,
        address indexed buyToken,
        uint256 amount,
        bytes data
    );
    event ExecuteStrategy(bytes32 indexed hashId);
}
