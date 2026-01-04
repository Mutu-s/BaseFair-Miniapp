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
 * @title Plinko
 * @dev Mission X compliant, VRF-powered arcade plinko game
 * Features: VRF-determined ball path, position-based multipliers, skill-based row selection
 */
contract Plinko is Ownable, ReentrancyGuard {
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
        uint8 rows;
    }

    struct GameResult {
        address player;
        uint256 gameId;
        int256 position; // Final position (-rows to +rows)
        uint256 multiplier;
        uint256 reward;
        uint256 lootRarity;
    }

    mapping(uint256 => PendingGame) public pendingGames;
    mapping(bytes32 => uint256) public vrfRequestToGame;
    mapping(uint256 => GameResult) public games;

    event GameStarted(uint256 indexed gameId, address indexed player);
    event GameSettled(
        uint256 indexed gameId,
        int256 position,
        uint256 multiplier,
        uint256 reward,
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

    function play(uint256 amount, uint8 rows) external payable nonReentrant {
        require(!config.paused, "Paused");
        require(rows >= 8 && rows <= 16, "Invalid rows");
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
            rows: rows
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

        // Simulate ball path using VRF
        int256 position = 0;
        uint256 currentRandom = randomness;

        for (uint8 i = 0; i < g.rows; i++) {
            // Use different parts of randomness for each row
            uint256 rowRandom = uint256(keccak256(abi.encodePacked(currentRandom, i)));
            bool goLeft = (rowRandom % 2) == 0;
            position += goLeft ? int256(-1) : int256(1);
        }

        // Calculate multiplier based on position (center = highest)
        uint256 multiplierBps = calculateMultiplier(position, int256(uint256(g.rows)));
        uint256 reward = CasinoMath.calculatePayout(
            g.amount,
            multiplierBps,
            config.houseEdgeBps
        );

        // Mission X: Loot rarity affects bonus (illusion of skill + luck)
        uint256 lootRarity = (randomness % 1000);
        
        // Loot rarity bonus: 0-999, higher = rarer
        // Rare loot (0-4): +10% bonus
        // Epic loot (5-19): +5% bonus
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
            position: position,
            multiplier: multiplierBps,
            reward: totalReward, // Include loot bonus
            lootRarity: lootRarity
        });

        delete pendingGames[gameId];
        delete vrfRequestToGame[requestId];

        emit GameSettled(
            gameId,
            position,
            multiplierBps,
            reward,
            lootRarity
        );
    }

    /**
     * @dev Calculate multiplier based on position and rows
     * Mission X: Realistic multipliers (5x max center, 0.2x-1x edge)
     * More rows = higher risk/reward (skill illusion)
     */
    function calculateMultiplier(int256 position, int256 maxPosition) internal pure returns (uint256) {
        int256 distanceFromCenter = position < 0 ? -position : position;
        int256 maxDistance = maxPosition;
        
        // Mission X: Base multiplier at center (5x max for safety)
        uint256 baseMultiplierBps = 50000; // 5x
        
        if (distanceFromCenter == 0) {
            // Perfect center: 5x
            return baseMultiplierBps;
        } else {
            // Calculate reduction based on distance from center
            // Edge positions get 0.2x - 1x
            uint256 reduction = uint256((distanceFromCenter * 40000) / maxDistance); // Reduce from 5x to 0.2x
            uint256 multiplier = baseMultiplierBps > reduction ? baseMultiplierBps - reduction : 2000; // Min 0.2x
            
            // Mission X: More rows = slightly higher multiplier (risk/reward)
            // This creates skill illusion - players choose rows strategically
            uint256 rowsBonus = uint256(maxDistance) * 500; // +0.5x per row (max 8x for 16 rows)
            multiplier = multiplier + rowsBonus;
            
            // Cap at 10x for safety (even with rows bonus)
            if (multiplier > 100000) {
                multiplier = 100000; // 10x max
            }
            
            return multiplier;
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
