// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/TokenLibrary.sol";
import "./interfaces/ICERC20.sol";
import "./interfaces/ICETH.sol";

contract CompoundManager {
    event Logger(string message, address caller, uint256 amount);
    event Supply(address indexed owner, address indexed asset, uint256 amount);
    event Redeeem(address indexed owner, address indexed asset, uint256 amount);

    function supplyEth(address _owner) external payable returns (bool) {
        address cTokenAddress = TokenLibrary.getCtokenAddress(address(0));
        ICETH cToken = ICETH(cTokenAddress);

        emit Logger("Supplying ETH ", msg.sender, msg.value);

        cToken.mint{value: msg.value, gas: 250000}();
        cToken.transfer(payable(_owner), cToken.balanceOf(address(this)));

        emit Supply(msg.sender, address(0), msg.value);
        return true;
    }

    function redeemEth(
        uint256 _amount,
        bool _redeemType,
        address _owner
    ) external returns (bool) {
        address cTokenAddress = TokenLibrary.getCtokenAddress(address(0));
        ICETH cToken = ICETH(cTokenAddress);

        uint256 redeemResult;

        if (_redeemType) {
            // redeem based on cToken balance
            redeemResult = cToken.redeem(_amount);
        } else {
            // redeem based on ETH balance
            redeemResult = cToken.redeemUnderlying(_amount);
        }

        emit Redeeem(_owner, address(0), redeemResult);

        payable(_owner).transfer(redeemResult);

        return true;
    }

    function supplyStablecoin(
        address _underlying,
        uint256 _amount,
        address _owner
    ) external returns (uint256) {
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

        emit Supply(_owner, _underlying, mintResult);

        return mintResult;
    }

    function redeemStablecoin(
        uint256 _amount,
        bool redeemType,
        address _cToken,
        address _owner
    ) external {
        ICERC20 cToken = ICERC20(_cToken);

        uint256 redeemResult;

        if (redeemType == true) {
            // redeem cToken balance
            redeemResult = cToken.redeem(_amount);
        } else {
            // redeem based on amount of asset
            redeemResult = cToken.redeemUnderlying(_amount);
        }

        require(redeemResult == 0, "There was an error redeeming");

        emit Redeeem(_owner, _cToken, _amount);
    }

    receive() external payable {}
}
