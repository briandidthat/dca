//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.15;
import "./interfaces/IVault.sol";
import "./interfaces/IERC20.sol";

contract Vault is IVault {
    enum Status {
        ACTIVE,
        DEPRECATED
    }

    address public owner;
    address public factory;
    Status public status;
    mapping(address => uint256) public balances;
    Strategy[] public strategies;

    struct Strategy {
        uint256 pid;
        address tokenIn;
        address tokenOut;
        uint256 amount;
        uint8 frequency;
        bool active;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner of this vault");
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "Not the owner of this vault");
        _;
    }

    receive() external payable {
        emit Deposit(msg.sender, address(0), msg.value);
    }

    function deposit(uint256 _amount, address _token) external onlyOwner {
        require(
            IERC20(_token).allowance(msg.sender, address(this)) >= _amount,
            "Insufficient allowance"
        );

        require(
            IERC20(_token).transferFrom(msg.sender, address(this), _amount)
        );

        balances[_token] += _amount;
        emit Deposit(msg.sender, _token, _amount);
    }

    function withdraw(uint256 _amount, address _token) external onlyOwner {
        require(balances[_token] >= _amount, "Insufficient balance");
        require(
            IERC20(_token).transferFrom(address(this), msg.sender, _amount)
        );

        balances[_token] -= _amount;
        emit Withdrawal(owner, _token, _amount);
    }

    function newStrategy(
        address _tokenIn,
        address _tokenOut,
        uint256 _amount,
        uint8 _frequency
    ) external onlyOwner {
        strategies.push(
            Strategy({
                pid: strategies.length,
                tokenIn: _tokenIn,
                tokenOut: _tokenOut,
                amount: _amount,
                frequency: _frequency,
                active: true
            })
        );
        emit NewStrategy(_tokenIn, _tokenOut, _frequency);
    }

    function executeStrategy(
        address _tokenOut,
        address _tokenIn,
        uint256 _amount
    ) external {
        require(balances[_tokenOut] >= _amount, "Insufficient balance");
    }

    function deprecateStrategy(uint256 _pid) external onlyOwner {
        Strategy storage strategy = strategies[_pid];
        strategy.active = false;
    }

    function deprecateVault() external onlyOwner {
        status = Status.DEPRECATED;
    }
}
