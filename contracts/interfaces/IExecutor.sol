// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

interface IExecutor {
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

    function getStrategies() external view returns (Strategy[] memory);

    function getActiveStrategies() external view returns (Strategy[] memory);

    function getStrategy(bytes32 hash) external view returns (Strategy memory);

    function updateStrategy(Strategy memory strategy) external;

    function deprecateStrategy(bytes32 hashId) external;

    function reactivateStrategy(bytes32 hashId) external;

    function deleteStrategy(bytes32 hashId) external;

    function createStrategy(
        bytes32 hashId,
        address buyToken,
        address sellToken,
        uint256 amount,
        uint16 frequency
    ) external returns (bytes32);

    event NewStrategy(
        bytes32 indexed hashId,
        address indexed buyToken,
        address indexed sellToken,
        uint256 amount,
        uint16 frequency
    );
    
    event UpdateStrategy(bytes32 indexed hashId);
    event DeprecateStrategy(bytes32 indexed hashId);
    event DeleteStrategy(bytes32 indexed hashId);
    event ReactivateStrategy(bytes32 indexed hashId);
}
