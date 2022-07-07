// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;

import "./interfaces/ILendingPool.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AaveManager {
    ILendingPool public constant lendingPool =
        ILendingPool(0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9);
    address public immutable owner;

    event Deposit(
        address indexed asset,
        address indexed depositor,
        uint256 amount
    );

    event Withdrawal(address indexed asset, address indexed to, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    function deposit(
        address _asset,
        uint256 _amount,
        address _onBehalfOf
    ) external {
        require(
            IERC20(_asset).allowance(msg.sender, address(lendingPool)) >=
                _amount,
            "Insufficient allowance"
        );

        lendingPool.deposit(_asset, _amount, _onBehalfOf, 0);
        emit Deposit(_asset, _onBehalfOf, _amount);
    }

    function withdraw(
        address _asset,
        uint256 _amount,
        address _to
    ) external returns (uint256 withdrawal) {
        withdrawal = lendingPool.withdraw(_asset, _amount, _to);
        emit Withdrawal(_asset, _to, _amount);
    }
}
