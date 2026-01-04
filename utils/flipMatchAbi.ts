// FlipMatch Contract ABI - Auto-generated from FlipMatch.abi.json
// This file ensures ABI is always available during webpack build

export const FLIPMATCH_ABI = [
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "_aiAddress",
                           "type":  "address"
                       },
                       {
                           "internalType":  "address",
                           "name":  "_pythVRF",
                           "type":  "address"
                       }
                   ],
        "stateMutability":  "nonpayable",
        "type":  "constructor"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "owner",
                           "type":  "address"
                       }
                   ],
        "name":  "OwnableInvalidOwner",
        "type":  "error"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "account",
                           "type":  "address"
                       }
                   ],
        "name":  "OwnableUnauthorizedAccount",
        "type":  "error"
    },
    {
        "inputs":  [

                   ],
        "name":  "ReentrancyGuardReentrantCall",
        "type":  "error"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "player",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "cardId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "BonusCard",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "player",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "newLevel",
                           "type":  "uint256"
                       }
                   ],
        "name":  "CosmeticLevelUp",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "day",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "seed",
                           "type":  "uint256"
                       }
                   ],
        "name":  "DailyChallengeCreated",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "player",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "refundAmount",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "refundPct",
                           "type":  "uint256"
                       }
                   ],
        "name":  "EarlyExit",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "creator",
                           "type":  "address"
                       }
                   ],
        "name":  "GameCancelled",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "winner",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "prize",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "finalScore",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "bytes32",
                           "name":  "vrfRequestId",
                           "type":  "bytes32"
                       }
                   ],
        "name":  "GameCompleted",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "string",
                           "name":  "name",
                           "type":  "string"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "creator",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "enum FlipMatch.GameType",
                           "name":  "gameType",
                           "type":  "uint8"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "stake",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "maxPlayers",
                           "type":  "uint256"
                       }
                   ],
        "name":  "GameCreated",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "winner",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "finalScore",
                           "type":  "uint256"
                       }
                   ],
        "name":  "GameFinished",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "bytes32",
                           "name":  "vrfRequestId",
                           "type":  "bytes32"
                       }
                   ],
        "name":  "GameStarted",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "GameTied",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "amount",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "newBalance",
                           "type":  "uint256"
                       }
                   ],
        "name":  "HouseBalanceDeposited",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "amount",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "newBalance",
                           "type":  "uint256"
                       }
                   ],
        "name":  "HouseBalanceWithdrawn",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "edgePct",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "houseAmount",
                           "type":  "uint256"
                       }
                   ],
        "name":  "HouseEdgeApplied",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "player",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "bonus",
                           "type":  "uint256"
                       }
                   ],
        "name":  "LuckyFlip",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "previousOwner",
                           "type":  "address"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "newOwner",
                           "type":  "address"
                       }
                   ],
        "name":  "OwnershipTransferred",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "player",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "passType",
                           "type":  "uint256"
                       }
                   ],
        "name":  "PassPurchased",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "player",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "flipCount",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "finalScore",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "completedAt",
                           "type":  "uint256"
                       }
                   ],
        "name":  "PlayerCompleted",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "player",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "currentPlayers",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "maxPlayers",
                           "type":  "uint256"
                       }
                   ],
        "name":  "PlayerJoined",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "winner",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "amount",
                           "type":  "uint256"
                       }
                   ],
        "name":  "PrizeDistributed",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "winner",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "amount",
                           "type":  "uint256"
                       }
                   ],
        "name":  "PrizePoolClaimed",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "sponsor",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "amount",
                           "type":  "uint256"
                       }
                   ],
        "name":  "PrizePoolCreated",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "randomValue",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "bytes32",
                           "name":  "requestId",
                           "type":  "bytes32"
                       }
                   ],
        "name":  "RandomnessFulfilled",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "bytes32",
                           "name":  "requestId",
                           "type":  "bytes32"
                       }
                   ],
        "name":  "RandomnessRequested",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "string",
                           "name":  "usage",
                           "type":  "string"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "randomValue",
                           "type":  "uint256"
                       }
                   ],
        "name":  "RandomnessUsed",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "player",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "bytes32",
                           "name":  "hash",
                           "type":  "bytes32"
                       }
                   ],
        "name":  "ScoreCommitted",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "player",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "flipCount",
                           "type":  "uint256"
                       }
                   ],
        "name":  "ScoreRevealed",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "season",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "address[]",
                           "name":  "topPlayers",
                           "type":  "address[]"
                       }
                   ],
        "name":  "SeasonEnded",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "season",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "player",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "points",
                           "type":  "uint256"
                       }
                   ],
        "name":  "SeasonPointsUpdated",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "season",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "startTime",
                           "type":  "uint256"
                       }
                   ],
        "name":  "SeasonStarted",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "enum FlipMatch.GameStatus",
                           "name":  "status",
                           "type":  "uint8"
                       }
                   ],
        "name":  "StatusChanged",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "player",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "duration",
                           "type":  "uint256"
                       }
                   ],
        "name":  "TimeFreeze",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "player",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "penaltyType",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "amount",
                           "type":  "uint256"
                       }
                   ],
        "name":  "TimeoutPenaltyApplied",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "to",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "amount",
                           "type":  "uint256"
                       }
                   ],
        "name":  "TreasuryWithdrawn",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "bytes32",
                           "name":  "requestId",
                           "type":  "bytes32"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "randomNumber",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256[]",
                           "name":  "cardOrder",
                           "type":  "uint256[]"
                       }
                   ],
        "name":  "VRFFulfilled",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "gameId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "bytes32",
                           "name":  "requestId",
                           "type":  "bytes32"
                       }
                   ],
        "name":  "VRFRequested",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "week",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "seed",
                           "type":  "uint256"
                       }
                   ],
        "name":  "WeeklyChallengeCreated",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "week",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "topN",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "prizePerWinner",
                           "type":  "uint256"
                       }
                   ],
        "name":  "WeeklyRaffle",
        "type":  "event"
    },
    {
        "inputs":  [

                   ],
        "name":  "AI_ADDRESS",
        "outputs":  [
                        {
                            "internalType":  "address",
                            "name":  "",
                            "type":  "address"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "COMMISSION_PCT",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "DIFFICULTY_MODIFIER",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "HOUSE_EDGE_PCT",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "MAX_FLIP_COUNT",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "MAX_PLAYERS",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "MIN_BET",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "MIN_FLIP_COUNT",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "MIN_PLAYERS",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "REVEAL_TIMEOUT",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_gameId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "cancelGame",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_gameId",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_flipCount",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_salt",
                           "type":  "uint256"
                       }
                   ],
        "name":  "commitAndReveal",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_gameId",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_flipCount",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_salt",
                           "type":  "uint256"
                       }
                   ],
        "name":  "commitRevealAndSubmit",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_gameId",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "bytes32",
                           "name":  "_hash",
                           "type":  "bytes32"
                       }
                   ],
        "name":  "commitScore",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "address",
                           "name":  "",
                           "type":  "address"
                       }
                   ],
        "name":  "commits",
        "outputs":  [
                        {
                            "internalType":  "bytes32",
                            "name":  "hash",
                            "type":  "bytes32"
                        },
                        {
                            "internalType":  "bool",
                            "name":  "committed",
                            "type":  "bool"
                        },
                        {
                            "internalType":  "bool",
                            "name":  "revealed",
                            "type":  "bool"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "committedAt",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_gameId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "computeCardOrder",
        "outputs":  [
                        {
                            "internalType":  "uint256[]",
                            "name":  "",
                            "type":  "uint256[]"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "",
                           "type":  "address"
                       }
                   ],
        "name":  "cosmeticLevel",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "string",
                           "name":  "_name",
                           "type":  "string"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_maxPlayers",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_durationHours",
                           "type":  "uint256"
                       }
                   ],
        "name":  "createDailyChallenge",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "string",
                           "name":  "_name",
                           "type":  "string"
                       },
                       {
                           "internalType":  "enum FlipMatch.GameType",
                           "name":  "_gameType",
                           "type":  "uint8"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_maxPlayers",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_durationHours",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "string",
                           "name":  "_password",
                           "type":  "string"
                       }
                   ],
        "name":  "createFreeGame",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "string",
                           "name":  "_name",
                           "type":  "string"
                       },
                       {
                           "internalType":  "enum FlipMatch.GameType",
                           "name":  "_gameType",
                           "type":  "uint8"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_maxPlayers",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_durationHours",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "string",
                           "name":  "_password",
                           "type":  "string"
                       }
                   ],
        "name":  "createGame",
        "outputs":  [

                    ],
        "stateMutability":  "payable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "string",
                           "name":  "_name",
                           "type":  "string"
                       },
                       {
                           "internalType":  "enum FlipMatch.GameType",
                           "name":  "_gameType",
                           "type":  "uint8"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_maxPlayers",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_durationHours",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "string",
                           "name":  "_password",
                           "type":  "string"
                       }
                   ],
        "name":  "createPrizePoolGame",
        "outputs":  [

                    ],
        "stateMutability":  "payable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "string",
                           "name":  "_name",
                           "type":  "string"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_maxPlayers",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_durationHours",
                           "type":  "uint256"
                       }
                   ],
        "name":  "createWeeklyChallenge",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "currentSeason",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       }
                   ],
        "name":  "dailySeed",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "depositHouseBalance",
        "outputs":  [

                    ],
        "stateMutability":  "payable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_gameId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "drawWinner",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_gameId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "earlyExit",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_gameId",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "address",
                           "name":  "_player",
                           "type":  "address"
                       }
                   ],
        "name":  "forceCommitTimeout",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_gameId",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "address",
                           "name":  "_player",
                           "type":  "address"
                       }
                   ],
        "name":  "forceRevealTimeout",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_gameId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "forceTieRefund",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_gameId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "forfeit",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "bytes32",
                           "name":  "_requestId",
                           "type":  "bytes32"
                       }
                   ],
        "name":  "fulfillVRF",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       }
                   ],
        "name":  "gamePlayers",
        "outputs":  [
                        {
                            "internalType":  "address",
                            "name":  "",
                            "type":  "address"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       }
                   ],
        "name":  "gameRandomness",
        "outputs":  [
                        {
                            "internalType":  "bytes32",
                            "name":  "requestId",
                            "type":  "bytes32"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "randomValue",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "bool",
                            "name":  "fulfilled",
                            "type":  "bool"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "fulfilledAt",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       }
                   ],
        "name":  "games",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "id",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "string",
                            "name":  "name",
                            "type":  "string"
                        },
                        {
                            "internalType":  "address",
                            "name":  "creator",
                            "type":  "address"
                        },
                        {
                            "internalType":  "enum FlipMatch.GameType",
                            "name":  "gameType",
                            "type":  "uint8"
                        },
                        {
                            "internalType":  "enum FlipMatch.GameStatus",
                            "name":  "status",
                            "type":  "uint8"
                        },
                        {
                            "internalType":  "enum FlipMatch.PlayMode",
                            "name":  "playMode",
                            "type":  "uint8"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "stake",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "totalPrize",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "maxPlayers",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "currentPlayers",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "completedCount",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "createdAt",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "startedAt",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "completedAt",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "endTime",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "address",
                            "name":  "winner",
                            "type":  "address"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "winnerFlipCount",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "winnerFinalScore",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "bytes32",
                            "name":  "vrfRequestId",
                            "type":  "bytes32"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "vrfRandom",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "bool",
                            "name":  "vrfFulfilled",
                            "type":  "bool"
                        },
                        {
                            "internalType":  "bytes32",
                            "name":  "passwordHash",
                            "type":  "bytes32"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "getActiveGames",
        "outputs":  [
                        {
                            "internalType":  "uint256[]",
                            "name":  "",
                            "type":  "uint256[]"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_gameId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "getGame",
        "outputs":  [
                        {
                            "components":  [
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "id",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "string",
                                                   "name":  "name",
                                                   "type":  "string"
                                               },
                                               {
                                                   "internalType":  "address",
                                                   "name":  "creator",
                                                   "type":  "address"
                                               },
                                               {
                                                   "internalType":  "enum FlipMatch.GameType",
                                                   "name":  "gameType",
                                                   "type":  "uint8"
                                               },
                                               {
                                                   "internalType":  "enum FlipMatch.GameStatus",
                                                   "name":  "status",
                                                   "type":  "uint8"
                                               },
                                               {
                                                   "internalType":  "enum FlipMatch.PlayMode",
                                                   "name":  "playMode",
                                                   "type":  "uint8"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "stake",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "totalPrize",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "maxPlayers",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "currentPlayers",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "completedCount",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "createdAt",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "startedAt",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "completedAt",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "endTime",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "address",
                                                   "name":  "winner",
                                                   "type":  "address"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "winnerFlipCount",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "winnerFinalScore",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "bytes32",
                                                   "name":  "vrfRequestId",
                                                   "type":  "bytes32"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "vrfRandom",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256[]",
                                                   "name":  "cardOrder",
                                                   "type":  "uint256[]"
                                               },
                                               {
                                                   "internalType":  "bool",
                                                   "name":  "vrfFulfilled",
                                                   "type":  "bool"
                                               },
                                               {
                                                   "internalType":  "bytes32",
                                                   "name":  "passwordHash",
                                                   "type":  "bytes32"
                                               }
                                           ],
                            "internalType":  "struct FlipMatch.Game",
                            "name":  "",
                            "type":  "tuple"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "getGameCount",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_gameId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "getGamePlayers",
        "outputs":  [
                        {
                            "internalType":  "address[]",
                            "name":  "",
                            "type":  "address[]"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_gameId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "getGameRandom",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "_player",
                           "type":  "address"
                       }
                   ],
        "name":  "getLeaderboardEntry",
        "outputs":  [
                        {
                            "components":  [
                                               {
                                                   "internalType":  "address",
                                                   "name":  "player",
                                                   "type":  "address"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "totalWins",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "bestFinalScore",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "totalGames",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "weeklyPoints",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "lastUpdated",
                                                   "type":  "uint256"
                                               }
                                           ],
                            "internalType":  "struct FlipMatch.LeaderboardEntry",
                            "name":  "",
                            "type":  "tuple"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_gameId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "getLiveScores",
        "outputs":  [
                        {
                            "components":  [
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "moves",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "time",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "score",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "multiplier",
                                                   "type":  "uint256"
                                               }
                                           ],
                            "internalType":  "struct FlipMatch.PlayerResult[]",
                            "name":  "",
                            "type":  "tuple[]"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_gameId",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "address",
                           "name":  "_player",
                           "type":  "address"
                       }
                   ],
        "name":  "getPlayer",
        "outputs":  [
                        {
                            "components":  [
                                               {
                                                   "internalType":  "address",
                                                   "name":  "playerAddress",
                                                   "type":  "address"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "flipCount",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "finalScore",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "completedAt",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "bool",
                                                   "name":  "hasCompleted",
                                                   "type":  "bool"
                                               },
                                               {
                                                   "internalType":  "bool",
                                                   "name":  "hasJoined",
                                                   "type":  "bool"
                                               },
                                               {
                                                   "internalType":  "enum FlipMatch.PlayerState",
                                                   "name":  "state",
                                                   "type":  "uint8"
                                               }
                                           ],
                            "internalType":  "struct FlipMatch.Player",
                            "name":  "",
                            "type":  "tuple"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "_player",
                           "type":  "address"
                       }
                   ],
        "name":  "getPlayerGames",
        "outputs":  [
                        {
                            "internalType":  "uint256[]",
                            "name":  "",
                            "type":  "uint256[]"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_gameId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "getRandomnessProof",
        "outputs":  [
                        {
                            "components":  [
                                               {
                                                   "internalType":  "bytes32",
                                                   "name":  "requestId",
                                                   "type":  "bytes32"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "randomValue",
                                                   "type":  "uint256"
                                               },
                                               {
                                                   "internalType":  "bool",
                                                   "name":  "fulfilled",
                                                   "type":  "bool"
                                               },
                                               {
                                                   "internalType":  "uint256",
                                                   "name":  "fulfilledAt",
                                                   "type":  "uint256"
                                               }
                                           ],
                            "internalType":  "struct FlipMatch.RandomnessProof",
                            "name":  "",
                            "type":  "tuple"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "houseBalance",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_gameId",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "string",
                           "name":  "_password",
                           "type":  "string"
                       }
                   ],
        "name":  "joinGame",
        "outputs":  [

                    ],
        "stateMutability":  "payable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "",
                           "type":  "address"
                       }
                   ],
        "name":  "lastRageQuit",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "",
                           "type":  "address"
                       }
                   ],
        "name":  "leaderboard",
        "outputs":  [
                        {
                            "internalType":  "address",
                            "name":  "player",
                            "type":  "address"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "totalWins",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "bestFinalScore",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "totalGames",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "weeklyPoints",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "lastUpdated",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "owner",
        "outputs":  [
                        {
                            "internalType":  "address",
                            "name":  "",
                            "type":  "address"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "",
                           "type":  "address"
                       }
                   ],
        "name":  "passType",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "string",
                           "name":  "_name",
                           "type":  "string"
                       },
                       {
                           "internalType":  "enum FlipMatch.GameType",
                           "name":  "_gameType",
                           "type":  "uint8"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_maxPlayers",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_durationHours",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "string",
                           "name":  "_password",
                           "type":  "string"
                       }
                   ],
        "name":  "playFree",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "",
                           "type":  "address"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       }
                   ],
        "name":  "playerGames",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "address",
                           "name":  "",
                           "type":  "address"
                       }
                   ],
        "name":  "players",
        "outputs":  [
                        {
                            "internalType":  "address",
                            "name":  "playerAddress",
                            "type":  "address"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "flipCount",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "finalScore",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "completedAt",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "bool",
                            "name":  "hasCompleted",
                            "type":  "bool"
                        },
                        {
                            "internalType":  "bool",
                            "name":  "hasJoined",
                            "type":  "bool"
                        },
                        {
                            "internalType":  "enum FlipMatch.PlayerState",
                            "name":  "state",
                            "type":  "uint8"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       }
                   ],
        "name":  "prizePools",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "total",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "bool",
                            "name":  "claimed",
                            "type":  "bool"
                        },
                        {
                            "internalType":  "address",
                            "name":  "sponsor",
                            "type":  "address"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "createdAt",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "pythVRF",
        "outputs":  [
                        {
                            "internalType":  "contract IPythVRF",
                            "name":  "",
                            "type":  "address"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "",
                           "type":  "address"
                       }
                   ],
        "name":  "rageQuitCount",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_gameId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "rematch",
        "outputs":  [

                    ],
        "stateMutability":  "payable",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "renounceOwnership",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "address",
                           "name":  "",
                           "type":  "address"
                       }
                   ],
        "name":  "results",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "moves",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "time",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "score",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "multiplier",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_gameId",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_flipCount",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_salt",
                           "type":  "uint256"
                       }
                   ],
        "name":  "revealScore",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "rollDailySeed",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "address",
                           "name":  "",
                           "type":  "address"
                       }
                   ],
        "name":  "seasonPoints",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       }
                   ],
        "name":  "seasonTopPlayers",
        "outputs":  [
                        {
                            "internalType":  "address",
                            "name":  "",
                            "type":  "address"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_gameId",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_flipCount",
                           "type":  "uint256"
                       }
                   ],
        "name":  "submitCompletion",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "address",
                           "name":  "",
                           "type":  "address"
                       }
                   ],
        "name":  "timeoutPenaltyApplied",
        "outputs":  [
                        {
                            "internalType":  "bool",
                            "name":  "",
                            "type":  "bool"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "newOwner",
                           "type":  "address"
                       }
                   ],
        "name":  "transferOwnership",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "treasuryBalance",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "bytes32",
                           "name":  "",
                           "type":  "bytes32"
                       }
                   ],
        "name":  "vrfRequests",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_topN",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_prizePerWinner",
                           "type":  "uint256"
                       }
                   ],
        "name":  "weeklyRaffle",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       }
                   ],
        "name":  "weeklySeed",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       }
                   ],
        "name":  "weeklyTopPlayers",
        "outputs":  [
                        {
                            "internalType":  "address",
                            "name":  "",
                            "type":  "address"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_amount",
                           "type":  "uint256"
                       }
                   ],
        "name":  "withdrawHouseBalance",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "withdrawTreasury",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    }
] as const

export default FLIPMATCH_ABI


