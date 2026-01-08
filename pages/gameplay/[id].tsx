import GameCard from '@/components/GameCard'
import VRFVerification from '@/components/VRFVerification'
import { getGame, getScores, saveScore, joinGame } from '@/services/blockchain'
import { useChainId } from 'wagmi'
import { GameCardStruct, GameStruct, ScoreStruct, GameStatus, GameType, PlayerState } from '@/utils/type.dt'
import { BASE_MAINNET_CHAIN_ID } from '@/utils/network'
import { NextPage, GetServerSidePropsContext } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import { createSlug, extractGameIdFromSlug } from '@/utils/helper'
import {
  GiAngelWings,
  GiBeech,
  GiBowArrow,
  GiCrossedSwords,
  GiShieldBounces,
  GiSpartanHelmet,
} from 'react-icons/gi'
import { useAccount } from 'wagmi'
import GameStatusBadge from '@/components/GameStatusBadge'
import { FaCheckCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa'

const uniqueCardElements: GameCardStruct[] = [
  {
    id: 0,
    name: 'Helmet',
    icon: <GiSpartanHelmet size={100} />,
  },
  {
    id: 1,
    name: 'Beech',
    icon: <GiBeech size={100} />,
  },
  {
    id: 2,
    name: 'Shield',
    icon: <GiShieldBounces size={100} />,
  },
  {
    id: 3,
    name: 'Swords',
    icon: <GiCrossedSwords size={100} />,
  },
  {
    id: 4,
    name: 'Wings',
    icon: <GiAngelWings size={100} />,
  },
  {
    id: 5,
    name: 'Arrow',
    icon: <GiBowArrow size={100} />,
  },
]

const shuffleCards = (array: GameCardStruct[]) => {
  const length = array.length
  for (let i = length; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * i)
    const currentIndex = i - 1
    const temp = array[currentIndex]
    array[currentIndex] = array[randomIndex]
    array[randomIndex] = temp
  }
  return array
}

