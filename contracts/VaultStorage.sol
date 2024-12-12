// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./interfaces/IExecutor.sol";

contract VaultStorage is IExecutor {
    bool private initialized;
    address private owner;
    address private vault;
    address private factory;
    uint256 private activeStrategies;
    mapping(bytes32 => Strategy) private strategyMapping;
    bytes32[] private strategyHashes;
    Strategy[] private strategies;

    modifier isInitialized() {
        require(initialized, "Contract not initialized");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Restricted to owner");
        _;
    }

    modifier onlyVault() {
        require(msg.sender == vault, "Restricted to vault");
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "Restricted to factory");
        _;
    }

    constructor(address _owner, address _factory) {
        owner = _owner;
        factory = _factory;
    }

    function setVault(address _vault) external onlyFactory {
        vault = _vault;
        if (!initialized) {
            initialized = true;
        }
    }

    function createStrategy(
        bytes32 _hashId,
        address _buyToken,
        address _sellToken,
        uint256 _amount,
        uint16 _frequency
    ) external isInitialized onlyVault returns (bytes32) {
        require(vault != address(0), "Vault not set");
        require(
            strategyMapping[_hashId].sellToken == address(0),
            "Strategy with that name already exists"
        );

        uint256 index = 0;
        if (strategyHashes.length != 0) {
            index = strategyHashes.length - 1;
        }

        Strategy memory strategy = Strategy({
            idx: index,
            hashId: _hashId,
            buyToken: _buyToken,
            sellToken: _sellToken,
            amount: _amount,
            swapCount: 0,
            lastSwap: 0,
            timestamp: block.timestamp,
            frequency: _frequency,
            status: StrategyStatus.ACTIVE
        });

        strategyMapping[_hashId] = strategy;
        strategyHashes.push(_hashId);
        activeStrategies++;
        strategies.push(strategy);

        return _hashId;
    }

    function updateStrategy(
        Strategy memory _strategy
    ) external isInitialized onlyVault {
        strategyMapping[_strategy.hashId] = _strategy;
    }

    function deprecateStrategy(bytes32 _hash) external isInitialized onlyVault {
        Strategy storage strategy = strategyMapping[_hash];
        strategy.status = StrategyStatus.DEPRECATED;
        activeStrategies--;
    }

    function reactivateStrategy(
        bytes32 _hash
    ) external isInitialized onlyVault {
        Strategy storage strategy = strategyMapping[_hash];
        strategy.status = StrategyStatus.ACTIVE;
        activeStrategies++;
    }

    function deleteStrategy(bytes32 _hash) external isInitialized onlyVault {
        Strategy memory strategy = strategyMapping[_hash];
        if (strategy.status == StrategyStatus.ACTIVE) {
            activeStrategies--;
        }

        delete strategyMapping[_hash];
        strategyHashes[strategy.idx] = strategyHashes[
            strategyHashes.length - 1
        ];
        strategyHashes.pop();
    }

    function getStrategy(
        bytes32 _hash
    ) external view isInitialized onlyVault returns (Strategy memory) {
        Strategy memory strategy = strategyMapping[_hash];

        require(strategy.buyToken != address(0), "Strategy not found");
        return strategy;
    }

    function getStrategies()
        external
        view
        isInitialized
        onlyVault
        returns (Strategy[] memory)
    {
        return strategies;
    }

    function getActiveStrategies()
        external
        view
        isInitialized
        onlyVault
        returns (Strategy[] memory)
    {
        uint256 length = strategyHashes.length;
        Strategy[] memory active = new Strategy[](activeStrategies);

        uint256 count = 0;
        for (uint256 i = 0; i < length; i++) {
            Strategy memory strategy = strategyMapping[strategyHashes[i]];
            if (strategy.status == StrategyStatus.ACTIVE) {
                active[count] = strategy;
                count++;
            }
        }

        return active;
    }
}
