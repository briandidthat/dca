// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;

library TokenLibrary {
    address public constant cDAI  = 0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643;
    address public constant cUSDC = 0x39AA39c021dfbaE8faC545936693aC917d5E7563;
    address public constant cUSDT = 0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9;
    address public constant cETH  = 0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5;

    address public constant DAI  = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    function getCtokenAddress(address _underlying)
        external
        pure
        returns (address cToken)
    {
        if (_underlying == address(0)) {
            return cETH;
        }

        if (_underlying == DAI) {
            return cDAI;
        } else if (_underlying == USDC) {
            return cUSDC;
        } else if (_underlying == USDT) {
            return cUSDT;
        } else {
            revert("Invalid underlying token");
        }
    }

    function isStableCoin(address _token) external pure returns (bool) {
        if ((_token == DAI) || (_token == USDC) || (_token == USDT)) {
            return true;
        }
        return false;
    }
}