const Page: NextPage = () => {
  const { address } = useAccount()
  const chainId = useChainId()
  const router = useRouter()
  const { id } = router.query
  
  // Extract game ID from URL
  const [gameId, setGameId] = useState<number | null>(null)
  const [gameData, setGameData] = useState<GameStruct | null>(null)
  const [scoresData, setScoresData] = useState<ScoreStruct[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [otherPlayerCompleted, setOtherPlayerCompleted] = useState<boolean>(false)
  const [lastCompletedPlayer, setLastCompletedPlayer] = useState<string | null>(null)
  
  // Extract game ID from slug or direct ID
  useEffect(() => {
    if (!id) return
    
    let extractedGameId: number | null = null
    if (typeof id === 'string') {
      // Try to extract ID from slug (e.g., "deneme-1" -> 1)
      const parts = id.split('-')
      const lastPart = parts[parts.length - 1]
      const parsedId = parseInt(lastPart, 10)
      
      if (!isNaN(parsedId) && parsedId > 0) {
        extractedGameId = parsedId
      } else {
        // If no ID found, try to parse the whole slug as ID
        const wholeId = parseInt(id, 10)
        if (!isNaN(wholeId) && wholeId > 0) {
          extractedGameId = wholeId
        }
      }
    } else {
      extractedGameId = Number(id) || null
    }
    
    if (extractedGameId) {
      setGameId(extractedGameId)
    }
  }, [id])
  
  // Fetch game data when gameId and chainId are available
  useEffect(() => {
    const fetchGameData = async () => {
      if (!gameId || !chainId || (chainId !== 143 && chainId !== 10143)) {
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        const game = await getGame(gameId, chainId)
        const scores = await getScores(gameId, chainId)
        
        setGameData(game)
        setScoresData(scores)
        
        // Redirect to correct slug-based URL if needed
        if (game && typeof id === 'string') {
          const slug = createSlug(game.name || `Game #${game.id}`, game.id)
          const expectedPath = `/gameplay/${slug}-${game.id}`
          const currentPath = window.location.pathname
          
          if (currentPath !== expectedPath && !currentPath.includes(slug)) {
            // Only redirect if URL doesn't match at all
            window.history.replaceState({}, '', expectedPath)
          }
        }
      } catch (error) {
        console.error('Error fetching game data:', error)
        setGameData(null)
        setScoresData([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchGameData()
  }, [gameId, chainId, id])
  
  // Initialize cards - use VRF card order if available, otherwise shuffle
  const initializeCards = useCallback((cardOrder?: number[]) => {
    // Create pairs of cards (12 total: 6 unique cards × 2)
    const cardPairs = uniqueCardElements.concat(
      uniqueCardElements.map((card) => ({
        ...card,
        id: card.id + uniqueCardElements.length,
      }))
    )

    if (cardOrder && cardOrder.length === 12) {
      // Use VRF card order to arrange cards
      const orderedCards: GameCardStruct[] = []
      for (let i = 0; i < 12; i++) {
        const orderIndex = cardOrder[i]
        if (orderIndex >= 0 && orderIndex < 12) {
          orderedCards.push(cardPairs[orderIndex])
        }
      }
      return orderedCards.length === 12 ? orderedCards : shuffleCards(cardPairs)
    }
    
    // Fallback to random shuffle if no VRF order
    return shuffleCards(cardPairs)
  }, [])

  const [flipCount, setFlipCount] = useState<number>(0)
  const [player, setPlayer] = useState<ScoreStruct | null>(null)
  const [allCardsFlipped, setAllCardsFlipped] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [gameCompleted, setGameCompleted] = useState<boolean>(false)
  const [countdown, setCountdown] = useState<number | null>(null) // Countdown in seconds
  const [winnerAnnounced, setWinnerAnnounced] = useState<boolean>(false)
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false)
  const [joinPassword, setJoinPassword] = useState<string>('')
  
  const [cards, setCards] = useState<GameCardStruct[]>(() => 
    initializeCards(gameData?.cardOrder)
  )
  
  // Update cards when gameData changes (only if cards haven't been initialized yet)
  useEffect(() => {
    if (!gameData) return
    
    // Only initialize cards if they haven't been initialized yet (cards array is empty or all cards are not flipped/matched)
    setCards((prevCards) => {
      // If cards are already initialized and some are flipped or matched, don't reset
      if (prevCards.length > 0 && (prevCards.some((card) => card.isFlipped) || prevCards.some((card) => card.matched))) {
        return prevCards
      }
      
      // Otherwise, initialize with VRF order or shuffled
      if (gameData.cardOrder && gameData.cardOrder.length === 12) {
        return initializeCards(gameData.cardOrder)
      } else {
        return initializeCards()
      }
    })
  }, [gameData?.cardOrder, initializeCards, gameData])
  
  // Use ref to access current cards state in callbacks
  const cardsRef = useRef(cards)
  useEffect(() => {
    cardsRef.current = cards
  }, [cards])

  const handleJoinWithPassword = async () => {
    if (!address || !joinPassword.trim() || !gameData) {
      return
    }
    
    // Check if game is still available
    if (gameData.currentPlayers >= gameData.maxPlayers) {
      alert('Game is full. Cannot join.')
      setShowPasswordModal(false)
      setJoinPassword('')
      return
    }
    
    try {
      setIsSubmitting(true)
      
      // Validate stake amount
      const stakeAmount = typeof gameData.stake === 'string' ? parseFloat(gameData.stake) : gameData.stake
      if (isNaN(stakeAmount) || stakeAmount <= 0) {
        alert('Invalid stake amount. Please refresh the page and try again.')
        setShowPasswordModal(false)
        setJoinPassword('')
        setIsSubmitting(false)
        return
      }
      
      console.log(`[Join] Joining game ${gameData.id} with password, stake ${stakeAmount} ETH`)
      
      // joinGame will send stake amount (msg.value) and join the game in one transaction
      const txHash = await joinGame(gameData.id, stakeAmount, joinPassword.trim())
      console.log('[Join] Transaction sent:', txHash)
      
      // Wait for transaction to be mined and indexed
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Refresh game data
      const updatedGame = await getGame(gameData.id, chainId)
      const updatedScores = await getScores(gameData.id, chainId)
      setGameData(updatedGame)
      setScoresData(updatedScores)
      
      // Update player data
      if (address && updatedScores) {
        const updatedPlayer = updatedScores.find((p) => p.player.toLowerCase() === address.toLowerCase())
        if (updatedPlayer) {
          setPlayer(updatedPlayer)
          console.log('[Join] Player joined successfully:', updatedPlayer)
        } else {
          console.warn('[Join] Player not found in scores after join, but continuing...')
        }
      }
      
      setShowPasswordModal(false)
      setJoinPassword('')
      
      // Show success message
      alert(`Successfully joined the game! Stake: ${gameData.stake} ETH`)
    } catch (error: any) {
      console.error('Join game error:', error)
      const errorMsg = error?.message || error?.reason || 'Failed to join game. Please check the password.'
      alert(`Error: ${errorMsg}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Refresh game data periodically
  useEffect(() => {
    if (!gameData) return
    
    const refreshGameData = async () => {
      if (!gameData) return
      try {
        const updatedGame = await getGame(gameData.id, chainId)
        const updatedScores = await getScores(gameData.id, chainId)
        setGameData(updatedGame)
        setScoresData(updatedScores)
        
        // Update player data
        if (address && updatedScores) {
          const updatedPlayer = updatedScores.find((p) => p.player === address)
          if (updatedPlayer) {
            setPlayer(updatedPlayer)
            // If player has already played, prevent further interactions
            if (updatedPlayer.played && !gameCompleted) {
              setGameCompleted(true)
            }
          }
        }
        
        // Check if game is completed
        if (updatedGame.status === GameStatus.COMPLETED && !gameCompleted) {
          setGameCompleted(true)
          
          // For AI vs Player games, start countdown if not already started
          if (updatedGame.gameType === GameType.AI_VS_PLAYER && countdown === null) {
            setCountdown(10) // Start countdown from 10 seconds
          } else if (updatedGame.gameType !== GameType.AI_VS_PLAYER) {
            // For PvP games, redirect after short delay
            setTimeout(() => {
              window.location.href = `/results/${createSlug(updatedGame.name, updatedGame.id)}-${updatedGame.id}`
            }, 3000)
          }
        }
      } catch (error) {
        console.error('Error refreshing game data:', error)
      }
    }

    // Refresh every 3 seconds if game is in progress or created (to catch VRF fulfillment)
    if (gameData && (gameData.status === GameStatus.IN_PROGRESS || gameData.status === GameStatus.CREATED) && !gameCompleted) {
      const interval = setInterval(refreshGameData, 3000)
      return () => clearInterval(interval)
    }
  }, [gameData?.id, gameData?.status, address, gameCompleted, countdown, chainId, gameData])


  useEffect(() => {
    if (address && scoresData) {
      const currentPlayer = scoresData.find((p) => p.player === address)
      setPlayer(currentPlayer || null)
      
      // Check if other players have completed (for multi-player games)
      if (gameData?.gameType === GameType.PLAYER_VS_PLAYER && currentPlayer && !currentPlayer.played) {
        const completedPlayers = scoresData.filter((p) => p.played && p.player.toLowerCase() !== address.toLowerCase())
        if (completedPlayers.length > 0) {
          setOtherPlayerCompleted(true)
          // Get the most recently completed player
          const lastPlayer = completedPlayers[completedPlayers.length - 1]
          setLastCompletedPlayer(lastPlayer.player)
        } else {
          setOtherPlayerCompleted(false)
          setLastCompletedPlayer(null)
        }
      } else {
        setOtherPlayerCompleted(false)
        setLastCompletedPlayer(null)
      }
    }
  }, [address, scoresData, gameData?.gameType])

  // Auto-join for single player games: creator should automatically join
  useEffect(() => {
    const refreshPlayerData = async () => {
      // For single player AI games, creator is already joined in createGame
      // Just refresh player data instead of trying to join
      if (
        gameData?.gameType === GameType.AI_VS_PLAYER &&
        gameData?.maxPlayers === 1 &&
        address &&
        address.toLowerCase() === gameData.creator.toLowerCase() &&
        !player &&
        !isSubmitting
      ) {
        try {
          console.log('[gameplay] Refreshing player data for single player AI game on chainId:', chainId)
          const updatedScores = await getScores(gameData.id, chainId)
          if (address && updatedScores) {
            const updatedPlayer = updatedScores.find((p) => p.player === address)
            if (updatedPlayer) {
              setPlayer(updatedPlayer)
              console.log('[gameplay] Player data refreshed successfully:', updatedPlayer)
            } else {
              console.warn('[gameplay] Creator not found in scores - game may not be started yet')
            }
          }
        } catch (error: any) {
          console.error('[gameplay] Error refreshing player data:', error?.message || error)
        }
      }
    }

    // Only run if chainId is valid
    const validChainId = chainId || BASE_MAINNET_CHAIN_ID
    if (validChainId === BASE_MAINNET_CHAIN_ID) {
      refreshPlayerData()
    }
  }, [gameData?.gameType, gameData?.maxPlayers, gameData?.id, gameData?.creator, address, player, isSubmitting, chainId])

  // Countdown timer for AI vs Player games
  useEffect(() => {
    if (countdown !== null && countdown > 0 && gameData?.gameType === GameType.AI_VS_PLAYER) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0 && !winnerAnnounced && gameData?.gameType === GameType.AI_VS_PLAYER) {
      // Countdown finished, announce winner
      setWinnerAnnounced(true)
      const announceWinner = async () => {
        try {
          const finalGame = await getGame(gameData.id, chainId)
          if (finalGame.status === GameStatus.COMPLETED && finalGame.winner) {
            setTimeout(() => {
              window.location.href = `/results/${createSlug(finalGame.name, finalGame.id)}-${finalGame.id}`
            }, 1000)
          }
        } catch (error) {
          console.error('Error fetching final game:', error)
        }
      }
      announceWinner()
    }
  }, [countdown, gameData?.gameType, gameData?.id, gameData?.name, address, winnerAnnounced, chainId])

  const handleAutoSubmit = useCallback(async () => {
    if (!address || !player || isSubmitting || gameCompleted) return
    
    // Check game status and VRF before submitting
    if (gameData?.status !== GameStatus.IN_PROGRESS) {
      return
    }
    
    if (!gameData?.vrfFulfilled) {
      return
    }

    // Check if already completed
    if (player.played) {
      return
    }

    // Check if flipCount is valid
    if (flipCount === 0) {
      return
    }

    setIsSubmitting(true)

    try {
      await saveScore(player.gameId, player.id, flipCount)
      
      // Refresh game data immediately
      try {
        const updatedGame = await getGame(gameData.id, chainId)
        const updatedScores = await getScores(gameData.id, chainId)
        setGameData(updatedGame)
        setScoresData(updatedScores)
        
        // Update player data
        if (address && updatedScores) {
          const updatedPlayer = updatedScores.find((p) => p.player === address)
          if (updatedPlayer) {
            setPlayer(updatedPlayer)
            // If player has played, prevent further interactions
            if (updatedPlayer.played) {
              setGameCompleted(true)
            }
          }
        }
        
        // Check if game is completed
        if (updatedGame.status === GameStatus.COMPLETED) {
          setGameCompleted(true)
          
          // For AI vs Player games, start 30 second countdown
          if (updatedGame.gameType === GameType.AI_VS_PLAYER) {
            setCountdown(10) // Start countdown from 10 seconds
          } else {
            // For PvP games, redirect after short delay
            setTimeout(() => {
              window.location.href = `/results/${createSlug(updatedGame.name, updatedGame.id)}-${updatedGame.id}`
            }, 3000)
          }
        }
      } catch (error) {
        console.error('Error refreshing game data:', error)
      }
      
      setIsSubmitting(false)
    } catch (error: any) {
      console.error('Auto-submit error:', error)
      setIsSubmitting(false)
    }
  }, [address, player, gameData?.status, gameData?.vrfFulfilled, gameData?.id, flipCount, isSubmitting, gameCompleted, chainId])

  // Auto-submit disabled - user should manually click Submit Game button (mainnet style)
  // This allows user to review their game before submitting
  // useEffect(() => {
  //   if (
  //     allCardsFlipped &&
  //     player &&
  //     address &&
  //     gameData?.status === GameStatus.IN_PROGRESS &&
  //     gameData?.vrfFulfilled &&
  //     !player.played &&
  //     !isSubmitting &&
  //     !gameCompleted &&
  //     flipCount > 0
  //   ) {
  //     // Small delay to ensure all cards are visible and flip count is recorded
  //     const timer = setTimeout(() => {
  //       handleAutoSubmit()
  //     }, 2000) // Increased delay to ensure flip count is saved
  //     return () => clearTimeout(timer)
  //   }
  // }, [allCardsFlipped, gameData?.vrfFulfilled, gameData?.status, player, handleAutoSubmit, isSubmitting, gameCompleted, flipCount, address, gameData])

  // Update cards when VRF is fulfilled and card order is available (only once at game start)
  useEffect(() => {
    if (!gameData) return
    
    if (gameData.vrfFulfilled && gameData.cardOrder && gameData.cardOrder.length === 12) {
      // Only initialize cards if they haven't been initialized yet (all cards are not flipped/matched)
      setCards((prevCards) => {
        // If cards are already initialized and some are flipped or matched, don't reset
        if (prevCards.length > 0 && (prevCards.some((card) => card.isFlipped) || prevCards.some((card) => card.matched))) {
          return prevCards
        }
        // Otherwise, initialize with VRF order
        return initializeCards(gameData.cardOrder)
      })
    }
  }, [gameData?.vrfFulfilled, gameData?.cardOrder, initializeCards, gameData])

  const handleCardClick = useCallback((id: number) => {
    if (!gameData) return
    
    // For ALL AI vs Player games, allow playing more leniently
    const isAIGame = gameData.gameType === GameType.AI_VS_PLAYER
    const isAIGameSingle = isAIGame && gameData.maxPlayers === 1
    const isCreator = address && address.toLowerCase() === gameData.creator?.toLowerCase()
    const canPlay = isAIGame || // ALL AI games can play
                   gameData.status === GameStatus.IN_PROGRESS || 
                   (gameData.status === GameStatus.CREATED && gameData.vrfFulfilled) ||
                   (gameData.status === GameStatus.COMPLETED && !player?.played && isCreator)
    
    // Prevent clicking if game cannot be played, completed (and player already played), submitting
    // For ALL AI games, be very lenient - only block if game is completed and player already played
    if (isSubmitting) {
      return
    }
    
    if (gameCompleted && player?.played) {
      return
    }
    
    // For non-AI games, check normal conditions
    if (!isAIGame) {
      if (!canPlay) {
        return
      }
      if (!gameData.vrfFulfilled) {
        return
      }
    }

    // For multi-player games, check if player has already played
    if (gameData.gameType === GameType.PLAYER_VS_PLAYER && player?.played) {
      return
    }

    // For AI vs Player games, allow clicking even if player is not in scores yet
    // (auto-join will handle joining)

    // For multi-player games, only creator can play first
    if (gameData.gameType === GameType.PLAYER_VS_PLAYER && address) {
      const isCreator = address.toLowerCase() === gameData.creator.toLowerCase()
      if (!isCreator) {
        // Check if creator has already played
        const creatorPlayer = scoresData.find((p) => p.player.toLowerCase() === gameData.creator.toLowerCase())
        if (!creatorPlayer || !creatorPlayer.played) {
          // Creator hasn't played yet, non-creator players must wait
          return
        }
      }
    }

    // Use functional updates to avoid stale closures
    setCards((prevCards) => {
      // Find the clicked card
      const clickedCard = prevCards.find((card) => card.id === id)
      if (!clickedCard || clickedCard.isFlipped) {
        return prevCards
      }

      // Don't allow clicking if 2 cards are already open
      const currentlyOpen = prevCards.filter((card) => card.isFlipped && !card.matched)
      if (currentlyOpen.length >= 2) {
        return prevCards
      }

      // Flip the clicked card
      const updatedCards = prevCards.map((card) =>
        card.id === id ? { ...card, isFlipped: true } : card
      )
      
      // Check if all cards are flipped (for auto-submit)
      const allFlipped = updatedCards.every((card) => card.isFlipped)
      setAllCardsFlipped(allFlipped)

      // Check for matches with the newly flipped card
      const flippedCards = updatedCards.filter((card) => card.isFlipped && !card.matched)
      
      if (flippedCards.length === 2) {
        const [card1, card2] = flippedCards
        
        // Check if they match (same name)
        if (card1.name === card2.name) {
          // Match found - mark them as matched (keep isFlipped: true)
          // Increment flipCount for successful match
          setFlipCount((prevCount) => prevCount + 1)
          
          setTimeout(() => {
            setCards((currentCards) =>
              currentCards.map((card) =>
                card.id === card1.id || card.id === card2.id
                  ? { ...card, matched: true, isFlipped: true }
                  : card
              )
            )
          }, 500)
        } else {
          // No match - flip them back
          // Don't increment flipCount for failed matches
          setTimeout(() => {
            setCards((currentCards) =>
              currentCards.map((card) =>
                card.id === card1.id || card.id === card2.id
                  ? { ...card, isFlipped: false }
                  : card
              )
            )
          }, 1000)
        }
      } else {
        // Only one card flipped - increment flipCount when first card is flipped
        // This counts as a flip attempt
        setFlipCount((prevCount) => prevCount + 1)
      }

      return updatedCards
    })
  }, [gameData, gameCompleted, isSubmitting, player?.played, address, scoresData])


  const handleSubmit = async () => {
    if (!address || !gameData) {
      alert('Please connect your wallet')
      return
    }
    if (isSubmitting) return
    
    // CRITICAL: Check game status FIRST
    // For single player AI games, allow submit even if status is COMPLETED (if player hasn't submitted yet)
    const isSingleAIGame = gameData.gameType === GameType.AI_VS_PLAYER && gameData.maxPlayers === 1
    const canSubmitInCompletedStatus = isSingleAIGame && gameData.status === GameStatus.COMPLETED && 
                                       player && !player.played && player.state !== PlayerState.SUBMITTED
    
    if (gameData.status !== GameStatus.IN_PROGRESS && !canSubmitInCompletedStatus) {
      const statusMessages: Record<number, string> = {
        0: 'Game has not started yet. Please wait for the game to start.',
        1: 'Game is waiting for VRF. Please wait.',
        3: 'Game is already completed.',
        4: 'Game has been cancelled.',
      }
      alert(statusMessages[gameData.status] || `Game is not active (status: ${gameData.status}).`)
      return
    }
    
    // CRITICAL: Check if player has already completed (prevent multiple submissions)
    // Check both hasCompleted and state
    if (player && (player.played || player.state === PlayerState.SUBMITTED)) {
      alert('You have already completed this game. Please wait for other players to finish.')
      setGameCompleted(true)
      return
    }
    
    // Also check from blockchain directly to be sure
    try {
      const currentScores = await getScores(gameData.id, chainId)
      if (address && currentScores) {
        const currentPlayer = currentScores.find((p) => p.player === address)
        if (currentPlayer && (currentPlayer.played || currentPlayer.state === PlayerState.SUBMITTED)) {
          alert('You have already completed this game. Please wait for other players to finish.')
          setPlayer(currentPlayer)
          setGameCompleted(true)
          return
        }
      }
    } catch (error) {
      console.warn('[handleSubmit] Error checking player status, continuing:', error)
    }
    
    // Check flipCount before submitting
    console.log('[handleSubmit] Current flipCount:', flipCount)
    if (flipCount === 0 || flipCount < 0) {
      alert('Flip count must be greater than 0. Please play the game first by flipping cards.')
      return
    }
    
    // For AI games, player might not be in scores yet, so we'll handle that in submitCompletion
    // For other games, check if player exists
    if (gameData.gameType !== GameType.AI_VS_PLAYER && !player) {
      alert('Please join the game first')
      return
    }
    
    // Check game status - allow CREATED, IN_PROGRESS, or COMPLETED (if not played)
    // Mainnet style: be more lenient with status checks
    const status = gameData.status ?? GameStatus.CREATED
    const isAIGame = gameData.gameType === GameType.AI_VS_PLAYER
    
    // For AI games, allow any status (CREATED, IN_PROGRESS, COMPLETED)
    // For other games, require IN_PROGRESS or CREATED
    if (!isAIGame && status !== GameStatus.IN_PROGRESS && status !== GameStatus.CREATED) {
      if (!(status === GameStatus.COMPLETED && !player?.played)) {
        alert('Game is not in a valid state for submission')
        return
      }
    }
    
    // VRF check - only require VRF for non-AI games
    // For AI games, VRF will be fulfilled automatically during submission
    if (!isAIGame && !gameData.vrfFulfilled) {
      alert('VRF has not been fulfilled yet. Please wait a moment.')
      return
    }

    setIsSubmitting(true)

    try {
      // For AI games, refresh player data first
      // Single player AI games: creator is already joined in createGame, game auto-starts
      // Multi-player AI games: may need joining if status is CREATED
      if (gameData.gameType === GameType.AI_VS_PLAYER) {
        const isCreator = address && address.toLowerCase() === gameData.creator.toLowerCase()
        
        // For ALL AI games where user is creator, creator is already joined in contract (in createGame)
        // We can skip player data check and proceed with submit
        // Even if scores don't show the player yet (indexing delay), contract has the player
        if (isCreator) {
          console.log('[handleSubmit] AI game - creator is already joined in contract, skipping player data check')
          // Try to refresh player data for UI, but don't fail if not found (indexing delay)
          try {
            const updatedScores = await getScores(gameData.id, chainId)
            if (address && updatedScores) {
              const updatedPlayer = updatedScores.find((p) => p.player === address)
              if (updatedPlayer) {
                setPlayer(updatedPlayer)
                console.log('[handleSubmit] Creator found in scores:', updatedPlayer)
              } else {
                console.warn('[handleSubmit] Creator not found in scores (indexing delay), but continuing - creator is already joined in contract')
              }
            }
          } catch (error) {
            console.warn('[handleSubmit] Error refreshing scores, but continuing - creator is already joined in contract:', error)
          }
        } else {
          // For multi-player AI games, refresh player data first
          try {
            const updatedScores = await getScores(gameData.id, chainId)
            if (address && updatedScores) {
              const updatedPlayer = updatedScores.find((p) => p.player === address)
              if (updatedPlayer) {
                setPlayer(updatedPlayer)
                console.log('[handleSubmit] Player found in scores:', updatedPlayer)
              }
            }
          } catch (error) {
            console.warn('[handleSubmit] Error refreshing scores:', error)
          }
          // Multi-player AI game - only try to join if game is CREATED
          // If game is IN_PROGRESS, player should already be joined (or can't join)
          if (gameData.status === GameStatus.CREATED && !player) {
            console.log('[handleSubmit] Multi-player AI game is CREATED and player not found, attempting to join...')
            try {
              await joinGame(gameData.id, gameData.stake)
              // Wait a bit for transaction to be indexed
              await new Promise(resolve => setTimeout(resolve, 2000))
              
              // Refresh game data
              const updatedGame = await getGame(gameData.id, chainId)
              const updatedScores = await getScores(gameData.id, chainId)
              setGameData(updatedGame)
              setScoresData(updatedScores)
              
              // Update player data
              if (address && updatedScores) {
                const updatedPlayer = updatedScores.find((p) => p.player === address)
                if (updatedPlayer) {
                  setPlayer(updatedPlayer)
                  console.log('[handleSubmit] Player joined successfully')
                }
              }
            } catch (joinError: any) {
              // If already joined or game started, that's okay - try to submit anyway
              const errorMsg = joinError?.message?.toLowerCase() || ''
              if (errorMsg.includes('already') || errorMsg.includes('not available') || errorMsg.includes('in progress')) {
                console.log('[handleSubmit] Join failed but continuing (game may have started):', errorMsg)
                // Refresh player data in case player was already joined
                try {
                  const updatedScores = await getScores(gameData.id, chainId)
                  if (address && updatedScores) {
                    const updatedPlayer = updatedScores.find((p) => p.player === address)
                    if (updatedPlayer) {
                      setPlayer(updatedPlayer)
                    }
                  }
                } catch (refreshError) {
                  console.warn('[handleSubmit] Error refreshing scores after join attempt:', refreshError)
                }
              } else {
                // Don't throw error - just log and continue
                // Player might already be joined, just refresh and try submit
                console.warn('[handleSubmit] Join failed, but continuing with submit attempt:', errorMsg)
                try {
                  const updatedScores = await getScores(gameData.id, chainId)
                  if (address && updatedScores) {
                    const updatedPlayer = updatedScores.find((p) => p.player === address)
                    if (updatedPlayer) {
                      setPlayer(updatedPlayer)
                    }
                  }
                } catch (refreshError) {
                  console.warn('[handleSubmit] Error refreshing scores after join attempt:', refreshError)
                }
              }
            }
          } else if (gameData.status === GameStatus.IN_PROGRESS && !player) {
            // Game is IN_PROGRESS - can't join anymore, just refresh player data
            console.log('[handleSubmit] Multi-player AI game is IN_PROGRESS, refreshing player data...')
            try {
              const updatedScores = await getScores(gameData.id, chainId)
              if (address && updatedScores) {
                const updatedPlayer = updatedScores.find((p) => p.player === address)
                if (updatedPlayer) {
                  setPlayer(updatedPlayer)
                  console.log('[handleSubmit] Player found in scores')
                } else {
                  throw new Error('Player not found in game. Game may have already started without you.')
                }
              }
            } catch (error) {
              throw new Error('Player not found in game. Game may have already started without you.')
            }
          }
        }
      }
      
      // Before submitting, ensure player has joined
      // For AI games, creator is already joined in createGame
      // For multi-player games, player should be joined
      const isAIGame = gameData.gameType === GameType.AI_VS_PLAYER
      const isPlayerVsPlayer = gameData.gameType === GameType.PLAYER_VS_PLAYER
      const isCreator = address && address.toLowerCase() === gameData.creator.toLowerCase()
      
      // For PLAYER_VS_PLAYER games, check if player has joined
      if (isPlayerVsPlayer) {
        // Refresh player data to check if player has joined
        try {
          const finalScores = await getScores(gameData.id, chainId)
          if (address && finalScores) {
            const finalPlayer = finalScores.find((p) => p.player === address)
            if (finalPlayer) {
              setPlayer(finalPlayer)
              console.log('[handleSubmit] Player found in game:', finalPlayer)
            } else {
              // Player not found - need to join first
              // Try to join if game is still accepting players
              if (gameData.status === GameStatus.CREATED || gameData.status === GameStatus.IN_PROGRESS) {
                if (gameData.currentPlayers < gameData.maxPlayers) {
                  console.log('[handleSubmit] Player not found, attempting to join game...')
                  try {
                    await joinGame(gameData.id, gameData.stake, '')
                    // Wait for transaction to be indexed
                    await new Promise(resolve => setTimeout(resolve, 2000))
                    
                    // Refresh game data
                    const updatedGame = await getGame(gameData.id, chainId)
                    const updatedScores = await getScores(gameData.id, chainId)
                    setGameData(updatedGame)
                    setScoresData(updatedScores)
                    
                    // Update player data
                    if (address && updatedScores) {
                      const updatedPlayer = updatedScores.find((p) => p.player === address)
                      if (updatedPlayer) {
                        setPlayer(updatedPlayer)
                        console.log('[handleSubmit] Player joined successfully')
                      } else {
                        throw new Error('Failed to join game. Please try again.')
                      }
                    }
                  } catch (joinError: any) {
                    const errorMsg = joinError?.message?.toLowerCase() || ''
                    if (errorMsg.includes('already joined')) {
                      // Player already joined, refresh scores
                      const updatedScores = await getScores(gameData.id, chainId)
                      if (address && updatedScores) {
                        const updatedPlayer = updatedScores.find((p) => p.player === address)
                        if (updatedPlayer) {
                          setPlayer(updatedPlayer)
                        } else {
                          throw new Error('Please join the game first.')
                        }
                      }
                    } else {
                      throw new Error('Failed to join game. Please try again.')
                    }
                  }
                } else {
                  throw new Error('Game is full. Cannot join.')
                }
              } else {
                throw new Error('Game is not accepting new players. Please join the game first.')
              }
            }
          } else {
            throw new Error('Unable to fetch player data. Please refresh the page and try again.')
          }
        } catch (error: any) {
          if (error?.message?.includes('Please join') || error?.message?.includes('Failed to join') || error?.message?.includes('Game is full') || error?.message?.includes('not accepting')) {
            throw error
          }
          console.warn('[handleSubmit] Error checking/joining player:', error)
          throw new Error('Please join the game first.')
        }
      } else if (!(isAIGame && isCreator)) {
        // For non-AI games, or non-creator, refresh player data
        try {
          const finalScores = await getScores(gameData.id, chainId)
          if (address && finalScores) {
            const finalPlayer = finalScores.find((p) => p.player === address)
            if (finalPlayer) {
              setPlayer(finalPlayer)
              console.log('[handleSubmit] Final player data:', finalPlayer)
            } else {
              // Player not found - this is an error
              throw new Error('Player not found in game. Please refresh the page and try again.')
            }
          } else {
            throw new Error('Unable to fetch player data. Please refresh the page and try again.')
          }
        } catch (error: any) {
          if (error?.message?.includes('Player not found') || error?.message?.includes('Unable to fetch')) {
            throw error
          }
          console.warn('[handleSubmit] Error refreshing final player data:', error)
        }
      } else {
        // For AI games where user is creator, creator is already joined in contract
        // Even if getScores doesn't return the player (indexing delay), we can still submit
        console.log('[handleSubmit] AI game - creator is already joined in contract, skipping player data check and proceeding with submit')
      }
      
      // For PVP games, we need to do commit-reveal before submitCompletion
      if (gameData.gameType === GameType.PLAYER_VS_PLAYER) {
        const { commitRevealAndSubmit } = await import('@/services/blockchain')
        
        console.log('[handleSubmit] PVP game - starting commit-reveal-submit flow (single transaction)')
        
        // Double-check flipCount before submitting (contract requires flipCount > 0)
        if (!flipCount || flipCount <= 0) {
          throw new Error('Flip count must be greater than 0. Please play the game first by flipping cards.')
        }
        
        // Generate random salt for commit-reveal
        const salt = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
        
        // Single transaction: Commit, Reveal, and Submit (UX optimization - only 1 wallet confirmation)
        console.log('[handleSubmit] Committing, revealing, and submitting score with flipCount:', flipCount, 'salt:', salt)
        const txHash = await commitRevealAndSubmit(gameData.id, flipCount, salt)
        console.log('[handleSubmit] Commit+Reveal+Submit transaction confirmed:', txHash)
        
        // Wait for transaction to be mined and indexed
        console.log('[handleSubmit] Waiting for transaction to be indexed...')
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Refresh game data to check for winner (same logic as AI games)
        let updatedGame: GameStruct | null = null
        try {
          // Try multiple times to get updated game data (blockchain indexing delay)
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000))
            updatedGame = await getGame(gameData.id, chainId)
            const updatedScores = await getScores(gameData.id, chainId)
            setGameData(updatedGame)
            setScoresData(updatedScores)
            
            // Update player data
            if (address && updatedScores) {
              const updatedPlayer = updatedScores.find((p) => p.player === address)
              if (updatedPlayer) {
                setPlayer(updatedPlayer)
                // CRITICAL: If player has completed, mark as completed and prevent further submissions
                if (updatedPlayer.played || updatedPlayer.state === PlayerState.SUBMITTED) {
                  setGameCompleted(true)
                  console.log('[handleSubmit] Player has completed, preventing further submissions')
                }
              }
            }
            
            // Check if game is completed and winner is announced
            if (updatedGame && updatedGame.status === GameStatus.COMPLETED && updatedGame.winner) {
              console.log('[handleSubmit] Game completed! Winner:', updatedGame.winner)
              setGameCompleted(true)
              
              // Show winner immediately and redirect to results
              const finalGame = updatedGame // Store in const for setTimeout closure
              setTimeout(() => {
                if (finalGame) {
                  window.location.href = `/results/${createSlug(finalGame.name, finalGame.id)}-${finalGame.id}`
                }
              }, 3000)
              break
            }
          }
        } catch (error) {
          console.warn('[handleSubmit] Error refreshing final player data:', error)
        }
      } else {
        // For AI games, just submit directly
        const { submitCompletion } = await import('@/services/blockchain')
        console.log('[handleSubmit] AI game - calling submitCompletion with flipCount:', flipCount, 'gameId:', gameData.id)
        
        // Double-check flipCount before submitting (contract requires flipCount > 0)
        if (!flipCount || flipCount <= 0) {
          throw new Error('Flip count must be greater than 0. Please play the game first by flipping cards.')
        }
        
        const txHash = await submitCompletion(gameData.id, flipCount)
        console.log('[handleSubmit] Transaction submitted:', txHash)
        
        // Wait for transaction to be mined and indexed
        console.log('[handleSubmit] Waiting for transaction to be indexed...')
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Refresh game data to check for winner
        let updatedGame: GameStruct | null = null
        try {
          // Try multiple times to get updated game data (blockchain indexing delay)
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000))
            updatedGame = await getGame(gameData.id, chainId)
            const updatedScores = await getScores(gameData.id, chainId)
            setGameData(updatedGame)
            setScoresData(updatedScores)
            
            // Update player data
            if (address && updatedScores) {
              const updatedPlayer = updatedScores.find((p) => p.player === address)
              if (updatedPlayer) {
                setPlayer(updatedPlayer)
                // CRITICAL: If player has completed, mark as completed and prevent further submissions
                if (updatedPlayer.played) {
                  setGameCompleted(true)
                  console.log('[handleSubmit] Player has completed, preventing further submissions')
                }
              }
            }
            
            // Check if game is completed and winner is announced
            if (updatedGame.status === GameStatus.COMPLETED && updatedGame.winner) {
              console.log('[handleSubmit] Game completed! Winner:', updatedGame.winner)
              setGameCompleted(true)
              
              // Show winner immediately and redirect to results
              setTimeout(() => {
                window.location.href = `/results/${createSlug(updatedGame!.name, updatedGame!.id)}-${updatedGame!.id}`
              }, 2000)
              break
            }
            
            // If still not completed, continue checking
            if (i < 4) {
              console.log(`[handleSubmit] Game not completed yet, checking again... (${i + 1}/5)`)
            }
          }
          
          // If game is still not completed after all checks, show message
          if (updatedGame && updatedGame.status !== GameStatus.COMPLETED) {
            console.log('[handleSubmit] Game submission successful, but winner not yet determined. Please wait...')
            setGameCompleted(true)
            
            // For multi-player games, show waiting message
            if (updatedGame.gameType === GameType.PLAYER_VS_PLAYER) {
              // Check if player has completed but game is not completed yet
              if (player && player.played && updatedGame.status === GameStatus.IN_PROGRESS) {
                // Player completed, but waiting for other players
                console.log('[handleSubmit] Player completed, waiting for other players to finish...')
                // Show waiting message - gameCompleted is already set to true
              }
            } else if (updatedGame.gameType === GameType.AI_VS_PLAYER) {
              // For AI games, start countdown as fallback
              setCountdown(10)
            }
          }
        } catch (error) {
          console.error('Error refreshing game data:', error)
          // Even if refresh fails, mark as completed and start countdown for AI games
          if (gameData.gameType === GameType.AI_VS_PLAYER) {
            setGameCompleted(true)
            setCountdown(10)
          }
        }
      }
    } catch (error: any) {
      console.error('Submit error:', error)
      // Show error to user
      const errorMessage = error?.message || error?.reason || 'Failed to submit game. Please try again.'
      alert(`Error: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading state
  if (loading || !gameData) {
    return (
      <div>
        <Head>
          <title>MonFair | Loading Game...</title>
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <div className="min-h-screen flex flex-col justify-center items-center">
          <div className="text-center">
            <div className="text-4xl mb-4">🎮</div>
            <p className="text-gray-300 text-lg">Loading game...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Head>
        <title>MonFair | Game #{gameData?.id}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen flex flex-col justify-center items-center space-y-8 px-4 py-12">
        <div className="text-center space-y-6 w-full max-w-2xl">
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-primary-400 via-secondary-400 to-primary-300 bg-clip-text text-transparent mb-3 tracking-tight font-display">
              {gameData?.name || `Game #${gameData?.id}`}
            </h1>
            <GameStatusBadge status={gameData?.status || GameStatus.CREATED} />
          </div>
          
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <GameStatusBadge status={gameData?.status || 0} />
            {gameData?.vrfFulfilled ? (
              <span className="badge-success">
                <FaCheckCircle className="mr-1" size={12} />
                VRF Ready
              </span>
            ) : (
              <span className="badge-warning">
                <FaExclamationTriangle className="mr-1" size={12} />
                VRF Pending
              </span>
            )}
          </div>
          
          {!gameData?.vrfFulfilled && gameData?.status === GameStatus.IN_PROGRESS && (
            <div className="card bg-primary-900/20 border-primary-800">
              <p className="text-primary-300 text-sm">
                VRF is being processed automatically. Please wait a moment...
              </p>
            </div>
          )}


          <div className="card bg-gradient-to-br from-primary-500/10 via-dark-800/50 to-secondary-500/10 border-2 border-primary-500/20">
            <div className="grid grid-cols-2 gap-6">
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 border border-primary-500/30">
                <div className="text-gray-400 mb-2 text-sm font-semibold">🎯 Flip Count</div>
                <div className="text-4xl font-extrabold bg-gradient-to-r from-primary-400 to-primary-300 bg-clip-text text-transparent">{flipCount}</div>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-accent-500/20 to-accent-600/10 border border-accent-500/30">
                <div className="text-gray-400 mb-2 text-sm font-semibold">💰 Stake</div>
                <div className="text-3xl font-extrabold text-accent-400">{gameData?.stake} ETH</div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-4xl">
          {/* Players status table for multi-player games */}
          {gameData?.gameType === GameType.PLAYER_VS_PLAYER && 
           scoresData.length > 0 && (
            <div className="card bg-dark-800/60 border border-dark-700/60 mb-4">
              <div className="p-4">
                <h3 className="text-lg font-bold text-gray-100 mb-3 flex items-center gap-2">
                  <span>👥</span>
                  Players Status
                </h3>
                <div className="space-y-2">
                  {scoresData.map((score, index) => {
                    const isCurrentPlayer = address && score.player.toLowerCase() === address.toLowerCase()
                    const isCompleted = score.played || score.state === PlayerState.SUBMITTED
                    
                    return (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          isCurrentPlayer
                            ? 'bg-primary-500/10 border-primary-500/30'
                            : 'bg-dark-700/40 border-dark-600/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            isCompleted
                              ? 'bg-success-500/20 text-success-400'
                              : isCurrentPlayer && otherPlayerCompleted
                              ? 'bg-warning-500/20 text-warning-400 animate-pulse'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {isCompleted ? '✓' : index + 1}
                          </div>
                          <div>
                            <div className={`text-sm font-semibold ${
                              isCurrentPlayer ? 'text-primary-300' : 'text-gray-300'
                            }`}>
                              {isCurrentPlayer ? 'You' : `${score.player.slice(0, 6)}...${score.player.slice(-4)}`}
                            </div>
                            {isCurrentPlayer && otherPlayerCompleted && !isCompleted && (
                              <div className="text-xs text-warning-400 font-bold mt-1">
                                🎯 It&apos;s your turn!
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isCompleted ? (
                            <span className="px-2 py-1 rounded-full bg-success-500/20 text-success-400 text-xs font-bold">
                              Completed
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full bg-gray-500/20 text-gray-400 text-xs font-bold">
                              Waiting...
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Show waiting message for non-creator players in multi-player games */}
          {gameData?.gameType === GameType.PLAYER_VS_PLAYER && 
           address && 
           gameData?.status === GameStatus.IN_PROGRESS &&
           gameData?.vrfFulfilled &&
           address.toLowerCase() !== gameData.creator.toLowerCase() && 
           !otherPlayerCompleted && (
            (() => {
              const creatorPlayer = scoresData.find((p) => p.player.toLowerCase() === gameData.creator.toLowerCase())
              if (!creatorPlayer || !creatorPlayer.played) {
                return (
                  <div className="card bg-info-900/20 border-info-800 mb-4">
                    <p className="text-info-300 text-sm text-center py-2">
                      ⏳ Waiting for game creator to finish playing...
                    </p>
                  </div>
                )
              }
              return null
            })()
          )}

          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {cards.map((card: GameCardStruct, i: number) => {
              // Check if cards should be disabled
              // For AI vs Player games, allow clicking if game is in progress and VRF is fulfilled
              // Player check is only for multi-player games
              const isAIGame = gameData?.gameType === GameType.AI_VS_PLAYER
              
              // Allow playing if:
              // 1. Game is IN_PROGRESS (normal case) - VRF must be fulfilled
              // 2. Game is CREATED but VRF is fulfilled (game started but status not updated yet)
              // 3. Game is COMPLETED but player hasn't played yet (catch up scenario)
              // For AI vs Player games, be more lenient - allow if game started even if VRF pending
              const isCreator = address && address.toLowerCase() === gameData.creator.toLowerCase()
              const isAIGameSingle = isAIGame && gameData?.maxPlayers === 1
              
              // For single AI games, allow playing in any status (CREATED, IN_PROGRESS, or COMPLETED if not played)
              // VRF will be fulfilled automatically, so we don't need to wait for it
              const status = gameData?.status ?? GameStatus.CREATED
              
              // For ALL AI vs Player games (single or multi), always allow playing
              // VRF will be fulfilled automatically, so we don't need to wait for it
              // For other games, require IN_PROGRESS or CREATED with VRF
              const canPlay = isAIGame || // ALL AI games can always play (single or multi)
                            status === GameStatus.IN_PROGRESS || 
                            (status === GameStatus.CREATED && gameData?.vrfFulfilled) ||
                            (status === GameStatus.COMPLETED && !player?.played && isCreator)
              
              // Simplified card disabled logic - mainnet style
              // Cards are disabled only if:
              // 1. Card is already flipped or matched
              // 2. Currently submitting
              // 3. Game is completed AND player already played
              // 4. VRF not fulfilled (except for single AI games where we allow it)
              // 5. Already 2 cards open
              // 6. For multi-player: player already played
              let isCardDisabled = 
                card.isFlipped ||
                card.matched ||
                isSubmitting ||
                cards.filter((c) => c.isFlipped && !c.matched).length >= 2
              
              // VRF check - for ALL AI games, skip VRF check (will be fulfilled automatically)
              // For other games, require VRF to be fulfilled
              if (!isAIGame && !gameData?.vrfFulfilled) {
                isCardDisabled = true
              }
              
              // Only disable if game status prevents playing (but AI games can always play)
              if (!canPlay && !isAIGame) {
                isCardDisabled = true
              }
              
              // Only disable if game is completed AND player already played
              if (gameCompleted && player?.played) {
                isCardDisabled = true
              }
              
              // For multi-player games, check if player has played
              if (!isAIGame && player?.played) {
                isCardDisabled = true
              }
              
              // ASYNCHRONOUS PVP MODEL:
              // Once game is IN_PROGRESS (VRF fulfilled, all players joined), everyone can play
              // No need to wait for other players - each player plays independently
              // The creator can play immediately after 2nd player joins and game starts
              // This is already handled by the status check above (IN_PROGRESS allows playing)

              return (
                <GameCard
                  key={i}
                  card={card}
                  isDisabled={isCardDisabled}
                  onClick={(id) => {
                    handleCardClick(id)
                  }}
                  className="w-full aspect-square"
                />
              )
            })}
          </div>
        </div>

        <div className={`flex flex-col gap-3 w-full ${(gameData?.gameType === GameType.AI_VS_PLAYER && gameData?.maxPlayers === 1) || gameData?.gameType === GameType.PLAYER_VS_PLAYER ? 'max-w-md mx-auto items-center' : 'max-w-md'}`}>
          {/* Join Game button - only for PLAYER_VS_PLAYER games, when game is not full and player hasn't joined */}
          {gameData?.gameType === GameType.PLAYER_VS_PLAYER &&
           address && 
           !player && // Player hasn't joined yet
           gameData.currentPlayers < gameData.maxPlayers && // Game is not full
           (gameData.status === GameStatus.CREATED || gameData.status === GameStatus.IN_PROGRESS) && (
            <button
              className="btn-primary flex items-center justify-center gap-2 w-full"
              onClick={async () => {
                if (!address || !gameData) {
                  alert('Please connect your wallet')
                  return
                }
                
                // Check if game is still available
                if (gameData.currentPlayers >= gameData.maxPlayers) {
                  alert('Game is full. Cannot join.')
                  return
                }
                
                // Show password modal if game is password-protected
                if (gameData.hasPassword) {
                  setShowPasswordModal(true)
                  return
                }
                
                // Join game - this will send stake amount and join in one transaction
                try {
                  setIsSubmitting(true)
                  
                  // Validate stake amount
                  const stakeAmount = typeof gameData.stake === 'string' ? parseFloat(gameData.stake) : gameData.stake
                  if (isNaN(stakeAmount) || stakeAmount <= 0) {
                    throw new Error('Invalid stake amount. Please refresh the page and try again.')
                  }
                  
                  console.log(`[Join] Joining game ${gameData.id} with stake ${stakeAmount} ETH`)
                  
                  // joinGame will send stake amount (msg.value) and join the game in one transaction
                  const txHash = await joinGame(gameData.id, stakeAmount, '')
                  console.log('[Join] Transaction sent:', txHash)
                  
                  // Wait for transaction to be mined and indexed
                  await new Promise(resolve => setTimeout(resolve, 3000))
                  
                  // Refresh game data
                  const updatedGame = await getGame(gameData.id, chainId)
                  const updatedScores = await getScores(gameData.id, chainId)
                  setGameData(updatedGame)
                  setScoresData(updatedScores)
                  
                  // Update player data
                  if (address && updatedScores) {
                    const updatedPlayer = updatedScores.find((p) => p.player.toLowerCase() === address.toLowerCase())
                    if (updatedPlayer) {
                      setPlayer(updatedPlayer)
                      console.log('[Join] Player joined successfully:', updatedPlayer)
                    } else {
                      console.warn('[Join] Player not found in scores after join, but continuing...')
                    }
                  }
                  
                  // Show success message
                  alert(`Successfully joined the game! Stake: ${gameData.stake} ETH`)
                } catch (error: any) {
                  console.error('Join game error:', error)
                  const errorMsg = error?.message || error?.reason || 'Failed to join game. Please try again.'
                  alert(`Error: ${errorMsg}`)
                } finally {
                  setIsSubmitting(false)
                }
              }}
              disabled={isSubmitting || gameData.currentPlayers >= gameData.maxPlayers}
            >
              <FaCheckCircle size={16} />
              {isSubmitting 
                ? 'Joining...' 
                : `Join Game & Pay Stake (${gameData.stake} ETH)`}
            </button>
          )}

          {/* Waiting message if game is CREATED but full */}
          {gameData?.status === GameStatus.CREATED && 
           gameData.currentPlayers >= gameData.maxPlayers && (
            <div className="card bg-warning-900/20 border-warning-800 w-full">
              <p className="text-warning-300 text-sm text-center py-2">
                ⏳ Game is full. Waiting for game to start...
              </p>
            </div>
          )}

          {/* Waiting message if game is CREATED and player needs to wait (only for multi-player) */}
          {gameData?.status === GameStatus.CREATED && 
           address && 
           player?.played === false && 
           gameData.currentPlayers < gameData.maxPlayers &&
           gameData.gameType === GameType.PLAYER_VS_PLAYER && (
            <div className="card bg-info-900/20 border-info-800 w-full">
              <p className="text-info-300 text-sm text-center py-2">
                ⏳ Waiting for more players to join... ({gameData.currentPlayers}/{gameData.maxPlayers})
              </p>
            </div>
          )}


          {/* Submit Game button - show when all cards are flipped (mainnet style) */}
          {/* Center the button for all game types */}
          {(() => {
            // For single player AI games, allow submit even if game is completed (if player hasn't submitted)
            const isSingleAIGame = gameData?.gameType === GameType.AI_VS_PLAYER && gameData?.maxPlayers === 1
            const canSubmitInCompleted = isSingleAIGame && 
                                         gameData?.status === GameStatus.COMPLETED && 
                                         player && 
                                         !player.played && 
                                         player.state !== PlayerState.SUBMITTED
            
            const shouldShowButton = !isSubmitting && 
                                     allCardsFlipped && 
                                     flipCount > 0 &&
                                     (!gameCompleted || canSubmitInCompleted) &&
                                     !(player && (player.played || player.state === PlayerState.SUBMITTED))
            
            const isButtonDisabled = Boolean(isSubmitting || 
                                     !address || 
                                     (gameCompleted && !canSubmitInCompleted) || 
                                     (gameData?.status !== GameStatus.IN_PROGRESS && !canSubmitInCompleted) ||
                                     (player && (player.played || player.state === PlayerState.SUBMITTED)))
            
            return shouldShowButton ? (
              <div className="w-full flex justify-center">
                <div className="flex flex-col items-center">
                  <button
                    onClick={handleSubmit}
                    className="btn-primary flex items-center justify-center gap-2 px-8 py-4 text-lg font-bold"
                    disabled={isButtonDisabled}
                  >
                    <FaCheckCircle size={20} />
                    {isSubmitting ? 'Submitting...' : 'Submit Game'}
                  </button>
                  {!address && (
                    <p className="text-warning-400 text-sm text-center mt-2">
                      ⚠️ Please connect your wallet
                    </p>
                  )}
                  {canSubmitInCompleted && (
                    <p className="text-info-400 text-sm text-center mt-2">
                      ⚠️ Game completed, but you haven&apos;t submitted yet. Submit to finalize your score.
                    </p>
                  )}
                </div>
              </div>
            ) : null
          })()}
          
          {/* Winner Announcement - Show immediately after game completion */}
          {gameCompleted && gameData?.status === GameStatus.COMPLETED && gameData?.winner && (
            <div className="card bg-gradient-to-br from-yellow-500/20 via-success-500/20 to-yellow-600/10 border-2 border-yellow-500/30 w-full shadow-lg shadow-yellow-500/20">
              <div className="text-center py-6">
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-3xl font-extrabold bg-gradient-to-r from-yellow-400 via-yellow-300 to-success-400 bg-clip-text text-transparent mb-4">
                  Winner Announced!
                </h2>
                <p className="text-gray-300 text-lg mb-2">Redirecting to results page...</p>
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mt-4"></div>
              </div>
            </div>
          )}
          
          {/* It's your turn notification - Multi-player games */}
          {!gameCompleted && 
           gameData?.gameType === GameType.PLAYER_VS_PLAYER && 
           player && 
           !player.played && 
           otherPlayerCompleted &&
           gameData?.status === GameStatus.IN_PROGRESS && (
            <div className="card bg-gradient-to-br from-warning-500/20 via-warning-600/10 to-success-500/20 border-2 border-warning-500/30 w-full shadow-lg shadow-warning-500/20 animate-pulse mb-4">
              <div className="text-center py-6">
                <div className="text-5xl mb-4">🎯</div>
                <p className="text-warning-300 text-xl mb-2 font-bold">It&apos;s Your Turn!</p>
                <p className="text-gray-300 text-sm mb-4">
                  {lastCompletedPlayer ? (
                    <>
                      Another player has completed their game. 
                      <br />
                      It&apos;s your turn to play and submit your score!
                    </>
                  ) : (
                    'Another player has completed. Your turn to play!'
                  )}
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-300 mt-4">
                  <span>Players completed:</span>
                  <span className="font-bold text-warning-400">
                    {scoresData.filter(s => s.played).length}/{gameData.maxPlayers}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Waiting for other players - Multi-player games */}
          {gameCompleted && 
           gameData?.gameType === GameType.PLAYER_VS_PLAYER && 
           player?.played && 
           gameData?.status !== GameStatus.COMPLETED && (
            <div className="card bg-gradient-to-br from-primary-500/20 via-primary-600/10 to-secondary-500/20 border-2 border-primary-500/30 w-full shadow-lg shadow-primary-500/20">
              <div className="text-center py-6">
                <div className="text-5xl mb-4">⏳</div>
                <p className="text-primary-300 text-lg mb-2 font-bold">Waiting for other players...</p>
                <p className="text-gray-400 text-sm mb-4">
                  You&apos;ve completed the game. Waiting for all players to finish.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-300">
                  <span>Players completed:</span>
                  <span className="font-bold text-primary-400">
                    {scoresData.filter(s => s.played).length}/{gameData.maxPlayers}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Countdown timer - fallback if winner not yet determined */}
          {gameCompleted && gameData?.gameType === GameType.AI_VS_PLAYER && countdown !== null && gameData?.status !== GameStatus.COMPLETED && (
            <div className="card bg-gradient-to-br from-primary-500/20 via-primary-600/10 to-secondary-500/20 border-2 border-primary-500/30 w-full shadow-lg shadow-primary-500/20">
              <div className="text-center py-6">
                <p className="text-primary-300 text-base mb-4 font-bold">🏆 Winner will be announced in:</p>
                <div className="text-6xl font-extrabold bg-gradient-to-r from-primary-400 via-primary-300 to-secondary-400 bg-clip-text text-transparent font-jetbrains-mono mb-4">
                  {countdown}s
                </div>
                {winnerAnnounced && (
                  <p className="text-success-400 text-base mt-4 font-bold">✅ Winner announced! Redirecting...</p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* VRF Verification Section - Show when VRF is fulfilled */}
        {gameData?.vrfFulfilled && gameData?.cardOrder && gameData.cardOrder.length > 0 && (
          <div className="w-full max-w-4xl mt-8">
            <VRFVerification game={gameData} />
          </div>
        )}
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div
          className="fixed top-0 left-0 w-screen h-screen flex items-center justify-center
          bg-black/60 backdrop-blur-sm transform z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPasswordModal(false)
              setJoinPassword('')
            }
          }}
        >
          <div 
            className="card w-11/12 md:w-2/5 border-2 border-primary-500/20 shadow-2xl relative"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <div className="flex flex-col">
              <div className="flex flex-row justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-extrabold text-primary-500 mb-1">Enter Game Password</h2>
                  <p className="text-gray-400 text-sm">This game is password-protected</p>
                </div>
                <button
                  onClick={() => {
                    setShowPasswordModal(false)
                    setJoinPassword('')
                  }}
                  className="p-3 hover:bg-dark-800 rounded-xl transition-all text-gray-400 hover:text-gray-200 hover:scale-110"
                  disabled={isSubmitting}
                >
                  <FaTimes size={20} />
                </button>
              </div>

              <div className="w-full mb-6">
                <label className="text-sm font-bold text-gray-200 mb-3 block flex items-center gap-2">
                  <span className="text-primary-400">🔒</span>
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Enter game password"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isSubmitting && joinPassword.trim()) {
                      handleJoinWithPassword()
                    }
                  }}
                  className="input text-lg font-medium"
                  disabled={isSubmitting}
                  autoFocus
                  autoComplete="off"
                />
              </div>

              <div className="w-full pt-4 border-t border-dark-700/50 flex gap-3">
                <button
                  onClick={() => {
                    setShowPasswordModal(false)
                    setJoinPassword('')
                  }}
                  className="btn-outline flex-1 font-bold"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoinWithPassword}
                  className="btn-primary flex-1 font-bold"
                  disabled={isSubmitting || !joinPassword.trim()}
                >
                  {isSubmitting ? 'Joining...' : `Join & Pay Stake (${gameData?.stake || 0} ETH)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Page

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { id } = context.query
  
  // Extract game ID from slug (format: "slug-id" or just "id")
  let gameId: number
  if (typeof id === 'string') {
    // Try to extract ID from slug (e.g., "deneme-1" -> 1)
    const parts = id.split('-')
    const lastPart = parts[parts.length - 1]
    const extractedId = parseInt(lastPart, 10)
    
    if (!isNaN(extractedId) && extractedId > 0) {
      gameId = extractedId
    } else {
      // If no ID found, try to parse the whole slug as ID
      const wholeId = parseInt(id, 10)
      if (!isNaN(wholeId) && wholeId > 0) {
        gameId = wholeId
      } else {
        return {
          notFound: true,
        }
      }
    }
  } else {
    gameId = Number(id) || 0
  }
  
  if (!gameId || gameId <= 0) {
    return {
      notFound: true,
    }
  }
  
  // Server-side props: Don't fetch game data on server to avoid RPC issues
  // Let client-side handle it with correct chainId and wallet connection
  // This avoids RPC connection issues, chainId mismatches, and ABI loading problems on server
  try {
    // Only try to fetch if we can (graceful degradation)
    const gameData: GameStruct = await getGame(gameId, BASE_MAINNET_CHAIN_ID)
    const scoresData: ScoreStruct[] = await getScores(gameId, BASE_MAINNET_CHAIN_ID)
    
    return {
      props: {
        gameData: JSON.parse(JSON.stringify(gameData)),
        scoresData: JSON.parse(JSON.stringify(scoresData)),
      },
    }
  } catch (error) {
    // If server-side fetch fails, return empty props and let client-side handle it
    // This prevents 404 errors when server can't connect to blockchain
    console.warn('Server-side game fetch failed, client will fetch:', error)
    return {
      props: {
        gameData: null,
        scoresData: [],
      },
    }
  }
}

