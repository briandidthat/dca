// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./interfaces/IWETH.sol";
import "./interfaces/ICETH.sol";
import "./interfaces/ICERC20.sol";
import "./interfaces/IChamber.sol";
import "./interfaces/TokenLibrary.sol";
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

    ICETH public constant cETH =
        ICETH(0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5);

    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

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

    function setChamberStatus(Status _status) external onlyOwner {
        status = _status;
    }

    function setOperator(address _operator) external onlyOwner {
        operator = _operator;
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

        (bool success, ) = owner.call{value: _amount}("");
        require(success, "Failed to transfer ETH");

        emit Withdraw(address(0), _amount);

        return true;
    }

    function supplyETH(uint256 _amount) external override {
        require(address(this).balance >= _amount, "Please deposit ether");
        cETH.mint{value: _amount}();

        emit Supply(address(0), _amount);
    }

    function redeemETH(uint256 _amount) external override onlyOwner {
        require(
            cETH.balanceOf(address(this)) >= _amount,
            "Insufficient balance"
        );

        require(cETH.redeem(_amount) == 0, "Failed to Redeem");

        emit Redeem(address(cETH), _amount);
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

        uint256 sid = strategyList.length;
        bytes32 hashed = keccak256(
            abi.encodePacked(owner, _buyToken, _sellToken)
        );

        if (strategies[hashed].sellToken != address(0)) {
            revert("Strategy for that pair already exists");
        }

        Strategy memory strategy = Strategy({
            sid: sid,
            hashId: hashed,
            buyToken: _buyToken,
            sellToken: _sellToken,
            amount: _amount,
            lastSwap: 0,
            timestamp: block.timestamp,
            frequency: _frequency,
            status: StrategyStatus.TAKE
        });

        strategyList.push(strategy);
        strategies[hashed] = strategy;
        activeStrategies++;

        emit NewStrategy(sid, _buyToken, _sellToken, _amount, _frequency);

        return sid;
    }

    function executeStrategy(
        bytes32 _hashId,
        address _spender,
        address payable _swapTarget,
        bytes calldata _swapCallData
    ) external onlyAuthorized isActive {
        Strategy storage strategy = strategies[_hashId];

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
        strategies[_hashId] = strategy;
    }

    function deprecateStrategy(bytes32 _hash) external override onlyOwner {
        Strategy storage strategy = strategies[_hash];
        strategy.status = StrategyStatus.DEACTIVATED;
        activeStrategies--;
        emit TerminateStrategy(_hash);
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

        uint256 balanceBefore = balances[_buyToken];
        // Execute swap using 0x Liquidity
        (bool success, bytes memory data) = _swapTarget.call{value: msg.value}(
            _swapCallData
        );

        require(success, TokenLibrary.getRevertMsg(data));

        uint256 balanceAfter = IERC20(_buyToken).balanceOf(address(this));

        balances[_sellToken] -= _amount;
        balances[_buyToken] += (balanceAfter - balanceBefore);

        emit ExecuteSwap(_sellToken, _buyToken, _amount);

        return true;
    }

    function getOwner() external view returns (address) {
        return owner;
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

    function balanceOf(address _asset)
        external
        view
        override
        returns (uint256)
    {
        return balances[_asset];
    }
}
