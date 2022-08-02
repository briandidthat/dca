// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;

import "./interfaces/IWETH.sol";
import "./interfaces/ICETH.sol";
import "./interfaces/ICERC20.sol";
import "./interfaces/IChamber.sol";
import "./interfaces/IUniswapExchange.sol";
import "./interfaces/TokenLibrary.sol";
import "./interfaces/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Chamber is IChamber, Initializable {
    address private owner;
    address public factory;
    Strategy public strategy;
    mapping(address => uint256) balances;
    IUniswapExchange internal uniswapExchange;
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
        factory = msg.sender;
    }

    receive() external payable {
        emit Deposit(address(0), msg.value);
    }

    function initialize(
        address _factory,
        address _owner,
        address _uniswapExchange
    ) external override initializer {
        owner = _owner;
        factory = _factory;
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
        emit Withdraw(_asset, _amount);

        balances[_asset] -= _amount;
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

    function buyETH(address _asset, uint _amount)
        external
        override
        onlyOwner
        returns (uint256)
    {
        IERC20 token = IERC20(_asset);
        require(
            token.balanceOf(address(this)) >= _amount,
            "Please deposit stablecoins"
        );

        if (
            token.allowance(address(this), address(uniswapExchange)) < _amount
        ) {
            token.approve(address(uniswapExchange), _amount);
        }

        uint amountOut = uniswapExchange.swapForWETH(_amount, _asset);
        emit ExecuteSwap(WETH, amountOut);

        balances[_asset] -= _amount;

        IWETH(WETH).withdraw(amountOut);

        if (strategy == Strategy.COMPOUND) {
            cETH.mint{value: _amount}();
            emit Supply(address(0), _amount);
        }

        return amountOut;
    }

    function fillQuote(
        IERC20 _sellToken,
        IERC20 _buyToken,
        uint256 _amount,
        address _spender,
        address payable _swapTarget,
        bytes calldata _swapCallData
    ) external payable override {
        // Give `spender` an infinite allowance to spend this contract's `sellToken`
        if (_sellToken.allowance(address(this), _spender) < _amount) {
            require(_sellToken.approve(_spender, uint256(-1)));
        }
        // Execute swap
        (bool success, bytes memory data) = _swapTarget.call(_swapCallData);

        require(success, getRevertMsg(data));

        emit ExecuteSwap(address(_buyToken), _amount);
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

    function getOwner() external view override returns (address) {
        return owner;
    }

    function getFactory() external view override returns (address) {
        return factory;
    }

    function balanceOf(address _asset) external view override returns (uint) {
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
