//SPDX-License-Identifier:MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import './interfaces/IPythVRF.sol';

/**
 * @title FlipMatchLite - Optimized for deployment
 * @dev VRF-powered memory card game - Mission X compliant, size-optimized
 */
contract FlipMatchLite is Ownable, ReentrancyGuard {
    uint256 public constant MIN_BET = 0.001 ether;
    uint256 public constant MAX_PLAYERS = 5;
    uint256 public constant COMMISSION_PCT = 10;
    uint256 public constant DIFFICULTY_MODIFIER = 50;
    uint256 public constant HOUSE_EDGE_PCT = 5;
    address public immutable AI_ADDRESS;
    IPythVRF public immutable pythVRF;
    
    uint256 private _gameIdCounter;
    uint256 public treasuryBalance;
    uint256 public houseBalance;

    enum GameType { AI_VS_PLAYER, PLAYER_VS_PLAYER }
    enum GameStatus { CREATED, WAITING_VRF, IN_PROGRESS, COMPLETED, CANCELLED, TIED }
    enum PlayMode { FREE, WAGERED }

    struct Game {
        uint256 id;
        address creator;
        GameType gameType;
        GameStatus status;
        PlayMode playMode;
        uint256 stake;
        uint256 totalPrize;
        uint256 maxPlayers;
        uint256 currentPlayers;
        uint256 completedCount;
        uint256 startedAt;
        address winner;
        uint256 winnerScore;
        bytes32 vrfRequestId;
        uint256 vrfRandom;
        bool vrfFulfilled;
    }

    struct Player {
        address playerAddress;
        uint256 flipCount;
        uint256 finalScore;
        bool hasCompleted;
        bool hasJoined;
    }

    mapping(uint256 => Game) public games;
    mapping(uint256 => mapping(address => Player)) public players;
    mapping(uint256 => address[]) public gamePlayers;
    mapping(bytes32 => uint256) public vrfRequests;

    event GameCreated(uint256 indexed gameId, address indexed creator, GameType gameType, uint256 stake);
    event PlayerJoined(uint256 indexed gameId, address indexed player);
    event GameStarted(uint256 indexed gameId, bytes32 vrfRequestId);
    event VRFFulfilled(uint256 indexed gameId, uint256 randomNumber);
    event PlayerCompleted(uint256 indexed gameId, address indexed player, uint256 finalScore);
    event GameCompleted(uint256 indexed gameId, address indexed winner, uint256 prize);
    event GameCancelled(uint256 indexed gameId);

    constructor(address _aiAddress, address _pythVRF) Ownable(msg.sender) {
        require(_aiAddress != address(0) && _pythVRF != address(0), "Invalid");
        AI_ADDRESS = _aiAddress;
        pythVRF = IPythVRF(_pythVRF);
    }

    function createGame(GameType _gameType, uint256 _maxPlayers) external payable nonReentrant {
        require(msg.value >= MIN_BET, "Low bet");
        require(_maxPlayers >= 1 && _maxPlayers <= MAX_PLAYERS, "Invalid players");
        if (_gameType == GameType.AI_VS_PLAYER) {
            require(_maxPlayers == 1, "AI=1 player");
            uint256 maxPayout = (msg.value * (200 - HOUSE_EDGE_PCT)) / 100;
            require(houseBalance >= maxPayout - msg.value, "Low house");
        }
        _createGame(_gameType, _maxPlayers, PlayMode.WAGERED, msg.value);
    }

    function createFreeGame(GameType _gameType, uint256 _maxPlayers) external nonReentrant {
        require(_maxPlayers >= 1 && _maxPlayers <= MAX_PLAYERS, "Invalid players");
        if (_gameType == GameType.AI_VS_PLAYER) require(_maxPlayers == 1, "AI=1 player");
        _createGame(_gameType, _maxPlayers, PlayMode.FREE, 0);
    }

    function _createGame(GameType _gameType, uint256 _maxPlayers, PlayMode _playMode, uint256 _stake) internal {
        _gameIdCounter++;
        uint256 gameId = _gameIdCounter;

        games[gameId] = Game({
            id: gameId,
            creator: msg.sender,
            gameType: _gameType,
            status: GameStatus.CREATED,
            playMode: _playMode,
            stake: _stake,
            totalPrize: _stake,
            maxPlayers: _maxPlayers,
            currentPlayers: 1,
            completedCount: 0,
            startedAt: 0,
            winner: address(0),
            winnerScore: 0,
            vrfRequestId: bytes32(0),
            vrfRandom: 0,
            vrfFulfilled: false
        });

        players[gameId][msg.sender] = Player(msg.sender, 0, 0, false, true);
        gamePlayers[gameId].push(msg.sender);

        if (_gameType == GameType.AI_VS_PLAYER) {
            players[gameId][AI_ADDRESS] = Player(AI_ADDRESS, 0, 0, false, true);
            gamePlayers[gameId].push(AI_ADDRESS);
            _startGame(gameId);
        }

        emit GameCreated(gameId, msg.sender, _gameType, _stake);
    }

    function joinGame(uint256 _gameId) external payable nonReentrant {
        Game storage game = games[_gameId];
        require(game.status == GameStatus.CREATED, "Not joinable");
        require(game.currentPlayers < game.maxPlayers, "Full");
        require(!players[_gameId][msg.sender].hasJoined, "Already joined");
        
        if (game.playMode == PlayMode.WAGERED) {
            require(msg.value == game.stake, "Wrong stake");
            game.totalPrize += msg.value;
        }

        players[_gameId][msg.sender] = Player(msg.sender, 0, 0, false, true);
        gamePlayers[_gameId].push(msg.sender);
        game.currentPlayers++;

        emit PlayerJoined(_gameId, msg.sender);

        if (game.currentPlayers >= game.maxPlayers) {
            _startGame(_gameId);
        }
    }

    function _startGame(uint256 _gameId) internal {
        Game storage game = games[_gameId];
        game.status = GameStatus.WAITING_VRF;
        game.startedAt = block.timestamp;

        bytes32 requestId = pythVRF.requestRandomness();
        game.vrfRequestId = requestId;
        vrfRequests[requestId] = _gameId;

        emit GameStarted(_gameId, requestId);

        (uint256 randomNumber, , bool fulfilled) = pythVRF.getRandomness(requestId);
        if (fulfilled) {
            _processVRF(_gameId, randomNumber);
        }
    }

    function fulfillVRF(bytes32 _requestId) external nonReentrant {
        require(msg.sender == address(pythVRF), "Only VRF");
        uint256 gameId = vrfRequests[_requestId];
        require(gameId != 0, "Invalid request");
        
        (uint256 randomNumber, , bool fulfilled) = pythVRF.getRandomness(_requestId);
        require(fulfilled, "Not fulfilled");
        
        _processVRF(gameId, randomNumber);
    }

    function _processVRF(uint256 _gameId, uint256 _randomNumber) internal {
        Game storage game = games[_gameId];
        require(!game.vrfFulfilled, "Already done");
        
        game.vrfRandom = _randomNumber;
        game.vrfFulfilled = true;
        game.status = GameStatus.IN_PROGRESS;
        
        emit VRFFulfilled(_gameId, _randomNumber);
    }

    function submitCompletion(uint256 _gameId, uint256 _flipCount) external nonReentrant {
        Game storage game = games[_gameId];
        Player storage player = players[_gameId][msg.sender];
        
        require(game.status == GameStatus.IN_PROGRESS, "Not active");
        require(!player.hasCompleted, "Already done");
        require(game.vrfFulfilled, "No VRF");
        require(player.hasJoined, "Not player");
        require(_flipCount >= 6 && _flipCount <= 100, "Invalid flip");

        uint256 vrfModifier = game.vrfRandom % DIFFICULTY_MODIFIER;
        uint256 finalScore = _flipCount + vrfModifier;

        player.flipCount = _flipCount;
        player.finalScore = finalScore;
        player.hasCompleted = true;
        game.completedCount++;

        emit PlayerCompleted(_gameId, msg.sender, finalScore);

        if (game.gameType == GameType.AI_VS_PLAYER && !players[_gameId][AI_ADDRESS].hasCompleted) {
            _submitAI(_gameId, msg.sender);
        }

        _checkCompletion(_gameId);
    }

    function _submitAI(uint256 _gameId, address _human) internal {
        Game storage game = games[_gameId];
        Player storage human = players[_gameId][_human];
        
        uint256 aiModifier = (game.vrfRandom / DIFFICULTY_MODIFIER) % DIFFICULTY_MODIFIER;
        uint256 base = human.flipCount;
        uint256 variation = (game.vrfRandom / 100) % 20;
        
        uint256 aiFlip = (game.vrfRandom / 1000) % 2 == 0 
            ? (base > variation ? base - variation : 1)
            : base + 1 + variation;
        
        uint256 aiScore = aiFlip + aiModifier;

        players[_gameId][AI_ADDRESS].flipCount = aiFlip;
        players[_gameId][AI_ADDRESS].finalScore = aiScore;
        players[_gameId][AI_ADDRESS].hasCompleted = true;

        emit PlayerCompleted(_gameId, AI_ADDRESS, aiScore);
    }

    function _checkCompletion(uint256 _gameId) internal {
        Game storage game = games[_gameId];
        
        bool allDone = true;
        for (uint256 i = 0; i < gamePlayers[_gameId].length; i++) {
            if (!players[_gameId][gamePlayers[_gameId][i]].hasCompleted) {
                allDone = false;
                break;
            }
        }

        if (allDone) {
            game.status = GameStatus.COMPLETED;
            _determineWinner(_gameId);
        }
    }

    function _determineWinner(uint256 _gameId) internal {
        Game storage game = games[_gameId];
        
        address winner = address(0);
        uint256 lowestScore = type(uint256).max;

        for (uint256 i = 0; i < gamePlayers[_gameId].length; i++) {
            address addr = gamePlayers[_gameId][i];
            Player storage p = players[_gameId][addr];
            if (p.hasCompleted && p.finalScore < lowestScore) {
                lowestScore = p.finalScore;
                winner = addr;
            }
        }

        game.winner = winner;
        game.winnerScore = lowestScore;

        if (game.playMode == PlayMode.WAGERED) {
            _distributePrize(_gameId, winner);
        }

        emit GameCompleted(_gameId, winner, game.totalPrize);
    }

    function _distributePrize(uint256 _gameId, address _winner) internal {
        Game storage game = games[_gameId];
        
        if (game.gameType == GameType.AI_VS_PLAYER) {
            if (_winner == AI_ADDRESS) {
                houseBalance += game.stake;
            } else {
                uint256 prize = (game.stake * (200 - HOUSE_EDGE_PCT)) / 100;
                houseBalance -= (prize - game.stake);
                _pay(_winner, prize);
            }
        } else {
            uint256 commission = (game.totalPrize * COMMISSION_PCT) / 100;
            treasuryBalance += commission;
            _pay(_winner, game.totalPrize - commission);
        }
    }

    function cancelGame(uint256 _gameId) external nonReentrant {
        Game storage game = games[_gameId];
        require(game.creator == msg.sender, "Not creator");
        require(game.status == GameStatus.CREATED, "Cannot cancel");
        
        game.status = GameStatus.CANCELLED;
        
        for (uint256 i = 0; i < gamePlayers[_gameId].length; i++) {
            address addr = gamePlayers[_gameId][i];
            if (addr != AI_ADDRESS && game.playMode == PlayMode.WAGERED) {
                _pay(addr, game.stake);
            }
        }
        
        emit GameCancelled(_gameId);
    }

    function depositHouseBalance() external payable onlyOwner {
        houseBalance += msg.value;
    }
    
    function withdrawHouseBalance(uint256 _amount) external onlyOwner {
        require(houseBalance >= _amount, "Low balance");
        houseBalance -= _amount;
        _pay(owner(), _amount);
    }

    function withdrawTreasury() external onlyOwner {
        require(treasuryBalance > 0, "No funds");
        uint256 amount = treasuryBalance;
        treasuryBalance = 0;
        _pay(owner(), amount);
    }

    function _pay(address _to, uint256 _amount) internal {
        (bool success, ) = payable(_to).call{value: _amount}("");
        require(success, "Payment failed");
    }

    // View functions
    function getGame(uint256 _gameId) external view returns (Game memory) {
        return games[_gameId];
    }

    function getPlayer(uint256 _gameId, address _player) external view returns (Player memory) {
        return players[_gameId][_player];
    }

    function getGamePlayers(uint256 _gameId) external view returns (address[] memory) {
        return gamePlayers[_gameId];
    }

    function getGameCount() external view returns (uint256) {
        return _gameIdCounter;
    }

    function computeCardOrder(uint256 _gameId) external view returns (uint256[] memory) {
        Game storage game = games[_gameId];
        require(game.vrfFulfilled, "No VRF");
        
        uint256[] memory order = new uint256[](12);
        uint256[] memory indices = new uint256[](12);
        for (uint256 i = 0; i < 12; i++) indices[i] = i;
        
        uint256 rand = game.vrfRandom;
        for (uint256 i = 11; i > 0; i--) {
            uint256 j = rand % (i + 1);
            rand = uint256(keccak256(abi.encodePacked(rand)));
            (indices[i], indices[j]) = (indices[j], indices[i]);
        }
        
        for (uint256 i = 0; i < 12; i++) order[i] = indices[i];
        return order;
    }

    function getActiveGames() external view returns (uint256[] memory) {
        uint256[] memory active = new uint256[](_gameIdCounter);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= _gameIdCounter; i++) {
            GameStatus s = games[i].status;
            if (s == GameStatus.CREATED || s == GameStatus.IN_PROGRESS || s == GameStatus.WAITING_VRF) {
                active[count++] = i;
            }
        }
        
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) result[i] = active[i];
        return result;
    }
}

