// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "../interfaces/IPythVRF.sol";
import "./libraries/CasinoMath.sol";

/**
 * @title Jackpot
 * @dev Mission X compliant, VRF-powered raffle/jackpot system
 * Features: VRF-determined winner selection, transparent prize distribution, arcade-style raffles
 */
contract Jackpot is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IPythVRF public pythVRF;
    address public token; // address(0) = native MON

    uint256 public totalPool;
    uint256 public totalEntries;
    uint16 public rakeBps; // 500 = 5%
    uint256 public raffleCounter;

    struct Entry {
        address player;
        uint256 amount;
        uint256 timestamp;
    }

    struct Raffle {
        uint256 raffleId;
        uint256 totalPool;
        uint256 totalEntries;
        address winner;
        bool drawn;
        bytes32 vrfRequestId;
    }

    mapping(uint256 => Entry[]) public entries; // raffleId => entries
    mapping(uint256 => Raffle) public raffles;
    mapping(bytes32 => uint256) public vrfRequestToRaffle;

    event EntryPlaced(
        uint256 indexed raffleId,
        address indexed player,
        uint256 amount,
        uint256 poolContribution
    );
    event WinnerDrawn(
        uint256 indexed raffleId,
        address indexed winner,
        uint256 prize
    );
    event RaffleCreated(uint256 indexed raffleId);

    constructor(
        address _owner,
        address _token,
        address _pythVRF
    ) Ownable(_owner) {
        token = _token;
        pythVRF = IPythVRF(_pythVRF);
        rakeBps = 500; // 5% default
    }

    function placeBet(uint256 amount) external payable nonReentrant {
        // Handle bet payment
        if (token == address(0)) {
            require(msg.value == amount, "Amount mismatch");
        } else {
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        }

        uint256 rake = (amount * rakeBps) / 10000;
        uint256 poolContribution = amount - rake;

        // Get or create current raffle
        uint256 currentRaffleId = raffleCounter;
        if (raffles[currentRaffleId].raffleId == 0) {
            raffles[currentRaffleId] = Raffle({
                raffleId: currentRaffleId,
                totalPool: 0,
                totalEntries: 0,
                winner: address(0),
                drawn: false,
                vrfRequestId: bytes32(0)
            });
            emit RaffleCreated(currentRaffleId);
        }

        Raffle storage raffle = raffles[currentRaffleId];
        require(!raffle.drawn, "Raffle already drawn");

        raffle.totalPool += poolContribution;
        raffle.totalEntries += 1;

        entries[currentRaffleId].push(Entry({
            player: msg.sender,
            amount: poolContribution,
            timestamp: block.timestamp
        }));

        totalPool += poolContribution;
        totalEntries += 1;

        emit EntryPlaced(currentRaffleId, msg.sender, amount, poolContribution);
    }

    function drawWinner(uint256 raffleId) external onlyOwner {
        Raffle storage raffle = raffles[raffleId];
        require(raffle.raffleId == raffleId, "Invalid raffle");
        require(!raffle.drawn, "Already drawn");
        require(raffle.totalPool > 0, "No pool");
        require(raffle.totalEntries > 0, "No entries");

        // Mission X: No seed - VRF generates its own entropy
        bytes32 requestId = pythVRF.requestRandomness();
        raffle.vrfRequestId = requestId;
        vrfRequestToRaffle[requestId] = raffleId;
    }

    /**
     * @dev Mission X: Push-based callback - VRF calls this with randomness
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomness) external {
        require(msg.sender == address(pythVRF), "Only VRF");

        uint256 raffleId = vrfRequestToRaffle[requestId];
        Raffle storage raffle = raffles[raffleId];
        require(raffle.raffleId == raffleId, "Invalid raffle");
        require(!raffle.drawn, "Already drawn");

        Entry[] storage raffleEntries = entries[raffleId];
        require(raffleEntries.length > 0, "No entries");

        // Select winner using VRF
        uint256 winnerIndex = randomness % raffleEntries.length;
        address winner = raffleEntries[winnerIndex].player;

        uint256 prize = raffle.totalPool;
        raffle.winner = winner;
        raffle.drawn = true;

        totalPool -= prize;
        totalEntries -= raffle.totalEntries;

        // Payout prize
        if (token == address(0)) {
            (bool success, ) = payable(winner).call{value: prize}("");
            require(success, "Transfer failed");
        } else {
            IERC20(token).safeTransfer(winner, prize);
        }

        delete vrfRequestToRaffle[requestId];

        emit WinnerDrawn(raffleId, winner, prize);
    }

    function startNewRaffle() external onlyOwner {
        raffleCounter++;
    }

    function getRaffle(uint256 raffleId) external view returns (Raffle memory) {
        return raffles[raffleId];
    }

    function getRaffleEntries(uint256 raffleId) external view returns (Entry[] memory) {
        return entries[raffleId];
    }

    function setRake(uint16 newRakeBps) external onlyOwner {
        require(newRakeBps <= 1000, "Rake too high"); // Max 10%
        rakeBps = newRakeBps;
    }

    function setPythVRF(address _pythVRF) external onlyOwner {
        pythVRF = IPythVRF(_pythVRF);
    }
}
