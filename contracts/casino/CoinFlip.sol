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
 * @title CoinFlip
 * @dev Mission X compliant, VRF-powered arcade coin flip game
 * Features: Streak multipliers, cash-out strategy, multiplayer prize pools, VRF-based cosmetic loot
 */
contract CoinFlip is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ================= CONFIG =================

    struct GameConfig {
        address treasury;
        uint256 minPlay;
        uint256 maxPlay;
        uint16 houseEdgeBps;
        bool paused;
    }

    GameConfig public config;
    IPythVRF public pythVRF;
    address public token; // address(0) = native ETH

    uint256 public gameCounter;
    uint256 public prizePool;

    // ================= GAME =================

    struct PendingGame {
        address player;
        uint256 amount;
        uint8 choice;
        uint8 streak;
        uint256 multiplierBps;
        bool cashOut;
    }

    struct GameResult {
        address player;
        uint256 gameId;
        uint256 result;
        uint256 reward;
        uint8 streak;
        uint256 lootRarity;
    }

    mapping(uint256 => PendingGame) public pendingGames;
    mapping(bytes32 => uint256) public vrfRequestToGame;
    mapping(uint256 => GameResult) public games;

    // ================= EVENTS =================

    event GameStarted(uint256 indexed gameId, address indexed player);
    event GameSettled(
        uint256 indexed gameId,
        uint256 result,
        uint256 reward,
        uint8 streak,
        uint256 lootRarity
    );

    // ================= CONSTRUCTOR =================

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

    // ================= PLAY =================

    function play(uint256 amount, uint8 choice, bool cashOut)
        external
        payable
        nonReentrant
    {
        require(!config.paused, "Paused");
        require(choice <= 1, "Invalid choice");
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
            choice: choice,
            streak: 0,
            multiplierBps: 19500,
            cashOut: cashOut
        });

        // Request VRF with seed
        // Mission X: No seed - VRF generates its own entropy
        bytes32 requestId = pythVRF.requestRandomness();
        vrfRequestToGame[requestId] = gameId;

        emit GameStarted(gameId, msg.sender);
    }

    // ================= VRF CALLBACK =================

    /**
     * @dev Mission X: Push-based callback - VRF calls this with randomness
     * This is the proper Mission X pattern - VRF pushes randomness, contract doesn't pull
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomness) external {
        // Verify caller is VRF provider
        require(msg.sender == address(pythVRF), "Only VRF");

        uint256 gameId = vrfRequestToGame[requestId];
        PendingGame storage g = pendingGames[gameId];
        require(g.player != address(0), "Invalid game");

        uint256 result = randomness % 2;
        uint256 reward = 0;
        
        // Mission X: Loot rarity affects bonus (illusion of skill + luck)
        uint256 lootRarity = (randomness % 1000);

        if (g.choice == result) {
            g.streak += 1;
            g.multiplierBps += 500; // illusion of skill

            reward = CasinoMath.calculatePayout(
                g.amount,
                g.multiplierBps,
                config.houseEdgeBps
            );

            if (g.cashOut || g.streak >= 5) {
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
            }
        } else {
            g.streak = 0;
        }

        games[gameId] = GameResult({
            player: g.player,
            gameId: gameId,
            result: result,
            reward: reward,
            streak: g.streak,
            lootRarity: lootRarity
        });

        delete pendingGames[gameId];
        delete vrfRequestToGame[requestId];

        emit GameSettled(
            gameId,
            result,
            reward,
            g.streak,
            lootRarity
        );
    }

    // ================= VIEW FUNCTIONS =================

    function getGame(uint256 gameId) external view returns (GameResult memory) {
        return games[gameId];
    }

    function getPendingGame(uint256 gameId) external view returns (PendingGame memory) {
        return pendingGames[gameId];
    }

    function getPrizePool() external view returns (uint256) {
        return prizePool;
    }

    // ================= ADMIN =================

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
