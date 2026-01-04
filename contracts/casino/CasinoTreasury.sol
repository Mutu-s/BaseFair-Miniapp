// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract CasinoTreasury is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    mapping(address => bool) public authorizedGames;
    bool public paused;

    event FundsDeposited(address indexed token, uint256 amount);
    event FundsWithdrawn(address indexed token, uint256 amount, address to);
    event GameAuthorized(address indexed game);
    event GameRevoked(address indexed game);
    event Paused();
    event Unpaused();

    modifier onlyAuthorized() {
        require(authorizedGames[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Treasury paused");
        _;
    }

    constructor(address _owner) Ownable(_owner) {
        paused = false;
    }

    function authorizeGame(address game) external onlyOwner {
        authorizedGames[game] = true;
        emit GameAuthorized(game);
    }

    function revokeGame(address game) external onlyOwner {
        authorizedGames[game] = false;
        emit GameRevoked(game);
    }

    function pause() external onlyOwner {
        paused = true;
        emit Paused();
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused();
    }

    function deposit(address token, uint256 amount) external payable whenNotPaused {
        if (token == address(0)) {
            require(msg.value == amount, "Amount mismatch");
            emit FundsDeposited(address(0), amount);
        } else {
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            emit FundsDeposited(token, amount);
        }
    }

    function withdraw(address token, uint256 amount, address to) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid recipient");
        if (token == address(0)) {
            (bool success, ) = payable(to).call{value: amount}("");
            require(success, "Transfer failed");
            emit FundsWithdrawn(address(0), amount, to);
        } else {
            IERC20(token).safeTransfer(to, amount);
            emit FundsWithdrawn(token, amount, to);
        }
    }

    function transferToGame(address token, address game, uint256 amount) external onlyAuthorized whenNotPaused {
        if (token == address(0)) {
            (bool success, ) = payable(game).call{value: amount}("");
            require(success, "Transfer failed");
        } else {
            IERC20(token).safeTransfer(game, amount);
        }
    }

    function payOut(address token, address recipient, uint256 amount) external onlyAuthorized whenNotPaused {
        require(recipient != address(0), "Invalid recipient");
        if (token == address(0)) {
            require(address(this).balance >= amount, "Insufficient treasury balance");
            (bool success, ) = payable(recipient).call{value: amount}("");
            require(success, "Payout failed");
        } else {
            IERC20(token).safeTransfer(recipient, amount);
        }
    }

    function getBalance(address token) external view returns (uint256) {
        if (token == address(0)) {
            return address(this).balance;
        } else {
            return IERC20(token).balanceOf(address(this));
        }
    }

    receive() external payable {
        emit FundsDeposited(address(0), msg.value);
    }
}
