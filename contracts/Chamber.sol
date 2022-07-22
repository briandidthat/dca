// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;

import "./interfaces/ICETH.sol";
import "./interfaces/IChamber.sol";
import "./interfaces/ICompoundManager.sol";
import "./interfaces/IUniswapExchange.sol";
import "./interfaces/TokenLibrary.sol";
import "./interfaces/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Chamber is IChamber, Initializable {
    address public owner;
    address public factory;
    ICompoundManager internal compoundManager;
    IUniswapExchange internal uniswapExchange;

    mapping(address => uint256) balances;

    modifier onlyOwner() {
        require(msg.sender == owner, "Restricted to Owner");
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "Restricted to Factory");
        _;
    }

    constructor() {
        factory = msg.sender;
    }

    function initialize(
        address _owner,
        address _compoundManager,
        address _uniswapExchange
    ) external override initializer {
        owner = _owner;
        compoundManager = ICompoundManager(_compoundManager);
        uniswapExchange = IUniswapExchange(_uniswapExchange);
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

        require(IERC20(_asset).transferFrom(address(this), owner, _amount));

        balances[_asset] -= _amount;

        emit Withdraw(_asset, _amount);
    }

    function supplyETH() external payable override {
        require(
            compoundManager.supplyETH{value: msg.value, gas: 250000}(msg.sender)
        );

        balances[TokenLibrary.cETH] += msg.value;

        emit Supply(address(0), msg.value);
    }

    function redeemETH(uint256 _amount) external override onlyOwner {
        require(balances[TokenLibrary.cETH] >= _amount);
        require(compoundManager.redeemETH(_amount, msg.sender));

        emit Redeem(TokenLibrary.cETH, _amount);
    }

    function buyETH(address _asset, uint _amount) external override onlyOwner {
        require(
            IERC20(_asset).balanceOf(address(this)) >= _amount,
            "Please deposit stablecoins"
        );
        require(
            IERC20(_asset).allowance(owner, address(this)) >= _amount,
            "Insufficient allowance"
        );

        uint amountOut = uniswapExchange.swapForWETH(_amount, _asset);

        emit ExecuteSwap(TokenLibrary.WETH, amountOut);
    }

    function getOwner() external view override returns (address) {
        return owner;
    }

    function getFactory() external view override returns (address) {
        return factory;
    }

    receive() external payable {
        emit Deposit(address(0), msg.value);
    }
}
