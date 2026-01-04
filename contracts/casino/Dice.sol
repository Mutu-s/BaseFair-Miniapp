// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "../interfaces/IPythVRF.sol";
import "./libraries/CasinoMath.sol";
import "./CasinoTreasury.sol";

/**
 * @title Dice
 * @dev Mission X compliant, VRF-powered arcade dice game
 * Features: Streak multipliers, probability-based payouts, VRF-based cosmetic rewards
 */
contract Dice is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct GameConfig {
        address treasury;
        uint256 minPlay;
        uint256 maxPlay;
        uint16 houseEdgeBps;
        bool paused;
    }

    GameConfig public config;
    IPythVRF public pythVRF;
    address public token; // address(0) = native MON

    uint256 public gameCounter;
    uint256 public prizePool;

    struct PendingGame {
        address player;
        uint256 amount;
        uint8 target;
        bool rollUnder;
        uint8 streak;
        uint256 multiplierBps;
    }

    struct GameResult {
        address player;
        uint256 gameId;
        uint256 roll;
        uint256 reward;
        uint8 streak;
        uint256 lootRarity;
    }

    mapping(uint256 => PendingGame) public pendingGames;
    mapping(bytes32 => uint256) public vrfRequestToGame;
    mapping(uint256 => GameResult) public games;

    event GameStarted(uint256 indexed gameId, address indexed player);
    event GameSettled(
        uint256 indexed gameId,
        uint256 roll,
        uint256 reward,
        uint8 streak,
        uint256 lootRarity
    );

    constructor(
        address _owner,
        address _token,
        address _pythVRF
    ) Ownable(_owner) {
        token = _token;
        pythVRF = IPythVRF(_pythVRF);
    }

    function initialize(
        address treasury,
        uint256 minPlay,
        uint256 maxPlay,
        uint16 houseEdgeBps
    ) external onlyOwner {
        config = GameConfig({
            treasury: treasury,
            minPlay: minPlay,
            maxPlay: maxPlay,
            houseEdgeBps: houseEdgeBps,
            paused: false
        });
    }

    function play(uint256 amount, uint8 target, bool rollUnder)
        external
        payable
        nonReentrant
    {
        require(!config.paused, "Paused");
        require(target > 0 && target < 100, "Invalid target");
        CasinoMath.validateBet(amount, config.minPlay, config.maxPlay);

        if (token == address(0)) {
            require(msg.value == amount, "Amount mismatch");
            prizePool += amount / 10; // multiplayer pool
            (bool ok, ) = payable(config.treasury).call{value: amount}("");
            require(ok, "Transfer failed");
        } else {
            prizePool += amount / 10;
            IERC20(token).safeTransferFrom(
                msg.sender,
                config.treasury,
                amount
            );
        }

        uint256 gameId = ++gameCounter;

        pendingGames[gameId] = PendingGame({
            player: msg.sender,
            amount: amount,
            target: target,
            rollUnder: rollUnder,
            streak: 0,
            multiplierBps: 0 // Will be calculated based on probability
        });

        // Mission X: No seed - VRF generates its own entropy
        bytes32 requestId = pythVRF.requestRandomness();
        vrfRequestToGame[requestId] = gameId;

        emit GameStarted(gameId, msg.sender);
    }

    /**
     * @dev Mission X: Push-based callback - VRF calls this with randomness
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomness) external {
        require(msg.sender == address(pythVRF), "Only VRF");

        uint256 gameId = vrfRequestToGame[requestId];
        PendingGame storage g = pendingGames[gameId];
        require(g.player != address(0), "Invalid game");

        uint256 roll = (randomness % 100) + 1; // 1-100
        uint256 reward = 0;
        uint256 lootRarity = (randomness % 1000); // cosmetic loot

        bool won = g.rollUnder ? (roll < g.target) : (roll > g.target);

        if (won) {
            g.streak += 1;
            
            // Calculate probability-based multiplier
            uint256 probability = g.rollUnder ? (g.target - 1) : (100 - g.target);
            require(probability >= 5, "Too risky"); // Mission X: Prevent treasury drain
            
            uint256 baseMultiplierBps = (10000 * 10000) / probability;
            // Mission X: Cap multiplier to prevent extreme payouts
            if (baseMultiplierBps > 50000) {
                baseMultiplierBps = 50000; // Max 5x base multiplier
            }
            
            // Streak bonus (illusion of skill)
            g.multiplierBps = baseMultiplierBps + (g.streak * 500); // +500 bps per streak

            reward = CasinoMath.calculatePayout(
                g.amount,
                g.multiplierBps,
                config.houseEdgeBps
            );

            // Mission X: Loot rarity affects bonus (illusion of skill + luck)
            // Loot rarity bonus: 0-999, higher = rarer
            // Ultra rare loot (0-4): +10% bonus
            // Rare loot (5-19): +5% bonus
            uint256 lootBonus = 0;
            if (lootRarity < 5) {
                lootBonus = (reward * 10) / 100;
            } else if (lootRarity < 20) {
                lootBonus = (reward * 5) / 100;
            }
            
            // Mission X: Multiplayer prize pool bonus (rare)
            if (lootRarity < 5 && prizePool > 0) {
                uint256 poolBonus = prizePool / 10;
                prizePool -= poolBonus;
                lootBonus += poolBonus;
            }
            
            uint256 totalReward = reward + lootBonus;

            CasinoTreasury(payable(config.treasury))
                .payOut(token, g.player, totalReward);
            
            reward = totalReward; // Update for GameResult
        } else {
            g.streak = 0;
        }

        games[gameId] = GameResult({
            player: g.player,
            gameId: gameId,
            roll: roll,
            reward: reward,
            streak: g.streak,
            lootRarity: lootRarity
        });

        delete pendingGames[gameId];
        delete vrfRequestToGame[requestId];

        emit GameSettled(
            gameId,
            roll,
            reward,
            g.streak,
            lootRarity
        );
    }

    function getGame(uint256 gameId) external view returns (GameResult memory) {
        return games[gameId];
    }

    function getPendingGame(uint256 gameId) external view returns (PendingGame memory) {
        return pendingGames[gameId];
    }

    function getPrizePool() external view returns (uint256) {
        return prizePool;
    }

    function pause() external onlyOwner {
        config.paused = true;
    }

    function unpause() external onlyOwner {
        config.paused = false;
    }

    function setPythVRF(address _pythVRF) external onlyOwner {
        pythVRF = IPythVRF(_pythVRF);
    }
}
