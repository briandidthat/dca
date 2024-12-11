// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./interfaces/IVault.sol";

contract VaultStorage {
    address private owner;
    address private vault;
    address private factory;
    uint256 private activeStrategies;
    bool private initialized;
    mapping(bytes32 => IVault.Strategy) private strategies;
    bytes32[] private strategyHashes;

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
        initialized = true;
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
            strategies[_hashId].sellToken == address(0),
            "Strategy with that name already exists"
        );

        uint256 index = 0;
        if (strategyHashes.length != 0) {
            index = strategyHashes.length - 1;
        }

        IVault.Strategy memory strategy = IVault.Strategy({
            idx: index,
            hashId: _hashId,
            buyToken: _buyToken,
            sellToken: _sellToken,
            amount: _amount,
            swapCount: 0,
            lastSwap: 0,
            timestamp: block.timestamp,
            frequency: _frequency,
            status: IVault.StrategyStatus.ACTIVE
        });

        strategies[_hashId] = strategy;
        strategyHashes.push(_hashId);
        activeStrategies++;

        return _hashId;
    }

    function updateStrategy(
        IVault.Strategy memory _strategy
    ) external isInitialized onlyVault {
        strategies[_strategy.hashId] = _strategy;
    }

    function deprecateStrategy(bytes32 _hash) external isInitialized onlyVault {
        IVault.Strategy storage strategy = strategies[_hash];
        strategy.status = IVault.StrategyStatus.DEPRECATED;
        activeStrategies--;
    }

    function reactivateStrategy(
        bytes32 _hash
    ) external isInitialized onlyVault {
        IVault.Strategy storage strategy = strategies[_hash];
        strategy.status = IVault.StrategyStatus.ACTIVE;
        activeStrategies++;
    }

    function deleteStrategy(bytes32 _hash) external isInitialized onlyVault {
        IVault.Strategy memory strategy = strategies[_hash];
        if (strategy.status == IVault.StrategyStatus.ACTIVE) {
            activeStrategies--;
        }

        delete strategies[_hash];
        strategyHashes[strategy.idx] = strategyHashes[
            strategyHashes.length - 1
        ];
        strategyHashes.pop();
    }

    function getStrategy(
        bytes32 _hash
    ) external view isInitialized onlyVault returns (IVault.Strategy memory) {
        IVault.Strategy memory strategy = strategies[_hash];

        require(strategy.buyToken != address(0), "Strategy not found");
        return strategy;
    }

    function getStrategies()
        external
        view
        isInitialized
        onlyVault
        returns (IVault.Strategy[] memory)
    {
        uint256 length = strategyHashes.length;
        IVault.Strategy[] memory strats = new IVault.Strategy[](length);

        for (uint256 i = 0; i < length; i++) {
            strats[i] = strategies[strategyHashes[i]];
        }

        return strats;
    }

    function getActiveStrategies()
        external
        view
        isInitialized
        onlyVault
        returns (IVault.Strategy[] memory)
    {
        uint256 length = strategyHashes.length;
        IVault.Strategy[] memory active = new IVault.Strategy[](
            activeStrategies
        );

        uint256 count = 0;
        for (uint256 i = 0; i < length; i++) {
            IVault.Strategy memory strategy = strategies[strategyHashes[i]];
            if (strategy.status == IVault.StrategyStatus.ACTIVE) {
                active[count] = strategy;
                count++;
            }
        }

        return active;
    }
}
