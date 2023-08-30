// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IVault {
    enum Status {
        ACTIVE,
        FROZEN,
        DEPRECATED
    }

    enum StrategyStatus {
        ACTIVE,
        DEPRECATED
    }

    struct Strategy {
        uint16 frequency;
        bytes32 hashId;
        address buyToken;
        address sellToken;
        uint256 idx;
        uint256 amount;
        uint256 timestamp;
        uint256 swapCount;
        uint256 lastSwap;
        StrategyStatus status;
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

    function getStrategies() external view returns (Strategy[] memory);

    function getActiveStrategies() external view returns (Strategy[] memory);

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
        bytes32 hashId,
        address buyToken,
        address sellToken,
        uint256 amount,
        uint16 frequency
    ) external returns (bytes32);

    function updateStrategy(Strategy memory strategy) external;

    function executeStrategy(
        bytes32 hashId,
        address spender,
        address payable swapTarget,
        bytes calldata swapCallData
    ) external;

    function deprecateStrategy(bytes32 hashId) external;

    function reactivateStrategy(bytes32 hashId) external;

    function deleteStrategy(bytes32 hashId) external;

    event NewOperator(address indexed operator);
    event Deposit(address indexed asset, uint256 amount);
    event Withdraw(address indexed asset, uint256 amount);
    event UpdateStrategy(bytes32 indexed hashId);
    event DeprecateStrategy(bytes32 indexed hashId);
    event DeleteStrategy(bytes32 indexed hashId);
    event ReactivateStrategy(bytes32 indexed hashId);
    event ExecuteSwap(
        address indexed sellToken,
        address indexed buyToken,
        uint256 amount,
        bytes data
    );
    event NewStrategy(
        bytes32 indexed hashId,
        address indexed buyToken,
        address indexed sellToken,
        uint256 amount,
        uint16 frequency
    );

    event ExecuteStrategy(bytes32 indexed hashId);
}
