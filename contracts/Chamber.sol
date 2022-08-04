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
    address private owner;
    address public factory;
    mapping(address => uint256) balances;
    // mapping(uint256 => Strategy) strategies;
    Strategy[] private strategies;

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

    constructor() {
        _disableInitializers();
    }

    receive() external payable {
        emit Deposit(address(0), msg.value);
    }

    function initialize(address _factory, address _owner) external initializer {
        owner = _owner;
        factory = _factory;
    }

    function deposit(address _asset, uint256 _amount) external override {
        require(
            IERC20(_asset).allowance(msg.sender, address(this)) >= _amount,
            "Insufficient allowance"
        );

        require(
            IERC20(_asset).transferFrom(msg.sender, address(this), _amount)
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
        emit Withdraw(_asset, _amount);

        balances[_asset] -= _amount;
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

    function executeSwap(
        IERC20 _sellToken,
        IERC20 _buyToken,
        uint256 _amount,
        address _spender,
        address payable _swapTarget,
        bytes calldata _swapCallData
    ) external payable override {
        // Give `spender` an infinite allowance to spend this contract's `sellToken`
        if (_sellToken.allowance(address(this), _spender) < _amount) {
            require(_sellToken.approve(_spender, type(uint256).max));
        }

        uint256 balanceBefore = balances[address(_buyToken)];

        // Execute swap using 0x Liquidity
        (bool success, bytes memory data) = _swapTarget.call{value: msg.value}(
            _swapCallData
        );

        require(success, getRevertMsg(data));

        uint256 balanceAfter = _buyToken.balanceOf(address(this));

        balances[address(_sellToken)] -= _amount;
        balances[address(_buyToken)] += (balanceAfter - balanceBefore);

        emit ExecuteSwap(address(_sellToken), address(_buyToken), _amount);
    }

    function createStrategy(
        address _buyToken,
        address _sellToken,
        uint256 _amount,
        uint16 _frequency
    ) external onlyOwner override returns (uint256) {
        require(
            balances[_buyToken] <= _amount,
            "Insufficient funds for Strategy"
        );

        uint256 sid = strategies.length;

        Strategy memory strategy = Strategy({
            sid: sid,
            buyToken: _buyToken,
            sellToken: _sellToken,
            amount: _amount,
            timestamp: block.timestamp,
            frequency: _frequency,
            status: Status.TAKE
        });
        strategies.push(strategy);

        emit NewStrategy(sid, _buyToken, _sellToken, _amount, _frequency);

        return sid;
    }

    function getOwner() external view override returns (address) {
        return owner;
    }

    function getFactory() external view override returns (address) {
        return factory;
    }

    function getStrategies() external view returns (Strategy[] memory) {
        return strategies;
    }

    function balanceOf(address _asset)
        external
        view
        override
        returns (uint256)
    {
        return balances[_asset];
    }

    function getRevertMsg(bytes memory _returnData)
        internal
        pure
        returns (string memory)
    {
        if (_returnData.length < 68) return "Transaction reverted silently";

        assembly {
            _returnData := add(_returnData, 0x04)
        }

        return abi.decode(_returnData, (string));
    }
}
