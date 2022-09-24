// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./interfaces/IWETH.sol";
import "./interfaces/IChamber.sol";
import "./interfaces/ChamberLibrary.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract Chamber is IChamber, Initializable {
    address public factory;
    address private owner;
    address private operator;
    Status private status;
    uint256 private activeStrategies;
    mapping(address => uint256) private balances;
    mapping(bytes32 => Strategy) private strategies;
    Strategy[] private strategyList;

    IWETH public constant WETH =
        IWETH(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);

    modifier onlyOwner() {
        require(msg.sender == owner, "Restricted to Owner");
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "Restricted to Factory");
        _;
    }

    modifier isActive() {
        require(status == Status.ACTIVE, "Chamber is not active");
        _;
    }

    modifier onlyAuthorized() {
        require(
            (msg.sender == owner || msg.sender == operator),
            "Unauthorized"
        );
        _;
    }

    constructor() {
        _disableInitializers();
    }

    receive() external payable {
        emit Deposit(address(0), msg.value);
    }

    function initialize(
        address _factory,
        address _owner,
        address _operator
    ) external initializer {
        factory = _factory;
        owner = _owner;
        operator = _operator;
    }

    function setChamberStatus(uint8 _status) external onlyOwner {
        status = Status(_status);
    }

    function setOperator(address _operator) external onlyOwner {
        operator = _operator;
        emit NewOperator(_operator);
    }

    function deposit(address _asset, uint256 _amount) external override {
        require(
            IERC20(_asset).allowance(msg.sender, address(this)) >= _amount,
            "Insufficient allowance"
        );

        require(
            IERC20(_asset).transferFrom(msg.sender, address(this), _amount),
            "Insufficient balance"
        );

        balances[_asset] += _amount;

        emit Deposit(_asset, _amount);
    }

    function depositETH() external payable {
        emit Deposit(address(0), msg.value);
    }

    function withdraw(address _asset, uint256 _amount)
        external
        override
        onlyOwner
    {
        require(
            IERC20(_asset).balanceOf(address(this)) >= _amount,
            "Insufficient balance"
        );

        require(IERC20(_asset).transfer(owner, _amount));

        balances[_asset] -= _amount;
        emit Withdraw(_asset, _amount);
    }

    function withdrawETH(uint256 _amount)
        external
        override
        onlyOwner
        returns (bool)
    {
        require(address(this).balance >= _amount, "Insufficient balance");

        (bool success, bytes memory data) = owner.call{value: _amount}("");
        require(success, ChamberLibrary.getRevertMsg(data));

        emit Withdraw(address(0), _amount);

        return true;
    }

    function createStrategy(
        address _buyToken,
        address _sellToken,
        uint256 _amount,
        uint16 _frequency
    ) external override onlyOwner isActive returns (uint256) {
        require(
            (_buyToken != address(0) && _sellToken != address(0)),
            "Cannot buy or sell to Zero address"
        );
        require(
            balances[_sellToken] >= _amount,
            "Insufficient funds for Strategy"
        );

        bytes32 hashed = keccak256(
            abi.encodePacked(owner, _buyToken, _sellToken)
        );

        if (strategies[hashed].sellToken != address(0)) {
            revert("Strategy for that pair already exists");
        }

        Strategy memory strategy = Strategy({
            hashId: hashed,
            buyToken: _buyToken,
            sellToken: _sellToken,
            amount: _amount,
            swapCount: 0,
            lastSwap: 0,
            timestamp: block.timestamp,
            frequency: _frequency,
            status: StrategyStatus.ACTIVE
        });

        strategies[hashed] = strategy;
        strategyList.push(strategy);
        activeStrategies++;

        emit NewStrategy(hashed, _buyToken, _sellToken, _amount, _frequency);

        return activeStrategies;
    }

    function updateStrategy(Strategy memory _strategy) external onlyOwner {
        strategies[_strategy.hashId] = _strategy;
        emit UpdateStrategy(_strategy.hashId);
    }

    function deprecateStrategy(bytes32 _hash) external override onlyOwner {
        Strategy storage strategy = strategies[_hash];
        strategy.status = StrategyStatus.DEPRECATED;
        activeStrategies--;
        emit DeprecateStrategy(_hash);
    }

    function executeStrategy(
        bytes32 _hashId,
        address _spender,
        address payable _swapTarget,
        bytes calldata _swapCallData
    ) external onlyAuthorized isActive {
        Strategy memory strategy = strategies[_hashId];

        require(
            balances[strategy.sellToken] >= strategy.amount,
            "Insufficient Balance for strategy"
        );
        require(
            block.timestamp - strategy.lastSwap >= strategy.frequency,
            "Not ready to be executed"
        );

        bool success = _executeSwap(
            strategy.sellToken,
            strategy.buyToken,
            strategy.amount,
            _spender,
            _swapTarget,
            _swapCallData
        );

        require(success, "Failed to execute strategy");

        strategy.lastSwap = block.timestamp;
        strategy.swapCount += 1;
        strategies[_hashId] = strategy;

        emit ExecuteStrategy(_hashId);
    }

    function executeSwap(
        address _sellToken,
        address _buyToken,
        uint256 _amount,
        address _spender,
        address payable _swapTarget,
        bytes calldata _swapCallData
    ) external payable override onlyOwner {
        bool success = _executeSwap(
            _sellToken,
            _buyToken,
            _amount,
            _spender,
            _swapTarget,
            _swapCallData
        );

        require(success, "Failed to execute swap");
    }

    function _executeSwap(
        address _sellToken,
        address _buyToken,
        uint256 _amount,
        address _spender,
        address payable _swapTarget,
        bytes calldata _swapCallData
    ) internal returns (bool) {
        // Give `spender` an infinite allowance to spend this contract's `sellToken`
        if (IERC20(_sellToken).allowance(address(this), _spender) < _amount) {
            require(IERC20(_sellToken).approve(_spender, type(uint256).max));
        }

        // Execute swap using 0x Liquidity
        (bool success, bytes memory data) = _swapTarget.call{value: msg.value}(
            _swapCallData
        );

        require(success, ChamberLibrary.getRevertMsg(data));

        balances[_buyToken] = IERC20(_buyToken).balanceOf(address(this));
        balances[_sellToken] -= _amount;
        emit ExecuteSwap(_sellToken, _buyToken, _amount);

        return true;
    }

    function wrapETH(uint256 _amount) external onlyAuthorized {
        require(address(this).balance >= _amount);
        WETH.deposit{value: _amount}();
        balances[address(WETH)] = WETH.balanceOf(address(this));
    }

    function unwrapETH(uint256 _amount) external onlyAuthorized {
        require(balances[address(WETH)] >= _amount);
        WETH.withdraw(_amount);
        balances[address(WETH)] = WETH.balanceOf(address(this));
    }

    function getOwner() external view returns (address) {
        return owner;
    }

    function getOperator() external view returns (address) {
        return operator;
    }

    function getFactory() external view returns (address) {
        return factory;
    }

    function getStatus() external view returns (Status) {
        return status;
    }

    function getStrategy(bytes32 _hash)
        external
        view
        returns (Strategy memory)
    {
        Strategy memory strategy = strategies[_hash];

        require(strategy.buyToken != address(0), "Strategy not found");
        return strategy;
    }

    function getStrategies() external view returns (Strategy[] memory) {
        return strategyList;
    }

    function getActiveStrategies() external view returns (uint256) {
        return activeStrategies;
    }

    function balanceOf(address _asset)
        external
        view
        override
        returns (uint256)
    {
        if (_asset == ChamberLibrary.ETH) {
            return address(this).balance;
        }
        return balances[_asset];
    }
}
