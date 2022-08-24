// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IChamber {
    enum Status {
        ACTIVE,
        FROZEN,
        DEPRECATED
    }
    enum StrategyStatus {
        DEACTIVATED,
        TAKE,
        COMPOUND
    }

    struct Strategy {
        uint256 sid;
        bytes32 hashId;
        address buyToken;
        address sellToken;
        uint16 frequency;
        uint256 amount;
        uint256 timestamp;
        uint256 lastSwap;
        StrategyStatus status;
    }

    event Supply(address indexed asset, uint256 amount);
    event Deposit(address indexed asset, uint256 amount);
    event Withdraw(address indexed asset, uint256 amount);
    event Redeem(address indexed cToken, uint256 amount);
    event ExecuteSwap(
        address indexed sellToken,
        address indexed buyToken,
        uint256 amount
    );
    event NewStrategy(
        uint256 indexed sid,
        address indexed buyToken,
        address indexed sellToken,
        uint256 amount,
        uint16 frequency
    );

    event TerminateStrategy(bytes32 indexed hashId);
    event NewOperator(address indexed operator);

    function setChamberStatus(Status status) external;

    function supplyETH(uint256 amount) external;

    function redeemETH(uint256 amount) external;

    function deposit(address asset, uint256 amount) external;

    function withdraw(address asset, uint256 amount) external;

    function withdrawETH(uint256 amount) external returns (bool);

    function balanceOf(address asset) external view returns (uint256);

    function getOwner() external view returns (address);

    function getFactory() external view returns (address);

    function getStatus() external view returns (Status);

    function getStrategies() external view returns (Strategy[] memory);

    function getStrategy(bytes32 hash) external view returns (Strategy memory);

    function initialize(
        address factory,
        address owner,
        address operator
    ) external;

    function executeSwap(
        address sellToken,
        address buyToken,
        uint256 amount,
        address spender,
        address payable swapTarget,
        bytes calldata swapCallData
    ) external payable;

    function createStrategy(
        address buyToken,
        address sellToken,
        uint256 amount,
        uint16 frequency
    ) external returns (uint256);

    function executeStrategy(
        bytes32 hashId,
        address spender,
        address payable swapTarget,
        bytes calldata swapCallData
    ) external;

    function deprecateStrategy(bytes32 hashId) external;
}
