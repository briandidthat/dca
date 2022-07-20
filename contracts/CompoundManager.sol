// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/TokenLibrary.sol";
import "./interfaces/ICompoundManager.sol";
import "./interfaces/ICERC20.sol";
import "./interfaces/ICETH.sol";

contract CompoundManager is ICompoundManager {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function supplyETH(address _owner)
        external
        payable
        override
        returns (bool)
    {
        address cTokenAddress = TokenLibrary.getCtokenAddress(address(0));
        ICETH cToken = ICETH(cTokenAddress);

        emit Logger("Supplying ETH ", msg.sender, msg.value);

        cToken.mint{value: msg.value, gas: 250000}();
        cToken.transfer(_owner, cToken.balanceOf(address(this)));

        emit Supply(msg.sender, address(0), msg.value);
        return true;
    }

    function redeemETH(uint256 _amount, address _owner)
        external
        override
        returns (bool)
    {
        address cTokenAddress = TokenLibrary.getCtokenAddress(address(0));
        ICETH cToken = ICETH(cTokenAddress);

        cToken.transferFrom(_owner, address(this), _amount);

        uint256 redeemResult = cToken.redeem(_amount);

        emit Redeem(_owner, address(0), redeemResult);

        (bool success, ) = _owner.call{value: redeemResult}("");

        return success;
    }

    function supplyStablecoin(
        address _underlying,
        uint256 _amount,
        address _owner
    ) external override returns (uint256) {
        require(
            IERC20(_underlying).allowance(msg.sender, address(this)) >= _amount,
            "Insufficient allowance"
        );
        IERC20 underlying = IERC20(_underlying);
        underlying.transferFrom(msg.sender, address(this), _amount);

        address cTokenAddress = TokenLibrary.getCtokenAddress(_underlying);
        ICERC20 cToken = ICERC20(cTokenAddress);

        underlying.approve(cTokenAddress, _amount);
        uint256 mintResult = cToken.mint(_amount);

        uint256 balance = cToken.balanceOf(address(this));

        cToken.transfer(_owner, balance);

        emit Supply(address(_owner), _underlying, mintResult);

        return mintResult;
    }

    function redeemStablecoin(
        address _cToken,
        uint256 _amount,
        address _owner
    ) external override {
        ICERC20 cToken = ICERC20(_cToken);
        require(
            cToken.balanceOf(msg.sender) >= _amount,
            "Insufficient balance"
        );
        uint256 redeemResult = cToken.redeem(_amount);

        require(redeemResult == 0, "There was an error redeeming");

        emit Redeem(address(_owner), _cToken, _amount);
    }

    receive() external payable {}
}
