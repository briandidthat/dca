// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/TokenLibrary.sol";
import "./interfaces/ICERC20.sol";

contract CompoundManager {
    event Supply(address indexed owner, address indexed asset, uint256 amount);
    event Redeeem(address indexed owner, address indexed asset, uint256 amount);

    function supplyEth() external payable {}

    function redeemEth() external {}

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
