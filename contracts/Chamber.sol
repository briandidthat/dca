// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;

import "./interfaces/IWETH.sol";
import "./interfaces/ICETH.sol";
import "./interfaces/IChamber.sol";
import "./interfaces/ICompoundManager.sol";
import "./interfaces/IUniswapExchange.sol";
import "./interfaces/TokenLibrary.sol";
import "./interfaces/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Chamber is IChamber, Initializable {
    address private owner;
    address public factory;
    ICompoundManager internal compoundManager;
    IUniswapExchange internal uniswapExchange;
    mapping(address => uint256) balances;

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

        require(IERC20(_asset).transfer(owner, _amount));

        balances[_asset] -= _amount;

        emit Withdraw(_asset, _amount);
    }

    function supplyETH(uint256 _amount) external override {
        require(address(this).balance >= _amount, "Please deposit ether");
        require(
            compoundManager.supplyETH{value: _amount, gas: 250000}(
                address(this)
            )
        );

        balances[TokenLibrary.cETH] += _amount;
        balances[WETH] -= _amount;

        emit Supply(address(0), _amount);
    }

    function redeemETH(uint256 _amount) external override onlyOwner {
        require(balances[TokenLibrary.cETH] >= _amount);
        require(compoundManager.redeemETH(_amount, msg.sender));

        emit Redeem(WETH, _amount);
    }

    function buyETH(address _asset, uint _amount)
        external
        override
        onlyOwner
        returns (uint256)
    {
        require(
            IERC20(_asset).balanceOf(address(this)) >= _amount,
            "Please deposit stablecoins"
        );

        if (
            IERC20(_asset).allowance(address(this), address(uniswapExchange)) <
            _amount
        ) {
            IERC20(_asset).approve(address(uniswapExchange), _amount);
        }

        uint amountOut = uniswapExchange.swapForWETH(_amount, _asset);
        balances[_asset] -= _amount;

        IWETH(WETH).withdraw(amountOut);

        emit ExecuteSwap(WETH, amountOut);

        return amountOut;
    }

    function getOwner() external view override returns (address) {
        return owner;
    }

    function getFactory() external view override returns (address) {
        return factory;
    }

    function balanceOf(address _asset) external view override returns (uint) {
        return balances[_asset];
    }

    function withdrawETH(uint256 _amount)
        external
        override
        onlyOwner
        returns (bool)
    {
        require(address(this).balance >= _amount, "Insufficient balance");

        payable(owner).transfer(_amount);

        emit Withdraw(address(0), _amount);

        return true;
    }

    receive() external payable {
        emit Deposit(address(0), msg.value);
    }
}
