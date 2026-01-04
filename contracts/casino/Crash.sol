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
 * @title Crash
 * @dev Mission X compliant, VRF-powered arcade crash game
 * 
 * MISSION X ARCHITECTURE:
 * 1. placeBet() → VRF request
 * 2. fulfillRandomness() → crashPoint SABİTLENİR (immutable)
 * 3. cashout() → Multiplier zamanla artar, oyuncu crashPoint'ten önce cashout yapar
 * 
 * SKILL ILLUSION:
 * - VRF → crashPoint belirlenir (1x-10x arası)
 * - Multiplier zamanla artar (block.timestamp based)
 * - Oyuncu timing skill'i ile cashout yapar
 * - CrashPoint önceden belirlenmiş, değişmez
 */
contract Crash is Ownable, ReentrancyGuard {
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
    
    // Mission X: Multiplier increases by this amount per second (in bps)
    // Example: 1000 = 0.1x per second, so 1x after 10 seconds
    uint256 public constant MULTIPLIER_PER_SECOND = 1000; // 0.1x per second

    struct ActiveGame {
        address player;
        uint256 amount;
        uint256 crashPoint; // VRF-determined crash point (in bps, e.g., 20000 = 2x)
        uint256 gameStartedAt; // Timestamp when game started (after VRF fulfillment)
        uint256 autoCashout; // Target multiplier for auto-cashout (in bps)
        bool cashedOut;
        bool crashed;
    }

    struct GameResult {
        address player;
        uint256 gameId;
        uint256 crashPoint; // Multiplier where game crashed (in bps)
        uint256 cashoutPoint; // Multiplier where player cashed out (in bps, 0 if crashed)
        uint256 reward;
        uint256 lootRarity;
    }

    mapping(uint256 => ActiveGame) public activeGames;
    mapping(bytes32 => uint256) public vrfRequestToGame;
    mapping(uint256 => GameResult) public games;

    event GameStarted(uint256 indexed gameId, address indexed player);
    event Cashout(uint256 indexed gameId, uint256 multiplier, uint256 payout);
    event GameCrashed(uint256 indexed gameId, uint256 crashPoint);
    event GameSettled(
        uint256 indexed gameId,
        uint256 crashPoint,
        uint256 cashoutPoint,
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

    /**
     * @dev Place bet and request VRF for crash point
     * Mission X: VRF determines crash point BEFORE game starts
     */
    function placeBet(uint256 amount, uint256 autoCashout) external payable nonReentrant {
        require(!config.paused, "Paused");
        require(autoCashout >= 10000 && autoCashout <= 100000, "Invalid cashout"); // 1x to 10x
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

        // Mission X: Request VRF - crash point will be determined in fulfillRandomness
        bytes32 requestId = pythVRF.requestRandomness();
        vrfRequestToGame[requestId] = gameId;

        // Initialize game (crashPoint will be set in fulfillRandomness)
        activeGames[gameId] = ActiveGame({
            player: msg.sender,
            amount: amount,
            crashPoint: 0, // Will be set by VRF
            gameStartedAt: 0, // Will be set when VRF fulfills
            autoCashout: autoCashout,
            cashedOut: false,
            crashed: false
        });

        emit GameStarted(gameId, msg.sender);
    }

    /**
     * @dev Mission X: Push-based callback - VRF determines crash point
     * CRITICAL: crashPoint is IMMUTABLE after this call
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomness) external {
        require(msg.sender == address(pythVRF), "Only VRF");

        uint256 gameId = vrfRequestToGame[requestId];
        ActiveGame storage game = activeGames[gameId];
        require(game.player != address(0), "Invalid game");
        require(game.crashPoint == 0, "Already fulfilled"); // Safety check

        // Mission X: Calculate crash point from VRF (1x to 10x in bps)
        // crashPoint is between 10000 (1x) and 100000 (10x)
        uint256 crashPoint = 10000 + ((randomness % 90000)); // 1x to 10x
        
        // SABİTLE: crashPoint artık değişmez
        game.crashPoint = crashPoint;
        game.gameStartedAt = block.timestamp; // Game starts NOW

        // Check if auto-cashout should trigger immediately
        // (if autoCashout is already >= crashPoint, game crashed before it could start)
        if (game.autoCashout >= crashPoint) {
            // Game crashed immediately (autoCashout >= crashPoint)
            game.crashed = true;
            
            games[gameId] = GameResult({
                player: game.player,
                gameId: gameId,
                crashPoint: crashPoint,
                cashoutPoint: 0,
                reward: 0,
                lootRarity: randomness % 1000
            });

            emit GameCrashed(gameId, crashPoint);
            emit GameSettled(gameId, crashPoint, 0, 0, randomness % 1000);
            
            delete activeGames[gameId];
            delete vrfRequestToGame[requestId];
        } else {
            // Game is active - player can cashout manually
            // Multiplier will increase over time
            emit Cashout(gameId, 0, 0); // Signal game is active
        }
    }

    /**
     * @dev Cashout manually - skill-based timing
     * Mission X: NO VRF call here - crashPoint already determined
     * Multiplier increases over time, player must cashout before crashPoint
     */
    function cashout(uint256 gameId) external nonReentrant {
        ActiveGame storage game = activeGames[gameId];
        require(game.player == msg.sender, "Not your game");
        require(!game.cashedOut, "Already cashed out");
        require(!game.crashed, "Game already crashed");
        require(game.crashPoint > 0, "Game not started"); // VRF must have fulfilled
        require(game.gameStartedAt > 0, "Game not started");

        // Mission X: Calculate current multiplier based on time elapsed
        // Multiplier starts at 1x (10000 bps) and increases by MULTIPLIER_PER_SECOND per second
        uint256 timeElapsed = block.timestamp - game.gameStartedAt;
        uint256 currentMultiplier = 10000 + (timeElapsed * MULTIPLIER_PER_SECOND);

        // Check if player cashed out before crash
        if (currentMultiplier < game.crashPoint) {
            // SUCCESS: Player cashed out before crash
            uint256 reward = CasinoMath.calculatePayout(
                game.amount,
                currentMultiplier,
                config.houseEdgeBps
            );

            game.cashedOut = true;

            CasinoTreasury(payable(config.treasury))
                .payOut(token, game.player, reward);

            // Multiplayer pool bonus (rare)
            uint256 lootRarity = uint256(keccak256(abi.encodePacked(gameId, block.timestamp))) % 1000;
            if (lootRarity < 5 && prizePool > 0) {
                uint256 bonus = prizePool / 10;
                prizePool -= bonus;
                reward += bonus;
                CasinoTreasury(payable(config.treasury))
                    .payOut(token, game.player, bonus);
            }

            games[gameId] = GameResult({
                player: game.player,
                gameId: gameId,
                crashPoint: game.crashPoint,
                cashoutPoint: currentMultiplier,
                reward: reward,
                lootRarity: lootRarity
            });

            emit Cashout(gameId, currentMultiplier, reward);
            emit GameSettled(
                gameId,
                game.crashPoint,
                currentMultiplier,
                reward,
                lootRarity
            );
        } else {
            // CRASH: Player cashed out too late (or exactly at crash point)
            game.crashed = true;
            game.cashedOut = true; // Mark as processed

            uint256 lootRarity = uint256(keccak256(abi.encodePacked(gameId, block.timestamp))) % 1000;

            games[gameId] = GameResult({
                player: game.player,
                gameId: gameId,
                crashPoint: game.crashPoint,
                cashoutPoint: 0,
                reward: 0,
                lootRarity: lootRarity
            });

            emit GameCrashed(gameId, game.crashPoint);
            emit GameSettled(
                gameId,
                game.crashPoint,
                0,
                0,
                lootRarity
            );
        }

        delete activeGames[gameId];
    }

    /**
     * @dev Check if auto-cashout should trigger
     * Called periodically or by keeper to check auto-cashout conditions
     */
    function checkAutoCashout(uint256 gameId) external {
        ActiveGame storage game = activeGames[gameId];
        require(game.player != address(0), "Game not found");
        require(!game.cashedOut, "Already cashed out");
        require(!game.crashed, "Game already crashed");
        require(game.crashPoint > 0, "Game not started");
        require(game.gameStartedAt > 0, "Game not started");

        // Calculate current multiplier
        uint256 timeElapsed = block.timestamp - game.gameStartedAt;
        uint256 currentMultiplier = 10000 + (timeElapsed * MULTIPLIER_PER_SECOND);

        // Check if auto-cashout should trigger
        if (currentMultiplier >= game.autoCashout) {
            // Auto-cashout triggered
            if (currentMultiplier < game.crashPoint) {
                // Success: cashed out before crash
                uint256 reward = CasinoMath.calculatePayout(
                    game.amount,
                    game.autoCashout,
                    config.houseEdgeBps
                );

                game.cashedOut = true;

                CasinoTreasury(payable(config.treasury))
                    .payOut(token, game.player, reward);

                uint256 lootRarity = uint256(keccak256(abi.encodePacked(gameId, block.timestamp))) % 1000;

                games[gameId] = GameResult({
                    player: game.player,
                    gameId: gameId,
                    crashPoint: game.crashPoint,
                    cashoutPoint: game.autoCashout,
                    reward: reward,
                    lootRarity: lootRarity
                });

                emit Cashout(gameId, game.autoCashout, reward);
                emit GameSettled(
                    gameId,
                    game.crashPoint,
                    game.autoCashout,
                    reward,
                    lootRarity
                );
            } else {
                // Crashed before auto-cashout
                game.crashed = true;
                game.cashedOut = true;

                uint256 lootRarity = uint256(keccak256(abi.encodePacked(gameId, block.timestamp))) % 1000;

                games[gameId] = GameResult({
                    player: game.player,
                    gameId: gameId,
                    crashPoint: game.crashPoint,
                    cashoutPoint: 0,
                    reward: 0,
                    lootRarity: lootRarity
                });

                emit GameCrashed(gameId, game.crashPoint);
                emit GameSettled(
                    gameId,
                    game.crashPoint,
                    0,
                    0,
                    lootRarity
                );
            }

            delete activeGames[gameId];
        }
    }

    /**
     * @dev Get current multiplier for a game
     * Mission X: Public view function for frontend to display multiplier
     */
    function getCurrentMultiplier(uint256 gameId) external view returns (uint256) {
        ActiveGame memory game = activeGames[gameId];
        if (game.gameStartedAt == 0 || game.crashPoint == 0) {
            return 10000; // 1x (game not started yet)
        }
        if (game.crashed || game.cashedOut) {
            return game.crashPoint; // Return crash point if game ended
        }
        uint256 timeElapsed = block.timestamp - game.gameStartedAt;
        return 10000 + (timeElapsed * MULTIPLIER_PER_SECOND);
    }

    function getGame(uint256 gameId) external view returns (GameResult memory) {
        return games[gameId];
    }

    function getActiveGame(uint256 gameId) external view returns (ActiveGame memory) {
        return activeGames[gameId];
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
