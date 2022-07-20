// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;

interface IUniswapExchange {
    event Swap(address taker, address stablecoin, uint256 amount);

    function swapForWETH(uint256 amountIn, address stablecoin)
        external
        returns (uint256 amountOut);
}
