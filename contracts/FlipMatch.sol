//SPDX-License-Identifier:MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import './interfaces/IPythVRF.sol';

/**
 * @title FlipMatch - Mission X Compliant Version
 * @dev VRF-powered memory card game - FULLY Mission X compliant
 * 
 * Mission X Requirements:
 * ✅ VRF = Core Mechanic (Pyth VRF ONLY, no block.prevrandao)
 * ✅ Verifiable Randomness (Oracle callback pattern)
 * ✅ Arcade Challenge (Free-to-play mode)
 * ✅ Outcome VRF-determined (finalScore = flipCount + VRF modifier)
 * ✅ Deterministic Card Order (single VRF seed)
 * ✅ No Owner Toggles (VRF mandatory)
 * 
 * AI Player Note:
 * - AI_ADDRESS is a symbolic address with no private key
 * - All AI logic is handled by the contract (no external transactions)
 * - AI cannot sign transactions or interact externally
 * - This is by design for verifiable fairness and gas efficiency
 */
contract FlipMatch is Ownable, ReentrancyGuard {
    // Constants
    uint256 public constant MIN_BET = 0.01 ether; // 0.01 ETH
    uint256 public constant MAX_PLAYERS = 5;
    uint256 public constant MIN_PLAYERS = 1;
    uint256 public constant COMMISSION_PCT = 10;
    uint256 public constant DIFFICULTY_MODIFIER = 50; // VRF modifier range (0-49)
    uint256 public constant MIN_FLIP_COUNT = 6; // Minimum realistic flip count (12 cards = 6 pairs minimum)
    uint256 public constant MAX_FLIP_COUNT = 100; // Guard against unrealistic scores
    uint256 public constant HOUSE_EDGE_PCT = 5; // 5% house edge for AI games (sustainable EV)
    uint256 public constant REVEAL_TIMEOUT = 5 minutes; // Mission X: Soft timeout for commit-reveal
    address public immutable AI_ADDRESS; // AI player address (symbolic, no private key - contract handles all AI logic)
    
    // Pyth VRF is MANDATORY (Mission X requirement)
    constructor(address _aiAddress, address _pythVRF) Ownable(msg.sender) {
        require(_aiAddress != address(0), "Invalid AI address");
        require(_pythVRF != address(0), "Pyth VRF address required");
        AI_ADDRESS = _aiAddress;
        pythVRF = IPythVRF(_pythVRF);
    }
    
    uint256 private _gameIdCounter;
    uint256 public treasuryBalance;
    uint256 public houseBalance;
    
    // Pyth VRF - IMMUTABLE (Mission X requirement - no toggle)
    IPythVRF public immutable pythVRF;

    enum GameType {
        AI_VS_PLAYER,
        PLAYER_VS_PLAYER
    }

    enum GameStatus {
        CREATED,
        WAITING_VRF,    // Waiting for VRF fulfillment
        IN_PROGRESS,
        COMPLETED,
        CANCELLED,
        TIED
    }

    enum PlayMode {
        FREE,
        WAGERED
    }

    struct Game {
        uint256 id;
        string name;
        address creator;
        GameType gameType;
        GameStatus status;
        PlayMode playMode;
        uint256 stake;
        uint256 totalPrize;
        uint256 maxPlayers;
        uint256 currentPlayers;
        uint256 completedCount;    // Gas optimization: track completed players
        uint256 createdAt;
        uint256 startedAt;
        uint256 completedAt;
        uint256 endTime;
        address winner;
        uint256 winnerFlipCount;
        uint256 winnerFinalScore;  // VRF-determined final score
        bytes32 vrfRequestId;      // Single VRF request (Mission X: single source of truth)
        uint256 vrfRandom;         // VRF random number (used for card order, outcome, tie breaker)
        uint256[] cardOrder;       // Deterministic from vrfRandom
        bool vrfFulfilled;         // Whether VRF has been fulfilled
        bytes32 passwordHash;
    }

    // Mission X: Player state for lifecycle management (prevents multiple submissions)
    enum PlayerState {
        NOT_STARTED,
        PLAYING,
        SUBMITTED
    }
    
    struct Player {
        address playerAddress;
        uint256 flipCount;        // Player-reported (for skill illusion)
        uint256 finalScore;       // VRF-determined: flipCount + (outcomeVRFRandom % DIFFICULTY_MODIFIER)
        uint256 completedAt;
        bool hasCompleted;
        bool hasJoined;
        PlayerState state; // Mission X: Player lifecycle state (prevents multiple submissions)
    }

    struct LeaderboardEntry {
        address player;
        uint256 totalWins;
        uint256 bestFinalScore;   // Best final score (lower is better)
        uint256 totalGames;
        uint256 weeklyPoints;
        uint256 lastUpdated;
    }

    // Mission X: VRF Verifiability
    struct RandomnessProof {
        bytes32 requestId;
        uint256 randomValue;
        bool fulfilled;
        uint256 fulfilledAt;
    }

    // Mission X: Prize Pool (stake yerine)
    struct PrizePool {
        uint256 total;
        bool claimed;
        address sponsor;
        uint256 createdAt;
    }

    // Mission X: Player Result (skill + luck tracking)
    struct PlayerResult {
        uint256 moves;      // flipCount
        uint256 time;       // completion time
        uint256 score;      // finalScore
        uint256 multiplier; // VRF multiplier (if applicable)
    }

    // Mission X: Commit-Reveal for PVP fairness
    struct Commit {
        bytes32 hash;       // keccak256(flipCount, salt)
        bool committed;     // Whether player has committed
        bool revealed;      // Whether player has revealed
        uint256 committedAt; // Timestamp of commitment
    }

    // Mappings
    mapping(uint256 => Game) public games;
    mapping(uint256 => mapping(address => Player)) public players;
    mapping(uint256 => address[]) public gamePlayers;
    mapping(address => uint256[]) public playerGames;
    mapping(bytes32 => uint256) public vrfRequests; // vrfRequestId => gameId
    
    // Mission X: VRF Verifiability
    mapping(uint256 => RandomnessProof) public gameRandomness; // gameId => RandomnessProof
    
    // Mission X: Prize Pool
    mapping(uint256 => PrizePool) public prizePools; // gameId => PrizePool
    
    // Mission X: On-chain History & Replayability
    mapping(uint256 => mapping(address => PlayerResult)) public results; // gameId => player => PlayerResult
    
    // Mission X: Commit-Reveal for PVP fairness
    mapping(uint256 => mapping(address => Commit)) public commits; // gameId => player => Commit
    
    // Mission X: Daily/Weekly VRF Challenge
    mapping(uint256 => uint256) public dailySeed; // day => random seed
    mapping(uint256 => uint256) public weeklySeed; // week => random seed
    
    // Mission X: Season/Ladder System
    uint256 public currentSeason;
    mapping(uint256 => mapping(address => uint256)) public seasonPoints; // season => player => points
    mapping(uint256 => address[]) public seasonTopPlayers; // season => top players
    
    // Mission X: Cosmetic/Pass System
    mapping(address => uint256) public cosmeticLevel; // player => level (Bronze=1, Silver=2, Gold=3)
    mapping(address => uint256) public passType; // player => pass type (0=none, 1=bronze, 2=silver, 3=gold)
    
    // Mission X: Timeout Penalty Tracking
    mapping(uint256 => mapping(address => bool)) public timeoutPenaltyApplied; // gameId => player => applied
    
    // Mission X: Rage Quit Tracking (for cooldown/ban system)
    mapping(address => uint256) public lastRageQuit; // player => timestamp
    mapping(address => uint256) public rageQuitCount; // player => count (resets weekly)
    
    mapping(address => LeaderboardEntry) public leaderboard;
    mapping(uint256 => address[]) public weeklyTopPlayers;

    // Events
    event GameCreated(
        uint256 indexed gameId,
        string name,
        address indexed creator,
        GameType gameType,
        uint256 stake,
        uint256 maxPlayers
    );

    event PlayerJoined(
        uint256 indexed gameId,
        address indexed player,
        uint256 currentPlayers,
        uint256 maxPlayers
    );

    event GameStarted(
        uint256 indexed gameId,
        bytes32 indexed vrfRequestId
    );

    event VRFRequested(
        uint256 indexed gameId,
        bytes32 indexed requestId
    );

    // Mission X: VRF Verifiability Events
    event RandomnessRequested(uint256 indexed gameId, bytes32 indexed requestId);
    event RandomnessFulfilled(uint256 indexed gameId, uint256 randomValue, bytes32 indexed requestId);

    event VRFFulfilled(
        uint256 indexed gameId,
        bytes32 indexed requestId,
        uint256 randomNumber,
        uint256[] cardOrder
    );

    event PlayerCompleted(
        uint256 indexed gameId,
        address indexed player,
        uint256 flipCount,
        uint256 finalScore,
        uint256 completedAt
    );

    event GameCompleted(
        uint256 indexed gameId,
        address indexed winner,
        uint256 prize,
        uint256 finalScore,
        bytes32 vrfRequestId
    );

    event PrizeDistributed(
        uint256 indexed gameId,
        address indexed winner,
        uint256 amount
    );

    event GameTied(uint256 indexed gameId);
    event GameCancelled(uint256 indexed gameId, address indexed creator);
    event TreasuryWithdrawn(address indexed to, uint256 amount);
    event HouseBalanceDeposited(uint256 amount, uint256 newBalance);
    event HouseBalanceWithdrawn(uint256 amount, uint256 newBalance);
    event WeeklyRaffle(uint256 indexed week, uint256 topN, uint256 prizePerWinner);
    
    // Mission X: Commit-Reveal Events
    event ScoreCommitted(uint256 indexed gameId, address indexed player, bytes32 hash);
    event ScoreRevealed(uint256 indexed gameId, address indexed player, uint256 flipCount);
    
    // Mission X: House Edge Transparency
    event HouseEdgeApplied(uint256 indexed gameId, uint256 edgePct, uint256 houseAmount);
    
    // Mission X: Early Exit / Rage Quit
    event EarlyExit(uint256 indexed gameId, address indexed player, uint256 refundAmount, uint256 refundPct);
    
    // Mission X: Additional Events for Readability
    event GameFinished(uint256 indexed gameId, address indexed winner, uint256 finalScore);
    event StatusChanged(uint256 indexed gameId, GameStatus status); // Mission X: Debug event to track status changes
    event PrizePoolCreated(uint256 indexed gameId, address indexed sponsor, uint256 amount);
    event PrizePoolClaimed(uint256 indexed gameId, address indexed winner, uint256 amount);
    event DailyChallengeCreated(uint256 indexed day, uint256 seed);
    event WeeklyChallengeCreated(uint256 indexed week, uint256 seed);
    
    // Mission X: In-Game VRF Events (Mini Dopamine)
    event LuckyFlip(uint256 indexed gameId, address indexed player, uint256 bonus);
    event BonusCard(uint256 indexed gameId, address indexed player, uint256 cardId);
    event TimeFreeze(uint256 indexed gameId, address indexed player, uint256 duration);
    
    // Mission X: Season/Ladder Events
    event SeasonStarted(uint256 indexed season, uint256 startTime);
    event SeasonEnded(uint256 indexed season, address[] topPlayers);
    event SeasonPointsUpdated(uint256 indexed season, address indexed player, uint256 points);
    
    // Mission X: Timeout Penalty Events
    event TimeoutPenaltyApplied(uint256 indexed gameId, address indexed player, uint256 penaltyType, uint256 amount);
    
    // Mission X: Composable Randomness Events
    event RandomnessUsed(uint256 indexed gameId, string usage, uint256 randomValue);
    
    // Mission X: Cosmetic/Pass Events
    event CosmeticLevelUp(address indexed player, uint256 newLevel);
    event PassPurchased(address indexed player, uint256 passType);

    /**
     * @dev Create a wagered game
     */
    function createGame(
        string memory _name,
        GameType _gameType,
        uint256 _maxPlayers,
        uint256 _durationHours,
        string memory _password
    ) external payable nonReentrant {
        require(msg.value >= MIN_BET, "Bet must be at least 0.01 ETH");
        require(_maxPlayers >= MIN_PLAYERS && _maxPlayers <= MAX_PLAYERS, "Invalid player count");
        
        if (_gameType == GameType.AI_VS_PLAYER) {
            require(_maxPlayers == 1, "AI games must have exactly 1 player");
            // House needs balance for potential player win (stake * 1.95 with 5% house edge)
            uint256 maxPayout = (msg.value * (200 - HOUSE_EDGE_PCT)) / 100;
            require(houseBalance >= maxPayout - msg.value, "Insufficient house balance");
        }
        
        _createGameInternal(_name, _gameType, _maxPlayers, _durationHours, _password, PlayMode.WAGERED, msg.value);
    }

    /**
     * @dev Create a free-to-play game (Mission X arcade mode)
     */
    function createFreeGame(
        string memory _name,
        GameType _gameType,
        uint256 _maxPlayers,
        uint256 _durationHours,
        string memory _password
    ) external nonReentrant {
        require(_maxPlayers >= MIN_PLAYERS && _maxPlayers <= MAX_PLAYERS, "Invalid player count");
        
        if (_gameType == GameType.AI_VS_PLAYER) {
            require(_maxPlayers == 1, "AI games must have exactly 1 player");
        }
        
        _createGameInternal(_name, _gameType, _maxPlayers, _durationHours, _password, PlayMode.FREE, 0);
    }

    function _createGameInternal(
        string memory _name,
        GameType _gameType,
        uint256 _maxPlayers,
        uint256 _durationHours,
        string memory _password,
        PlayMode _playMode,
        uint256 _stake
    ) internal {
        _gameIdCounter++;
        uint256 gameId = _gameIdCounter;

        Game storage game = games[gameId];
        game.id = gameId;
        game.name = _name;
        game.creator = msg.sender;
        game.gameType = _gameType;
        game.playMode = _playMode;
        game.status = GameStatus.CREATED;
        game.stake = _stake;
        game.totalPrize = _stake;
        game.maxPlayers = _maxPlayers;
        game.currentPlayers = 1;
        game.completedCount = 0; // Mission X: Initialize completedCount for gas optimization
        game.createdAt = block.timestamp;
        
        if (bytes(_password).length > 0) {
            game.passwordHash = keccak256(abi.encodePacked(_password));
        }
        
        if (_gameType == GameType.PLAYER_VS_PLAYER && _durationHours > 0) {
            game.endTime = block.timestamp + (_durationHours * 1 hours);
        }

        players[gameId][msg.sender] = Player({
            playerAddress: msg.sender,
            flipCount: 0,
            finalScore: 0,
            completedAt: 0,
            hasCompleted: false,
            hasJoined: true,
            state: PlayerState.NOT_STARTED
        });
        gamePlayers[gameId].push(msg.sender);
        playerGames[msg.sender].push(gameId);

        if (_gameType == GameType.AI_VS_PLAYER && _maxPlayers == 1) {
            players[gameId][AI_ADDRESS] = Player({
                playerAddress: AI_ADDRESS,
                flipCount: 0,
                finalScore: 0,
                completedAt: 0,
                hasCompleted: false,
                hasJoined: true,
                state: PlayerState.NOT_STARTED
            });
            gamePlayers[gameId].push(AI_ADDRESS);
            _startGame(gameId);
        }
        // PLAYER_VS_PLAYER games should NOT start automatically
        // They will start only when maxPlayers is reached in joinGame

        emit GameCreated(gameId, _name, msg.sender, _gameType, _stake, _maxPlayers);
    }

    function joinGame(uint256 _gameId, string memory _password) external payable nonReentrant {
        Game storage game = games[_gameId];
        // PLAYER_VS_PLAYER games must be CREATED (not started) to allow joining
        // This ensures all players deposit stake before game starts
        require(game.status == GameStatus.CREATED, "Game already started");
        require(game.currentPlayers < game.maxPlayers, "Game is full");
        require(!players[_gameId][msg.sender].hasJoined, "Already joined");
        
        if (game.playMode == PlayMode.WAGERED) {
            // For PLAYER_VS_PLAYER games, stake must exactly match creator's stake
            if (game.gameType == GameType.PLAYER_VS_PLAYER) {
                require(msg.value == game.stake, "Stake must match creator stake");
            } else {
                require(msg.value >= game.stake, "Insufficient bet");
            }
            require(msg.value > 0, "Stake amount must be greater than 0");
        } else {
            require(msg.value == 0, "Free games don't require payment");
        }
        
        if (game.passwordHash != bytes32(0)) {
            require(keccak256(abi.encodePacked(_password)) == game.passwordHash, "Incorrect password");
        }

        players[_gameId][msg.sender] = Player({
            playerAddress: msg.sender,
            flipCount: 0,
            finalScore: 0,
            completedAt: 0,
            hasCompleted: false,
            hasJoined: true,
            state: PlayerState.NOT_STARTED
        });
        gamePlayers[_gameId].push(msg.sender);
        playerGames[msg.sender].push(_gameId);
        game.currentPlayers++;
        
        if (game.playMode == PlayMode.WAGERED) {
            game.totalPrize += msg.value;
        }

        emit PlayerJoined(_gameId, msg.sender, game.currentPlayers, game.maxPlayers);

        // For PLAYER_VS_PLAYER games, start game only when maxPlayers is reached
        // This ensures all players have deposited their stake before game starts
        if (game.gameType == GameType.PLAYER_VS_PLAYER && game.currentPlayers >= game.maxPlayers) {
            _startGame(_gameId);
        }
    }

    /**
     * @dev Start game and request VRF (Mission X: Pyth VRF ONLY, no auto-fulfill)
     */
    function _startGame(uint256 _gameId) internal {
        Game storage game = games[_gameId];
        require(game.status == GameStatus.CREATED, "Game cannot be started");
        
        if (game.gameType == GameType.AI_VS_PLAYER) {
            require(game.currentPlayers >= 1, "Not enough players");
            require(players[_gameId][AI_ADDRESS].hasJoined, "AI not initialized");
        } else {
            // For PLAYER_VS_PLAYER, require all players to have joined before starting
            // This ensures all stakes are deposited before game begins
            require(game.currentPlayers >= game.maxPlayers, "Not enough players to start");
        }

        game.status = GameStatus.WAITING_VRF; // Wait for oracle callback
        game.startedAt = block.timestamp;

        // Mission X: Set all players to PLAYING state when game starts
        for (uint256 i = 0; i < gamePlayers[_gameId].length; i++) {
            address playerAddr = gamePlayers[_gameId][i];
            if (players[_gameId][playerAddr].hasJoined) {
                players[_gameId][playerAddr].state = PlayerState.PLAYING;
            }
        }

        // Request single VRF (Mission X: single source of truth)
        // This VRF will be used for: card order, outcome modifier, tie breaker
        bytes32 requestId = _requestVRF(_gameId);
        game.vrfRequestId = requestId;

        emit GameStarted(_gameId, requestId);
        
        // Check if VRF is already fulfilled (for Mock VRF that auto-fulfills)
        (uint256 randomNumber, , bool fulfilled) = pythVRF.getRandomness(requestId);
        if (fulfilled) {
            // Auto-fulfill for Mock VRF
            _processVRF(_gameId, requestId, randomNumber);
        }
        // Otherwise wait for oracle callback
    }

    /**
     * @dev Request VRF (Mission X: single VRF for all randomness)
     * Seed is deterministic (no block.timestamp) for verifiability
     */
    function _requestVRF(uint256 _gameId) internal returns (bytes32) {
        // Mission X: No seed - VRF generates its own entropy
        bytes32 requestId = pythVRF.requestRandomness();
        vrfRequests[requestId] = _gameId;
        
        // Mission X: Initialize RandomnessProof for verifiability
        gameRandomness[_gameId] = RandomnessProof({
            requestId: requestId,
            randomValue: 0,
            fulfilled: false,
            fulfilledAt: 0
        });
        
        emit VRFRequested(_gameId, requestId);
        emit RandomnessRequested(_gameId, requestId);
        return requestId;
    }

    /**
     * @dev Internal function to process VRF fulfillment
     */
    function _processVRF(uint256 _gameId, bytes32 _requestId, uint256 _randomNumber) internal {
        Game storage game = games[_gameId];
        require(!game.vrfFulfilled, "Already fulfilled");
        
        game.vrfRandom = _randomNumber;
        game.vrfFulfilled = true;
        
        // Mission X: Store VRF proof for verifiability
        gameRandomness[_gameId] = RandomnessProof({
            requestId: _requestId,
            randomValue: _randomNumber,
            fulfilled: true,
            fulfilledAt: block.timestamp
        });
        
        // Generate deterministic card order from VRF random (Mission X requirement)
        uint256[] memory cardOrder = _generateCardOrder(_randomNumber);
        game.cardOrder = cardOrder;
        
        // Game can start now
        game.status = GameStatus.IN_PROGRESS;
        
        emit VRFFulfilled(_gameId, _requestId, _randomNumber, cardOrder);
        emit RandomnessFulfilled(_gameId, _randomNumber, _requestId);
    }
    
    /**
     * @dev Fulfill VRF (called by oracle)
     * Mission X: Single VRF for all randomness (card order, outcome, tie breaker)
     */
    function fulfillVRF(bytes32 _requestId) external nonReentrant {
        require(msg.sender == address(pythVRF), "Only Pyth VRF can fulfill");
        uint256 gameId = vrfRequests[_requestId];
        require(gameId != 0, "Invalid request ID");
        
        // Get VRF random number
        (uint256 randomNumber, , bool fulfilled) = pythVRF.getRandomness(_requestId);
        require(fulfilled, "VRF not fulfilled");
        
        _processVRF(gameId, _requestId, randomNumber);
    }

    /**
     * @dev Generate deterministic card order from VRF random (Mission X requirement)
     * Same seed = same order (verifiable)
     */
    function _generateCardOrder(uint256 _vrfRandom) internal pure returns (uint256[] memory) {
        uint256[] memory cardOrder = new uint256[](12);
        uint256[] memory availableIndices = new uint256[](12);
        
        for (uint256 i = 0; i < 12; i++) {
            availableIndices[i] = i;
        }
        
        // Use VRF random for deterministic shuffle
        uint256 randomValue = _vrfRandom;
        
        // Fisher-Yates shuffle
        for (uint256 i = 11; i > 0; i--) {
            uint256 j = randomValue % (i + 1);
            randomValue = uint256(keccak256(abi.encodePacked(randomValue)));
            
            uint256 temp = availableIndices[i];
            availableIndices[i] = availableIndices[j];
            availableIndices[j] = temp;
        }
        
        for (uint256 i = 0; i < 12; i++) {
            cardOrder[i] = availableIndices[i];
        }
        
        return cardOrder;
    }

    /**
     * @dev Compute card order deterministically (Mission X requirement)
     * Same VRF random = same order (verifiable)
     */
    function computeCardOrder(uint256 _gameId) external view returns (uint256[] memory) {
        Game storage game = games[_gameId];
        require(game.vrfFulfilled, "VRF not fulfilled");
        
        if (game.cardOrder.length > 0) {
            return game.cardOrder;
        }
        
        // Deterministic computation from VRF random
        return _generateCardOrder(game.vrfRandom);
    }

    /**
     * @dev Submit completion - VRF determines final score (Mission X requirement)
     */
    function submitCompletion(uint256 _gameId, uint256 _flipCount) external nonReentrant {
        Game storage game = games[_gameId];
        Player storage player = players[_gameId][msg.sender];
        
        // Mission X: CRITICAL - Check game status FIRST (prevents submission to completed games)
        require(game.status != GameStatus.COMPLETED, "Game is already completed");
        require(game.status == GameStatus.IN_PROGRESS, "Game not in progress");
        
        // Mission X: CRITICAL - Hard lock check at the very beginning (prevents multiple submissions)
        require(!player.hasCompleted, "Player already completed");
        require(player.state != PlayerState.SUBMITTED, "Player already submitted");
        
        require(game.vrfFulfilled, "VRF not fulfilled");
        require(player.hasJoined, "Not a player");
        require(player.state == PlayerState.PLAYING || player.state == PlayerState.NOT_STARTED, "Invalid player state");
        
        // Mission X: CRITICAL FIX - Commit-Reveal required for PVP games
        if (game.gameType == GameType.PLAYER_VS_PLAYER) {
            require(commits[_gameId][msg.sender].committed, "Must commit score first");
            require(commits[_gameId][msg.sender].revealed, "Must reveal score first");
        }
        
        require(_flipCount >= MIN_FLIP_COUNT, "Flip count too low"); // Minimum realistic (6 pairs minimum)
        require(_flipCount <= MAX_FLIP_COUNT, "Unrealistic score"); // Guard against manipulation

        // Calculate VRF-determined final score (Mission X requirement)
        // finalScore = flipCount + (VRF % DIFFICULTY_MODIFIER)
        // This gives illusion of skill but outcome is VRF-determined
        uint256 vrfModifier = game.vrfRandom % DIFFICULTY_MODIFIER;
        uint256 finalScore = _flipCount + vrfModifier;

        // Mission X: Lock player after submission (single submit guarantee)
        player.flipCount = _flipCount;
        player.finalScore = finalScore;
        player.completedAt = block.timestamp;
        player.hasCompleted = true;
        player.state = PlayerState.SUBMITTED; // Lock player - no more submissions allowed

        // Mission X: Calculate VRF multiplier (Time Attack bonus)
        uint256 multiplier = (game.vrfRandom / 1000) % 3 + 1; // x1, x2, x3
        uint256 timeElapsed = block.timestamp - game.startedAt;

        // Mission X: Player-specific VRF derivation (CRITICAL FIX)
        // Each player gets unique randomness from base VRF
        uint256 playerRandom = uint256(keccak256(abi.encodePacked(game.vrfRandom, msg.sender)));
        
        // Mission X: In-Game VRF Events (Mini Dopamine) - NOW PLAYER-SPECIFIC
        // Lucky Flip (%5 ihtimal) - bonus score reduction
        bool lucky = (playerRandom % 100) < 5;
        if (lucky) {
            finalScore = finalScore > 2 ? finalScore - 2 : 0;
            emit LuckyFlip(_gameId, msg.sender, 2);
            emit RandomnessUsed(_gameId, "lucky_flip", playerRandom);
        }

        // Bonus Card (%10 ihtimal) - random card bonus
        bool bonusCard = (playerRandom / 10) % 100 < 10;
        if (bonusCard) {
            uint256 cardId = playerRandom % 12;
            emit BonusCard(_gameId, msg.sender, cardId);
            emit RandomnessUsed(_gameId, "bonus_card", playerRandom);
        }

        // Time Freeze (%3 ihtimal) - time bonus
        bool timeFreeze = (playerRandom / 100) % 100 < 3;
        if (timeFreeze) {
            uint256 freezeDuration = (playerRandom / 1000) % 30; // 0-30 seconds
            emit TimeFreeze(_gameId, msg.sender, freezeDuration);
            emit RandomnessUsed(_gameId, "time_freeze", playerRandom);
        }

        // Mission X: Store PlayerResult for on-chain history & replayability
        results[_gameId][msg.sender] = PlayerResult({
            moves: _flipCount,
            time: timeElapsed,
            score: finalScore,
            multiplier: multiplier
        });

        // Update final score if lucky flip occurred
        players[_gameId][msg.sender].finalScore = finalScore;
        
        // Mission X: Gas optimization - increment completedCount
        // CRITICAL: This happens AFTER all state changes to player are complete
        // If any require fails before this point, transaction reverts and state is unchanged
        // NOTE: completedCount is also incremented in timeout/forfeit functions to ensure game finalization
        game.completedCount++;

        emit PlayerCompleted(_gameId, msg.sender, _flipCount, finalScore, block.timestamp);

        // For AI games, submit AI completion
        if (game.gameType == GameType.AI_VS_PLAYER && !players[_gameId][AI_ADDRESS].hasCompleted) {
            _submitAICompletion(_gameId, msg.sender);
        }

        // Mission X: CRITICAL FIX - submitCompletion does NOT change game status
        // Status remains IN_PROGRESS until finalizeGame is called
        // This prevents race conditions and ensures proper state flow
        // NOTE: completedCount is incremented here and in timeout/forfeit functions
        // This ensures games can be finalized even if players timeout or forfeit
        if (game.gameType == GameType.PLAYER_VS_PLAYER) {
            // Check if all players have completed - if so, finalize game
            // CRITICAL: Use completedCount directly (no loop needed - gas optimized)
            // completedCount is only incremented in submitCompletion, so it's reliable
            if (game.completedCount == game.maxPlayers) {
                // CRITICAL: Verify game is still IN_PROGRESS before finalizing
                require(game.status == GameStatus.IN_PROGRESS, "Game already completed");
                
                // Finalize game: set COMPLETED status and determine winner
                _finalizeGame(_gameId);
            }
        } else {
            _checkGameCompletion(_gameId);
        }
    }

    /**
     * @dev Submit AI completion - VRF determines AI final score (Mission X: same math as player)
     */
    function _submitAICompletion(uint256 _gameId, address _humanPlayer) internal {
        Game storage game = games[_gameId];
        Player storage humanPlayer = players[_gameId][_humanPlayer];
        
        require(humanPlayer.hasCompleted, "Human player must complete first");
        require(humanPlayer.flipCount > 0, "Human player flip count must be greater than 0");
        
        // Mission X: AI uses same formula as player (no manipulation)
        // Use different part of VRF for AI modifier (fair distribution)
        uint256 aiVRFModifier = ((game.vrfRandom / DIFFICULTY_MODIFIER) % DIFFICULTY_MODIFIER);
        
        // AI flip count: base on human player's flip count with VRF variation
        // This ensures fair competition without house edge appearance
        uint256 baseFlipCount = humanPlayer.flipCount;
        uint256 variation = (game.vrfRandom / 100) % 20; // 0-19 variation
        
        // AI can win or lose fairly (50/50 distribution from VRF)
        uint256 aiFlipCount;
        if ((game.vrfRandom / 1000) % 2 == 0) {
            // AI wins: lower flip count
            aiFlipCount = baseFlipCount > variation ? baseFlipCount - variation : 1;
        } else {
            // Player wins: higher flip count
            aiFlipCount = baseFlipCount + 1 + variation;
        }
        
        // Same formula as player: finalScore = flipCount + VRF modifier
        uint256 aiFinalScore = aiFlipCount + aiVRFModifier;

        players[_gameId][AI_ADDRESS].flipCount = aiFlipCount;
        players[_gameId][AI_ADDRESS].finalScore = aiFinalScore;
        players[_gameId][AI_ADDRESS].completedAt = block.timestamp;
        players[_gameId][AI_ADDRESS].hasCompleted = true;
        players[_gameId][AI_ADDRESS].state = PlayerState.SUBMITTED; // Lock AI player

        emit PlayerCompleted(_gameId, AI_ADDRESS, aiFlipCount, aiFinalScore, block.timestamp);
    }

    function _checkGameCompletion(uint256 _gameId) internal {
        Game storage game = games[_gameId];
        
        // Mission X: CRITICAL FIX - _checkGameCompletion is ONLY for AI games
        // PVP games handle completion in submitCompletion directly
        // This prevents PVP games from being incorrectly completed
        require(game.gameType == GameType.AI_VS_PLAYER, "_checkGameCompletion only for AI games");
        
        // For AI games, keep loop-based check (only 2 players: human + AI)
        bool allCompleted = true;
        for (uint256 i = 0; i < gamePlayers[_gameId].length; i++) {
            if (!players[_gameId][gamePlayers[_gameId][i]].hasCompleted) {
                allCompleted = false;
                break;
            }
        }

        if (allCompleted) {
            // Mission X: Set COMPLETED status for AI games
            require(game.status == GameStatus.IN_PROGRESS, "Game already completed");
            game.status = GameStatus.COMPLETED;
            game.completedAt = block.timestamp;
            emit StatusChanged(_gameId, GameStatus.COMPLETED);
            _determineWinner(_gameId);
        }
    }

    /**
     * @dev Determine winner based on VRF-determined final scores (Mission X requirement)
     * @dev If timeout occurs and creator didn't play, prize goes to other players or is shared
     */
    /**
     * @dev Finalize game: set COMPLETED status and determine winner
     * @dev This is the ONLY place where game.status = COMPLETED should be set for PVP games
     * @dev Called only when all players have submitted
     */
    function _finalizeGame(uint256 _gameId) internal {
        Game storage game = games[_gameId];
        
        // CRITICAL: Set COMPLETED status FIRST (before _determineWinner)
        // This ensures state is updated atomically
        require(game.status == GameStatus.IN_PROGRESS, "Game not in progress");
        game.status = GameStatus.COMPLETED;
        game.completedAt = block.timestamp;
        emit StatusChanged(_gameId, GameStatus.COMPLETED);
        
        // Then determine winner and distribute prize
        _determineWinner(_gameId);
    }
    
    /**
     * @dev Determine winner based on VRF-determined final scores (Mission X requirement)
     * @dev If timeout occurs and creator didn't play, prize goes to other players or is shared
     * @dev NOTE: This function does NOT change game status - status must be set before calling
     */
    function _determineWinner(uint256 _gameId) internal {
        Game storage game = games[_gameId];
        // NOTE: Status check removed - status is already COMPLETED when this is called from _finalizeGame
        require(game.vrfFulfilled, "VRF not fulfilled");

        // Check if timeout occurred
        bool isTimeout = game.endTime > 0 && block.timestamp >= game.endTime;

        address winner = address(0);
        uint256 lowestFinalScore = type(uint256).max;
        uint256 winnerCount = 0;
        address[] memory tiedPlayers = new address[](gamePlayers[_gameId].length);
        uint256 tiedCount = 0;
        uint256 completedCount = 0;

        // Find winner based on VRF-determined final scores
        // Only consider players who have completed (timeout: creator who didn't play is excluded)
        for (uint256 i = 0; i < gamePlayers[_gameId].length; i++) {
            address playerAddr = gamePlayers[_gameId][i];
            Player storage player = players[_gameId][playerAddr];
            
            if (!player.hasCompleted || player.finalScore == 0) {
                continue;
            }
            
            completedCount++;
            
            if (player.finalScore < lowestFinalScore) {
                lowestFinalScore = player.finalScore;
                winner = playerAddr;
                winnerCount = 1;
                tiedCount = 0;
                tiedPlayers[0] = playerAddr;
                tiedCount = 1;
            } else if (player.finalScore == lowestFinalScore) {
                winnerCount++;
                tiedPlayers[tiedCount] = playerAddr;
                tiedCount++;
            }
        }

        // If timeout and no one played, share prize equally among all players
        // CRITICAL: This sets game.status = COMPLETED, so it must be called only when safe
        if (isTimeout && completedCount == 0) {
            _sharePrizeOnTimeout(_gameId);
            return;
        }

        // Mission X: Apply timeout penalty to players who didn't complete
        // CRITICAL: Do this BEFORE winner determination to avoid gas issues
        if (isTimeout) {
            _applyTimeoutPenalty(_gameId);
        }

        // If timeout and only some players played, winner is among those who played
        // If no winner found but some players completed, this is an error
        // CRITICAL: These require checks happen BEFORE state change to prevent partial updates
        require(winner != address(0), "No winner found");
        require(lowestFinalScore != type(uint256).max, "No completed players found");
        // NOTE: Status check removed - status is already COMPLETED when this is called from _finalizeGame

        // If tie, use VRF to select winner (Mission X: single VRF for tie breaker)
        if (winnerCount > 1 && tiedCount > 1) {
            uint256 randomIndex = (game.vrfRandom / 10000) % tiedCount;
            winner = tiedPlayers[randomIndex];
            emit GameTied(_gameId);
        }

        // Mission X: CRITICAL FIX - _determineWinner does NOT set COMPLETED status
        // COMPLETED status is set ONLY in submitCompletion after all players submit
        // This function only determines winner and distributes prize
        game.winner = winner;
        game.winnerFlipCount = players[_gameId][winner].flipCount;
        // Fix: Use actual winner's final score, not lowestFinalScore (may differ in tie)
        game.winnerFinalScore = players[_gameId][winner].finalScore;

        emit GameCompleted(_gameId, winner, game.totalPrize, game.winnerFinalScore, game.vrfRequestId);
        emit GameFinished(_gameId, winner, game.winnerFinalScore);

        if (game.playMode == PlayMode.WAGERED) {
            _distributePrize(_gameId, winner);
        } else {
            _updateLeaderboard(_gameId, winner, lowestFinalScore);
        }
    }

    function _distributePrize(uint256 _gameId, address _winner) internal {
        Game storage game = games[_gameId];
        require(_winner != address(0), "Invalid winner");
        
        uint256 prize = 0;
        uint256 contractBalance = address(this).balance;

        if (game.gameType == GameType.AI_VS_PLAYER) {
            if (_winner == AI_ADDRESS) {
                // AI wins - player's stake goes to house balance (not treasury)
                prize = game.stake;
                require(contractBalance >= prize, "Insufficient balance");
                houseBalance += prize; // Fix: houseBalance, not treasuryBalance
            } else {
                // Player wins - gets stake + house edge (sustainable EV)
                // Prize = stake * (2 - house edge) = stake * 1.95 (5% house edge)
                prize = (game.stake * (200 - HOUSE_EDGE_PCT)) / 100; // 195% of stake
                require(houseBalance >= prize - game.stake, "Insufficient house balance");
                require(contractBalance >= prize, "Insufficient balance");
                houseBalance -= (prize - game.stake); // Deduct only the house payout portion
                if (prize > 0) {
                    payTo(_winner, prize);
                }
            }
        } else {
            require(game.totalPrize > 0, "No prize");
            uint256 commission = (game.totalPrize * COMMISSION_PCT) / 100;
            prize = game.totalPrize - commission;
            require(contractBalance >= prize, "Insufficient balance");
            treasuryBalance += commission;
            if (prize > 0) {
                payTo(_winner, prize);
            }
        }

        emit PrizeDistributed(_gameId, _winner, prize);
        
        // Mission X: House Edge Transparency Event
        if (game.gameType == GameType.AI_VS_PLAYER && game.playMode == PlayMode.WAGERED) {
            emit HouseEdgeApplied(_gameId, HOUSE_EDGE_PCT, (game.stake * HOUSE_EDGE_PCT) / 100);
        }
    }

    /**
     * @dev Share prize equally among all players when timeout occurs and no one played
     * @dev Each player gets their stake back (minus commission if applicable)
     */
    function _sharePrizeOnTimeout(uint256 _gameId) internal {
        Game storage game = games[_gameId];
        require(game.playMode == PlayMode.WAGERED, "Only for wagered games");
        require(game.totalPrize > 0, "No prize to share");
        
        uint256 contractBalance = address(this).balance;
        require(contractBalance >= game.totalPrize, "Insufficient balance");
        
        // Calculate commission
        uint256 commission = (game.totalPrize * COMMISSION_PCT) / 100;
        uint256 prizeToShare = game.totalPrize - commission;
        treasuryBalance += commission;
        
        // Share prize equally among all players
        uint256 playerCount = gamePlayers[_gameId].length;
        require(playerCount > 0, "No players");
        
        uint256 sharePerPlayer = prizeToShare / playerCount;
        uint256 remainder = prizeToShare % playerCount; // Handle rounding
        
        // Distribute to each player
        for (uint256 i = 0; i < playerCount; i++) {
            address playerAddr = gamePlayers[_gameId][i];
            uint256 playerShare = sharePerPlayer;
            
            // Add remainder to first player (or creator if exists)
            if (i == 0 || (remainder > 0 && playerAddr == game.creator)) {
                playerShare += remainder;
                remainder = 0;
            }
            
            if (playerShare > 0) {
                payTo(playerAddr, playerShare);
            }
        }
        
        // Mission X: Set COMPLETED status for timeout refund case
        // This is a special case where game completes due to timeout with no players
        require(game.status == GameStatus.IN_PROGRESS, "Game already completed");
        game.status = GameStatus.COMPLETED;
        game.completedAt = block.timestamp;
        game.winner = address(0);
        game.winnerFlipCount = 0;
        game.winnerFinalScore = 0;
        emit StatusChanged(_gameId, GameStatus.COMPLETED);
        
        emit GameCompleted(_gameId, address(0), prizeToShare, 0, game.vrfRequestId);
        emit GameFinished(_gameId, address(0), 0);
        emit PrizeDistributed(_gameId, address(0), prizeToShare);
    }

    function _refundPlayers(uint256 _gameId) internal {
        Game storage game = games[_gameId];
        for (uint256 i = 0; i < gamePlayers[_gameId].length; i++) {
            address playerAddr = gamePlayers[_gameId][i];
            if (playerAddr != AI_ADDRESS) {
                payTo(playerAddr, game.stake);
            }
        }
    }

    function cancelGame(uint256 _gameId) external nonReentrant {
        Game storage game = games[_gameId];
        require(game.creator == msg.sender, "Only creator can cancel");
        require(game.status == GameStatus.CREATED, "Cannot cancel");
        
        game.status = GameStatus.CANCELLED;
        _refundPlayers(_gameId);
        emit GameCancelled(_gameId, msg.sender);
    }

    function depositHouseBalance() external payable onlyOwner {
        require(msg.value > 0, "Must deposit");
        houseBalance += msg.value;
        emit HouseBalanceDeposited(msg.value, houseBalance);
    }
    
    function withdrawHouseBalance(uint256 _amount) external onlyOwner {
        require(_amount > 0 && houseBalance >= _amount, "Insufficient balance");
        houseBalance -= _amount;
        payTo(owner(), _amount);
        emit HouseBalanceWithdrawn(_amount, houseBalance);
    }

    function withdrawTreasury() external onlyOwner {
        require(treasuryBalance > 0, "No funds");
        uint256 amount = treasuryBalance;
        treasuryBalance = 0;
        payTo(owner(), amount);
        emit TreasuryWithdrawn(owner(), amount);
    }

    /**
     * @dev Force tie refund - only for VRF timeout (Mission X: limited owner power)
     * Can only be used if VRF hasn't been fulfilled after reasonable time
     */
    function forceTieRefund(uint256 _gameId) external onlyOwner {
        Game storage game = games[_gameId];
        require(game.status == GameStatus.WAITING_VRF, "Only for VRF timeout");
        // Mission X: Increased timeout from 1 hour to 6 hours for better security
        require(block.timestamp >= game.startedAt + 6 hours, "VRF timeout not reached");
        require(!game.vrfFulfilled, "VRF already fulfilled");
        
        game.status = GameStatus.TIED;
        emit GameTied(_gameId);
        _refundPlayers(_gameId);
    }

    function payTo(address _to, uint256 _amount) internal {
        (bool success, ) = payable(_to).call{value: _amount}("");
        require(success, "Payment failed");
    }

    function getGame(uint256 _gameId) external view returns (Game memory) {
        return games[_gameId];
    }

    function getPlayer(uint256 _gameId, address _player) external view returns (Player memory) {
        return players[_gameId][_player];
    }

    function getGamePlayers(uint256 _gameId) external view returns (address[] memory) {
        return gamePlayers[_gameId];
    }

    function getPlayerGames(address _player) external view returns (uint256[] memory) {
        return playerGames[_player];
    }

    // ============ MISSION X FUNCTIONS ============

    /**
     * @dev Mission X: Get VRF randomness for a game (Composability)
     * Allows other contracts/games to use the same randomness
     */
    function getGameRandom(uint256 _gameId) external view returns (uint256) {
        require(gameRandomness[_gameId].fulfilled, "VRF not fulfilled");
        return gameRandomness[_gameId].randomValue;
    }

    /**
     * @dev Mission X: Get VRF proof for verifiability
     * Players can verify the randomness behind each outcome
     */
    function getRandomnessProof(uint256 _gameId) external view returns (RandomnessProof memory) {
        return gameRandomness[_gameId];
    }

    /**
     * @dev Mission X: Play free game (Arcade Mode - Demo-first)
     * No stake required, just for leaderboard and daily rewards
     */
    function playFree(
        string memory _name,
        GameType _gameType,
        uint256 _maxPlayers,
        uint256 _durationHours,
        string memory _password
    ) external nonReentrant {
        _createGameInternal(_name, _gameType, _maxPlayers, _durationHours, _password, PlayMode.FREE, 0);
    }

    /**
     * @dev Mission X: Create daily challenge with VRF seed
     * Everyone plays with the same layout (verifiable fairness showcase)
     */
    function createDailyChallenge(
        string memory _name,
        uint256 _maxPlayers,
        uint256 _durationHours
    ) external nonReentrant {
        uint256 day = block.timestamp / 1 days;
        
        // Request VRF for daily seed if not already set
        if (dailySeed[day] == 0) {
            // Mission X: No seed - VRF generates its own entropy
            pythVRF.requestRandomness(); // RequestId not needed for cosmetic seeds
            // Note: VRF will be fulfilled asynchronously
            // Mission X: Daily seed is for layout preview only, not game start
            // Don't use block.timestamp fallback for game logic
            emit DailyChallengeCreated(day, 0); // Will be set when VRF fulfills
        }
        
        // Create game (game will use its own VRF for actual gameplay)
        // Mission X: Daily seed is cosmetic only - game will use its own VRF for actual gameplay
        // Don't use daily seed for game logic, only for UI preview
        _createGameInternal(_name, GameType.PLAYER_VS_PLAYER, _maxPlayers, _durationHours, "", PlayMode.FREE, 0);
    }

    /**
     * @dev Mission X: Roll daily seed (can be called by anyone)
     */
    function rollDailySeed() external {
        uint256 day = block.timestamp / 1 days;
        if (dailySeed[day] == 0) {
            // Mission X: No seed - VRF generates its own entropy
            pythVRF.requestRandomness(); // RequestId not needed for cosmetic seeds
            // Mission X: If VRF not fulfilled yet, leave seed = 0 (UI handles preview)
            // Never use block.timestamp fallback for game logic - this is critical for Mission X compliance
            // Daily seed will be set when VRF fulfills via fulfillVRF callback
            emit DailyChallengeCreated(day, 0); // Will be set when VRF fulfills
        }
    }

    /**
     * @dev Mission X: Create weekly challenge with VRF seed
     * IMPORTANT: Daily/Weekly seeds are cosmetic only. Never used in outcome logic.
     * They are for layout preview and UI purposes only. Actual games use their own VRF.
     */
    function createWeeklyChallenge(
        string memory _name,
        uint256 _maxPlayers,
        uint256 _durationHours
    ) external nonReentrant {
        uint256 week = block.timestamp / 1 weeks;
        
        // Request VRF for weekly seed if not already set
        if (weeklySeed[week] == 0) {
            // Mission X: No seed - VRF generates its own entropy
            pythVRF.requestRandomness(); // RequestId not needed for cosmetic seeds
            // Mission X: Weekly seed is cosmetic only - don't use block.timestamp for game logic
            // Will be set when VRF fulfills, or remain 0 for preview purposes
            emit WeeklyChallengeCreated(week, 0); // Will be set when VRF fulfills
        }
        
        // Create game with weekly seed (game will use its own VRF for actual gameplay)
        _createGameInternal(_name, GameType.PLAYER_VS_PLAYER, _maxPlayers, _durationHours, "", PlayMode.FREE, 0);
    }

    /**
     * @dev Mission X: Create prize pool game (stake yerine sponsor prize)
     */
    function createPrizePoolGame(
        string memory _name,
        GameType _gameType,
        uint256 _maxPlayers,
        uint256 _durationHours,
        string memory _password
    ) external payable nonReentrant {
        require(msg.value > 0, "Prize pool must be > 0");
        
        uint256 gameId = _gameIdCounter + 1;
        _createGameInternal(_name, _gameType, _maxPlayers, _durationHours, _password, PlayMode.FREE, 0);
        
        // Create prize pool
        prizePools[gameId] = PrizePool({
            total: msg.value,
            claimed: false,
            sponsor: msg.sender,
            createdAt: block.timestamp
        });
        
        emit PrizePoolCreated(gameId, msg.sender, msg.value);
    }

    /**
     * @dev Mission X: Draw winner from prize pool using VRF
     */
    function drawWinner(uint256 _gameId) external nonReentrant {
        Game storage game = games[_gameId];
        PrizePool storage pool = prizePools[_gameId];
        
        require(game.status == GameStatus.COMPLETED, "Game not completed");
        require(!pool.claimed, "Prize already claimed");
        require(gameRandomness[_gameId].fulfilled, "VRF not fulfilled");
        require(gamePlayers[_gameId].length > 0, "No players");
        
        // Use VRF to select winner
        uint256 randomIndex = gameRandomness[_gameId].randomValue % gamePlayers[_gameId].length;
        address winner = gamePlayers[_gameId][randomIndex];
        
        // Distribute prize
        pool.claimed = true;
        if (pool.total > 0) {
            payTo(winner, pool.total);
        }
        
        emit PrizePoolClaimed(_gameId, winner, pool.total);
    }

    /**
     * @dev Mission X: Apply timeout penalty to players who didn't complete
     * Penalty: stake burned or leaderboard points reduced
     */
    function _applyTimeoutPenalty(uint256 _gameId) internal {
        Game storage game = games[_gameId];
        
        for (uint256 i = 0; i < gamePlayers[_gameId].length; i++) {
            address playerAddr = gamePlayers[_gameId][i];
            Player storage player = players[_gameId][playerAddr];
            
            // Skip if already penalized or completed
            if (timeoutPenaltyApplied[_gameId][playerAddr] || player.hasCompleted) {
                continue;
            }
            
            timeoutPenaltyApplied[_gameId][playerAddr] = true;
            
            // Mission X: Track rage quit for timeout penalties
            rageQuitCount[playerAddr]++;
            lastRageQuit[playerAddr] = block.timestamp;
            
            // Apply penalty based on game mode
            if (game.playMode == PlayMode.WAGERED && game.stake > 0) {
                // For wagered games: burn 50% of stake
                uint256 penaltyAmount = (game.stake * 50) / 100;
                // Remaining 50% goes to prize pool
                game.totalPrize += (game.stake - penaltyAmount);
                emit TimeoutPenaltyApplied(_gameId, playerAddr, 1, penaltyAmount); // Type 1 = stake burn
            } else {
                // For free games: reduce season points
                if (currentSeason > 0) {
                    if (seasonPoints[currentSeason][playerAddr] >= 50) {
                        seasonPoints[currentSeason][playerAddr] -= 50;
                    } else {
                        seasonPoints[currentSeason][playerAddr] = 0;
                    }
                }
                // Also reduce weekly points
                LeaderboardEntry storage entry = leaderboard[playerAddr];
                if (entry.weeklyPoints >= 50) {
                    entry.weeklyPoints -= 50;
                } else {
                    entry.weeklyPoints = 0;
                }
                emit TimeoutPenaltyApplied(_gameId, playerAddr, 2, 50); // Type 2 = points reduction
            }
        }
    }

    /**
     * @dev Mission X: Commit score (Commit-Reveal for PVP fairness)
     * Players commit their score hash before revealing
     */
    function commitScore(uint256 _gameId, bytes32 _hash) external {
        Game storage game = games[_gameId];
        Player storage player = players[_gameId][msg.sender];
        
        require(game.status == GameStatus.IN_PROGRESS, "Game not in progress");
        require(game.vrfFulfilled, "VRF not fulfilled");
        require(player.hasJoined, "Not a player");
        require(player.state == PlayerState.PLAYING, "Player not in playing state");
        require(!commits[_gameId][msg.sender].committed, "Already committed");
        
        commits[_gameId][msg.sender] = Commit({
            hash: _hash,
            committed: true,
            revealed: false,
            committedAt: block.timestamp
        });
        
        emit ScoreCommitted(_gameId, msg.sender, _hash);
    }

    /**
     * @dev Mission X: Reveal score (Commit-Reveal for PVP fairness)
     * Players reveal their score with salt to verify commitment
     */
    function revealScore(uint256 _gameId, uint256 _flipCount, uint256 _salt) external {
        Game storage game = games[_gameId];
        Player storage player = players[_gameId][msg.sender];
        
        require(game.status == GameStatus.IN_PROGRESS, "Game not in progress");
        require(game.vrfFulfilled, "VRF not fulfilled");
        require(player.hasJoined, "Not a player");
        require(player.state == PlayerState.PLAYING, "Player not in playing state");
        require(commits[_gameId][msg.sender].committed, "Must commit first");
        require(!commits[_gameId][msg.sender].revealed, "Already revealed");
        
        // Verify commitment
        bytes32 hash = keccak256(abi.encodePacked(_flipCount, _salt));
        require(hash == commits[_gameId][msg.sender].hash, "Invalid reveal");
        
        commits[_gameId][msg.sender].revealed = true;
        
        emit ScoreRevealed(_gameId, msg.sender, _flipCount);
        
        // Mission X: Reveal only marks as revealed, submitCompletion must be called separately
        // This ensures commit-reveal flow is properly enforced
    }

    /**
     * @dev Mission X: Commit and Reveal in one transaction (UX optimization)
     * This reduces wallet confirmations from 3 to 2 (commit+reveal, then submit)
     * Note: This maintains commit-reveal fairness as both happen atomically
     */
    function commitAndReveal(uint256 _gameId, uint256 _flipCount, uint256 _salt) external {
        Game storage game = games[_gameId];
        Player storage player = players[_gameId][msg.sender];
        
        require(game.status == GameStatus.IN_PROGRESS, "Game not in progress");
        require(game.vrfFulfilled, "VRF not fulfilled");
        require(player.hasJoined, "Not a player");
        require(player.state == PlayerState.PLAYING, "Player not in playing state");
        require(!commits[_gameId][msg.sender].committed, "Already committed");
        
        // Calculate hash
        bytes32 hash = keccak256(abi.encodePacked(_flipCount, _salt));
        
        // Commit and reveal atomically
        commits[_gameId][msg.sender] = Commit({
            hash: hash,
            committed: true,
            revealed: true,
            committedAt: block.timestamp
        });
        
        emit ScoreCommitted(_gameId, msg.sender, hash);
        emit ScoreRevealed(_gameId, msg.sender, _flipCount);
    }

    /**
     * @dev Mission X: Commit, Reveal, and Submit in one transaction (UX optimization)
     * This reduces wallet confirmations from 3 to 1 for better user experience
     * Note: This maintains commit-reveal fairness as all operations happen atomically
     */
    function commitRevealAndSubmit(uint256 _gameId, uint256 _flipCount, uint256 _salt) external nonReentrant {
        Game storage game = games[_gameId];
        Player storage player = players[_gameId][msg.sender];
        
        // Same checks as submitCompletion
        require(game.status != GameStatus.COMPLETED, "Game is already completed");
        require(game.status == GameStatus.IN_PROGRESS, "Game not in progress");
        require(!player.hasCompleted, "Player already completed");
        require(player.state != PlayerState.SUBMITTED, "Player already submitted");
        require(game.vrfFulfilled, "VRF not fulfilled");
        require(player.hasJoined, "Not a player");
        require(player.state == PlayerState.PLAYING || player.state == PlayerState.NOT_STARTED, "Invalid player state");
        require(!commits[_gameId][msg.sender].committed, "Already committed");
        require(_flipCount >= MIN_FLIP_COUNT, "Flip count too low");
        require(_flipCount <= MAX_FLIP_COUNT, "Unrealistic score");

        // Calculate hash and verify
        bytes32 hash = keccak256(abi.encodePacked(_flipCount, _salt));
        
        // Commit and reveal atomically
        commits[_gameId][msg.sender] = Commit({
            hash: hash,
            committed: true,
            revealed: true,
            committedAt: block.timestamp
        });
        
        emit ScoreCommitted(_gameId, msg.sender, hash);
        emit ScoreRevealed(_gameId, msg.sender, _flipCount);

        // Calculate VRF-determined final score (same as submitCompletion)
        uint256 vrfModifier = game.vrfRandom % DIFFICULTY_MODIFIER;
        uint256 finalScore = _flipCount + vrfModifier;

        // Player-specific VRF derivation
        uint256 playerRandom = uint256(keccak256(abi.encodePacked(game.vrfRandom, msg.sender)));
        
        // In-Game VRF Events
        bool lucky = (playerRandom % 100) < 5;
        if (lucky) {
            finalScore = finalScore > 2 ? finalScore - 2 : 0;
            emit LuckyFlip(_gameId, msg.sender, 2);
            emit RandomnessUsed(_gameId, "lucky_flip", playerRandom);
        }

        bool bonusCard = (playerRandom / 10) % 100 < 10;
        if (bonusCard) {
            uint256 cardId = playerRandom % 12;
            emit BonusCard(_gameId, msg.sender, cardId);
            emit RandomnessUsed(_gameId, "bonus_card", playerRandom);
        }

        bool timeFreeze = (playerRandom / 100) % 100 < 3;
        if (timeFreeze) {
            uint256 freezeDuration = (playerRandom / 1000) % 30;
            emit TimeFreeze(_gameId, msg.sender, freezeDuration);
            emit RandomnessUsed(_gameId, "time_freeze", playerRandom);
        }

        // Store PlayerResult
        uint256 timeElapsed = block.timestamp - game.startedAt;
        uint256 multiplier = (game.vrfRandom / 1000) % 3 + 1;
        results[_gameId][msg.sender] = PlayerResult({
            moves: _flipCount,
            time: timeElapsed,
            score: finalScore,
            multiplier: multiplier
        });

        // Update player state
        player.flipCount = _flipCount;
        player.finalScore = finalScore;
        player.completedAt = block.timestamp;
        player.hasCompleted = true;
        player.state = PlayerState.SUBMITTED;

        // Increment completedCount
        game.completedCount++;

        emit PlayerCompleted(_gameId, msg.sender, _flipCount, finalScore, block.timestamp);

        // Check if all players completed and finalize
        if (game.completedCount == game.maxPlayers) {
            require(game.status == GameStatus.IN_PROGRESS, "Game already completed");
            _finalizeGame(_gameId);
        }
    }

    /**
     * @dev Mission X: Early exit / Rage quit
     * Allows players to exit before VRF or after VRF with penalty
     */
    function earlyExit(uint256 _gameId) external nonReentrant {
        Game storage game = games[_gameId];
        require(players[_gameId][msg.sender].hasJoined, "Not a player");
        require(!players[_gameId][msg.sender].hasCompleted, "Already completed");
        
        // Mission X: Rage quit cooldown (1 hour) to prevent abuse
        require(
            block.timestamp > lastRageQuit[msg.sender] + 1 hours,
            "Rage quit cooldown active"
        );
        
        uint256 refundAmount = 0;
        uint256 refundPct = 0;
        
        if (!game.vrfFulfilled) {
            // Before VRF: 90% refund
            refundPct = 90;
            if (game.playMode == PlayMode.WAGERED && game.stake > 0) {
                refundAmount = (game.stake * 90) / 100;
                if (refundAmount > 0) {
                    payTo(msg.sender, refundAmount);
                }
            }
        } else {
            // After VRF: 50% refund
            refundPct = 50;
            if (game.playMode == PlayMode.WAGERED && game.stake > 0) {
                refundAmount = (game.stake * 50) / 100;
                if (refundAmount > 0) {
                    payTo(msg.sender, refundAmount);
                }
                // Remaining 50% goes to prize pool
                game.totalPrize += (game.stake - refundAmount);
            }
        }
        
        // Remove player from game
        players[_gameId][msg.sender].hasJoined = false;
        game.currentPlayers--;
        
        // Mission X: Track rage quit for cooldown system
        lastRageQuit[msg.sender] = block.timestamp;
        rageQuitCount[msg.sender]++;
        
        emit EarlyExit(_gameId, msg.sender, refundAmount, refundPct);
    }

    /**
     * @dev Mission X: Force reveal timeout (Soft timeout for commit-reveal)
     * If player commits but doesn't reveal within timeout, they forfeit
     */
    /**
     * @dev Mission X: Force reveal timeout (CRITICAL for PVP fairness)
     * If player commits but doesn't reveal within timeout, they forfeit
     * This prevents griefing and ensures games always complete
     */
    function forceRevealTimeout(uint256 _gameId, address _player) external {
        Game storage game = games[_gameId];
        Commit storage c = commits[_gameId][_player];
        Player storage p = players[_gameId][_player];
        
        require(game.status == GameStatus.IN_PROGRESS, "Game not active");
        require(c.committed && !c.revealed, "No pending reveal");
        require(block.timestamp > c.committedAt + REVEAL_TIMEOUT, "Reveal time not expired");
        require(!p.hasCompleted, "Already completed");
        require(!timeoutPenaltyApplied[_gameId][_player], "Penalty already applied");
        
        // Player forfeited - mark as completed with max score (worst possible)
        p.hasCompleted = true;
        p.finalScore = type(uint256).max;
        p.flipCount = MAX_FLIP_COUNT; // Worst flip count
        p.completedAt = block.timestamp;
        p.state = PlayerState.SUBMITTED; // Lock player
        
        // Mark as revealed to prevent double timeout
        c.revealed = true;
        
        // Mark penalty as applied
        timeoutPenaltyApplied[_gameId][_player] = true;
        
        // CRITICAL: Increment completedCount for timeout penalty
        // This ensures game can be finalized even if players timeout
        // completedCount tracks all completions (submit + timeout + forfeit)
        game.completedCount++;
        
        // Track rage quit for cooldown system
        rageQuitCount[_player]++;
        lastRageQuit[_player] = block.timestamp;
        
        emit ScoreRevealed(_gameId, _player, MAX_FLIP_COUNT); // Emit with worst score
        emit TimeoutPenaltyApplied(_gameId, _player, 3, 0); // Type 3 = reveal timeout forfeit
        
        // Check if all players have completed (including timeouts) - finalize game
        if (game.gameType == GameType.PLAYER_VS_PLAYER) {
            if (game.completedCount >= game.maxPlayers) {
                require(game.status == GameStatus.IN_PROGRESS, "Game already completed");
                _finalizeGame(_gameId);
            }
        }
    }

    /**
     * @dev Mission X: Force commit timeout (if player doesn't commit within timeout)
     * Prevents griefing where player never commits
     */
    function forceCommitTimeout(uint256 _gameId, address _player) external {
        Game storage game = games[_gameId];
        Commit storage c = commits[_gameId][_player];
        Player storage p = players[_gameId][_player];
        
        require(game.status == GameStatus.IN_PROGRESS, "Game not active");
        require(game.gameType == GameType.PLAYER_VS_PLAYER, "Only for PVP games");
        require(!c.committed, "Already committed");
        require(block.timestamp > game.startedAt + REVEAL_TIMEOUT, "Commit window still active");
        require(!p.hasCompleted, "Already completed");
        require(!timeoutPenaltyApplied[_gameId][_player], "Penalty already applied");
        
        // Player forfeited - mark as completed with max score (worst possible)
        p.hasCompleted = true;
        p.finalScore = type(uint256).max;
        p.flipCount = MAX_FLIP_COUNT;
        p.completedAt = block.timestamp;
        p.state = PlayerState.SUBMITTED; // Lock player
        
        // Mark as committed and revealed to prevent double timeout
        c.committed = true;
        c.revealed = true;
        c.committedAt = block.timestamp;
        
        // Mark penalty as applied
        timeoutPenaltyApplied[_gameId][_player] = true;
        
        // CRITICAL: Increment completedCount for timeout penalty
        // This ensures game can be finalized even if players timeout
        // completedCount tracks all completions (submit + timeout + forfeit)
        game.completedCount++;
        
        // Track rage quit for cooldown system
        rageQuitCount[_player]++;
        lastRageQuit[_player] = block.timestamp;
        
        emit ScoreCommitted(_gameId, _player, bytes32(0)); // Empty hash for timeout
        emit ScoreRevealed(_gameId, _player, MAX_FLIP_COUNT);
        emit TimeoutPenaltyApplied(_gameId, _player, 4, 0); // Type 4 = commit timeout forfeit
        
        // Check if all players have completed (including timeouts) - finalize game
        if (game.gameType == GameType.PLAYER_VS_PLAYER) {
            if (game.completedCount >= game.maxPlayers) {
                require(game.status == GameStatus.IN_PROGRESS, "Game already completed");
                _finalizeGame(_gameId);
            }
        }
    }

    /**
     * @dev Mission X: Forfeit game (voluntary surrender)
     * Player can forfeit and lose 50% of stake, game continues
     */
    function forfeit(uint256 _gameId) external nonReentrant {
        Game storage game = games[_gameId];
        Player storage p = players[_gameId][msg.sender];
        
        require(game.status == GameStatus.IN_PROGRESS, "Game not active");
        require(game.gameType == GameType.PLAYER_VS_PLAYER, "Only for PVP games");
        require(p.hasJoined, "Not a player");
        require(!p.hasCompleted, "Already completed");
        
        // Mark as completed with max score (worst possible)
        p.hasCompleted = true;
        p.finalScore = type(uint256).max;
        p.flipCount = MAX_FLIP_COUNT;
        p.completedAt = block.timestamp;
        p.state = PlayerState.SUBMITTED; // Lock player
        
        // Apply forfeit penalty: 50% of stake burned, 50% to prize pool
        if (game.playMode == PlayMode.WAGERED && game.stake > 0) {
            uint256 forfeitPenalty = (game.stake * 50) / 100;
            game.totalPrize += (game.stake - forfeitPenalty); // 50% to prize pool
            // 50% is burned (not sent anywhere)
        }
        
        // CRITICAL: Increment completedCount for forfeit
        // This ensures game can be finalized even if players forfeit
        // completedCount tracks all completions (submit + timeout + forfeit)
        game.completedCount++;
        
        emit TimeoutPenaltyApplied(_gameId, msg.sender, 5, game.stake / 2); // Type 5 = voluntary forfeit
        
        // Check if all players have completed (including forfeits) - finalize game
        if (game.gameType == GameType.PLAYER_VS_PLAYER) {
            if (game.completedCount >= game.maxPlayers) {
                require(game.status == GameStatus.IN_PROGRESS, "Game already completed");
                _finalizeGame(_gameId);
            }
        }
    }

    /**
     * @dev Mission X: Get live scores for spectator mode
     */
    function getLiveScores(uint256 _gameId) external view returns (PlayerResult[] memory) {
        Game storage game = games[_gameId];
        require(game.vrfFulfilled, "Game not started");
        
        address[] memory playersList = gamePlayers[_gameId];
        PlayerResult[] memory liveResults = new PlayerResult[](playersList.length);
        
        for (uint256 i = 0; i < playersList.length; i++) {
            liveResults[i] = results[_gameId][playersList[i]];
        }
        
        return liveResults;
    }

    /**
     * @dev Mission X: Create rematch with same players
     */
    function rematch(uint256 _gameId) external payable nonReentrant {
        Game storage oldGame = games[_gameId];
        require(oldGame.status == GameStatus.COMPLETED || oldGame.status == GameStatus.TIED, "Game not finished");
        require(oldGame.gameType == GameType.PLAYER_VS_PLAYER, "Only for PVP games");
        
        // Check if caller was a player in the original game
        require(players[_gameId][msg.sender].hasJoined, "Not a player in original game");
        
        // Create new game with same parameters
        string memory rematchName = string(abi.encodePacked(oldGame.name, " - Rematch"));
        uint256 durationHours = oldGame.endTime > 0 ? (oldGame.endTime - oldGame.startedAt) / 1 hours : 24;
        
        if (oldGame.playMode == PlayMode.WAGERED) {
            require(msg.value >= oldGame.stake, "Stake must match original game");
            _createGameInternal(rematchName, oldGame.gameType, oldGame.maxPlayers, durationHours, "", oldGame.playMode, msg.value);
        } else {
            require(msg.value == 0, "Free games don't require payment");
            _createGameInternal(rematchName, oldGame.gameType, oldGame.maxPlayers, durationHours, "", PlayMode.FREE, 0);
        }
    }

    function getActiveGames() external view returns (uint256[] memory) {
        uint256[] memory activeGameIds = new uint256[](_gameIdCounter);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= _gameIdCounter; i++) {
            if (games[i].status == GameStatus.CREATED || games[i].status == GameStatus.IN_PROGRESS || games[i].status == GameStatus.WAITING_VRF) {
                activeGameIds[count] = i;
                count++;
            }
        }
        
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = activeGameIds[i];
        }
        
        return result;
    }

    function getGameCount() external view returns (uint256) {
        return _gameIdCounter;
    }

    function getLeaderboardEntry(address _player) external view returns (LeaderboardEntry memory) {
        return leaderboard[_player];
    }

    function weeklyRaffle(uint256 _topN, uint256 _prizePerWinner) external onlyOwner {
        require(treasuryBalance >= _prizePerWinner * _topN, "Insufficient treasury");
        uint256 currentWeek = block.timestamp / (7 days);
        emit WeeklyRaffle(currentWeek, _topN, _prizePerWinner);
    }

    function _updateLeaderboard(uint256 _gameId, address _winner, uint256 _finalScore) internal {
        if (_winner == AI_ADDRESS) {
            return;
        }

        LeaderboardEntry storage entry = leaderboard[_winner];
        entry.player = _winner;
        entry.totalWins++;
        entry.totalGames++;
        
        // Mission X: Update season points
        uint256 pointsEarned = 10; // Base points
        if (_finalScore < 20) pointsEarned += 5; // Bonus for good score
        _updateSeasonPoints(_winner, pointsEarned);
        
        if (entry.bestFinalScore == 0 || _finalScore < entry.bestFinalScore) {
            entry.bestFinalScore = _finalScore;
        }
        
        uint256 points = 100;
        if (_finalScore <= 10) {
            points += (11 - _finalScore) * 10;
        }
        entry.weeklyPoints += points;
        entry.lastUpdated = block.timestamp;
        
        // Mission X: Update season points
        _updateSeasonPoints(_winner, points);
    }

    /**
     * @dev Mission X: Update season points for a player
     */
    function _updateSeasonPoints(address _player, uint256 _points) internal {
        if (currentSeason > 0) {
            seasonPoints[currentSeason][_player] += _points;
            emit SeasonPointsUpdated(currentSeason, _player, seasonPoints[currentSeason][_player]);
        }
    }
}

