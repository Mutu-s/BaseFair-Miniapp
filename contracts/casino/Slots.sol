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
 * @title Slots
 * @dev Mission X compliant, VRF-powered arcade slots game
 * Features: VRF-determined reel outcomes, combo multipliers, streak bonuses
 */
contract Slots is Ownable, ReentrancyGuard {
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
    address public token; // address(0) = native ETH

    uint256 public gameCounter;
    uint256 public prizePool;
    
    // Mission X: Max multiplier cap for safety (50x = 500000 bps)
    uint256 public constant MAX_MULTIPLIER_BPS = 500000; // 50x max
    
    // Mission X: Player streak tracking (illusion of skill)
    mapping(address => uint8) public playerStreaks;

    struct PendingGame {
        address player;
        uint256 amount;
    }

    struct GameResult {
        address player;
        uint256 gameId;
        uint8 reel1;
        uint8 reel2;
        uint8 reel3;
        uint256 multiplier;
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
        uint8 reel1,
        uint8 reel2,
        uint8 reel3,
        uint256 multiplier,
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

    function spin(uint256 amount) external payable nonReentrant {
        require(!config.paused, "Paused");
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
            amount: amount
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

        // Generate reel outcomes from VRF
        uint256 reel1Random = uint256(keccak256(abi.encodePacked(randomness, uint256(1))));
        uint256 reel2Random = uint256(keccak256(abi.encodePacked(randomness, uint256(2))));
        uint256 reel3Random = uint256(keccak256(abi.encodePacked(randomness, uint256(3))));

        uint8 reel1 = uint8(reel1Random % 7); // 0-6 (7 symbols)
        uint8 reel2 = uint8(reel2Random % 7);
        uint8 reel3 = uint8(reel3Random % 7);

        uint256 multiplierBps = calculatePayoutMultiplier(reel1, reel2, reel3);
        
        // Mission X: Streak bonus (illusion of skill)
        // Update player streak based on win/loss
        if (multiplierBps > 0) {
            // Win: increment streak
            playerStreaks[g.player] += 1;
            // Mission X: Cap streak bonus to prevent extreme payouts
            // Max streak bonus: 20x (200000 bps) = 20 streak * 1000 bps
            uint8 currentStreak = playerStreaks[g.player];
            uint256 streakBonus = uint256(currentStreak) * 1000; // +0.1x per streak
            if (streakBonus > 200000) {
                streakBonus = 200000; // Cap at 20x streak bonus
            }
            multiplierBps += streakBonus;
        } else {
            // Loss: reset streak
            playerStreaks[g.player] = 0;
        }
        
        // Mission X: Final multiplier cap (safety check)
        if (multiplierBps > MAX_MULTIPLIER_BPS) {
            multiplierBps = MAX_MULTIPLIER_BPS; // Cap at 50x total
        }

        uint256 reward = CasinoMath.calculatePayout(
            g.amount,
            multiplierBps,
            config.houseEdgeBps
        );

        // Mission X: Loot rarity affects bonus (illusion of skill + luck)
        uint256 lootRarity = (randomness % 1000);
        
        // Loot rarity bonus: 0-999, higher = rarer
        // Ultra rare loot (0-4): +10% bonus
        // Rare loot (5-19): +5% bonus
        // Common loot (20-999): no bonus
        uint256 lootBonus = 0;
        if (lootRarity < 5) {
            // Ultra rare: +10% bonus
            lootBonus = (reward * 10) / 100;
        } else if (lootRarity < 20) {
            // Rare: +5% bonus
            lootBonus = (reward * 5) / 100;
        }
        
        // Mission X: Multiplayer prize pool bonus (rare)
        if (lootRarity < 5 && prizePool > 0) {
            uint256 poolBonus = prizePool / 10;
            prizePool -= poolBonus;
            lootBonus += poolBonus;
        }
        
        uint256 totalReward = reward + lootBonus;

        if (totalReward > 0) {
            CasinoTreasury(payable(config.treasury))
                .payOut(token, g.player, totalReward);
        }

        games[gameId] = GameResult({
            player: g.player,
            gameId: gameId,
            reel1: reel1,
            reel2: reel2,
            reel3: reel3,
            multiplier: multiplierBps,
            reward: totalReward, // Include loot bonus
            streak: playerStreaks[g.player], // Current streak after this game
            lootRarity: lootRarity
        });

        delete pendingGames[gameId];
        delete vrfRequestToGame[requestId];

        emit GameSettled(
            gameId,
            reel1,
            reel2,
            reel3,
            multiplierBps,
            totalReward, // Include loot bonus
            playerStreaks[g.player], // Current streak after this game
            lootRarity
        );
    }

    function calculatePayoutMultiplier(uint8 reel1, uint8 reel2, uint8 reel3) internal pure returns (uint256) {
        // Three of a kind
        if (reel1 == reel2 && reel2 == reel3) {
            if (reel1 == 6) return 250000; // Three Sevens = 25x
            if (reel1 == 5) return 100000; // Three Bars = 10x
            if (reel1 == 4) return 50000;  // Three Bells = 5x
            return 20000; // Three others = 2x
        }
        // Two of a kind
        else if (reel1 == reel2 || reel2 == reel3 || reel1 == reel3) {
            return 10000; // 1x
        }
        // No match
        else {
            return 0;
        }
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
