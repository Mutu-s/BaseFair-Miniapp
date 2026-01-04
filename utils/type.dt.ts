export interface TruncateParams {
  text: string
  startChars: number
  endChars: number
  maxLength: number
}

export interface GameCardStruct {
  id: number
  name: string
  icon: JSX.Element
  isFlipped?: boolean
  matched?: boolean
}

// New contract types
export enum GameType {
  AI_VS_PLAYER = 0,
  PLAYER_VS_PLAYER = 1,
}

export enum GameStatus {
  CREATED = 0,
  WAITING_VRF = 1, // Waiting for VRF fulfillment (Mission X)
  IN_PROGRESS = 2, // Game started, players playing
  COMPLETED = 3,
  CANCELLED = 4,
  TIED = 5, // Game ended in a tie
}

// Mission X: Player state for lifecycle management
export enum PlayerState {
  NOT_STARTED = 0,
  PLAYING = 1,
  SUBMITTED = 2
}

export interface Player {
  playerAddress: string
  flipCount: number
  finalScore: number // VRF-determined final score (Mission X)
  completedAt: number
  hasCompleted: boolean
  hasJoined: boolean
  state?: PlayerState // Mission X: Player lifecycle state (prevents multiple submissions)
}

export interface GameStruct {
  id: number
  name: string // Custom game name
  creator: string
  gameType: GameType
  status: GameStatus
  playMode?: number // 0 = FREE, 1 = WAGERED (Mission X)
  stake: number
  totalPrize: number
  maxPlayers: number
  currentPlayers: number
  createdAt: number
  startedAt: number
  completedAt: number
  endTime: number // When the game will end (0 = no time limit)
  winner: string
  winnerFlipCount: number
  winnerFinalScore?: number // VRF-determined final score (Mission X)
  vrfRequestId: string // Single VRF request ID (Mission X)
  vrfRandom?: number // VRF random number (Mission X)
  cardOrder: number[]
  vrfFulfilled: boolean
  winnerPrize?: number // Calculated prize for winner (after commission)
  players?: string[] // Array of player addresses
  prizeTxHash?: string // Transaction hash for prize distribution
  hasPassword?: boolean // Whether the game is password-protected
}

export interface GameParams {
  name: string // Custom game name
  gameType: GameType
  maxPlayers: number
  stake: string | number
  durationHours?: number // Duration in hours (0 = no time limit)
  password?: string // Optional password for multi-player games
}

export interface ScoreStruct {
  id: number
  gameId: number
  player: string
  score: number // flipCount (for display)
  finalScore?: number // VRF-determined final score (used for winner determination)
  prize: number
  played: boolean
  state?: PlayerState // Mission X: Player lifecycle state
}

export interface InvitationStruct {
  id: number
  gameId: number
  title: string
  sender: string
  receiver: string
  responded: boolean
  accepted: boolean
  stake: number
  timestamp: number
}

// Legacy types for backward compatibility
export interface LegacyGameStruct {
  id: number
  title: string
  description: string
  owner: string
  participants: number
  numberOfWinners: number
  acceptees: number
  stake: number
  startDate: number
  endDate: number
  timestamp: number
  deleted: boolean
  paidOut: boolean
}

export interface GlobalState {
  games: GameStruct[]
  game: GameStruct | null
  scores: ScoreStruct[]
  invitations: InvitationStruct[]
  createModal: string
  resultModal: string
  inviteModal: string
  loading: boolean
  error: string | null
}

export interface RootState {
  globalStates: GlobalState
}
