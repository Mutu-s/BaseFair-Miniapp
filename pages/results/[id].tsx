import GameResult from '@/components/GameResult'
import VRFVerification from '@/components/VRFVerification'
import { getGame, getScores, createRematch } from '@/services/blockchain'
import { globalActions } from '@/store/globalSlices'
import { GameStruct, RootState, ScoreStruct, GameStatus } from '@/utils/type.dt'
import { GetServerSidePropsContext, NextPage } from 'next'
import Head from 'next/head'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Link from 'next/link'
import { FaArrowLeft, FaCheckCircle, FaRedo } from 'react-icons/fa'
import { useAccount, useChainId } from 'wagmi'
import { toast } from 'react-toastify'
import LoadingButton from '@/components/LoadingButton'
import { BASE_MAINNET_CHAIN_ID } from '@/utils/network'

interface PageProps {
  gameData: GameStruct | null
  scoresData: ScoreStruct[]
}

const Page: NextPage<PageProps> = ({ gameData: initialGameData, scoresData: initialScoresData }) => {
  const dispatch = useDispatch()
  const { setGame, setScores } = globalActions
  const { game, scores } = useSelector((states: RootState) => states.globalStates)
  const [gameData, setGameData] = useState<GameStruct | null>(initialGameData)
  const [scoresData, setScoresData] = useState<ScoreStruct[]>(initialScoresData || [])
  const { address } = useAccount()
  const chainId = useChainId()
  const [isCreatingRematch, setIsCreatingRematch] = useState(false)
  
  // If no initial game data from server, fetch it client-side
  useEffect(() => {
    const fetchGameData = async () => {
      if (!initialGameData && chainId && chainId === BASE_MAINNET_CHAIN_ID) {
        try {
          // Extract gameId from URL
          const pathParts = window.location.pathname.split('/')
          const slug = pathParts[pathParts.length - 1]
          const parts = slug.split('-')
          const gameId = parseInt(parts[parts.length - 1], 10)
          
          if (gameId && gameId > 0) {
            const game = await getGame(gameId, chainId)
            const scores = await getScores(gameId, chainId)
            setGameData(game)
            setScoresData(scores)
            dispatch(setGame(game))
            dispatch(setScores(scores))
          }
        } catch (error) {
          console.error('Error fetching game data:', error)
          // Try other network as fallback
          // Only Base Mainnet is supported - no fallback needed
          console.error('Game not found on Base Mainnet')
        }
      }
    }
    
    fetchGameData()
  }, [initialGameData, chainId, dispatch, setGame, setScores])

  // Refresh game data periodically
  useEffect(() => {
    if (!gameData) return
    
    const refreshData = async () => {
      try {
        // Use chainId from wagmi (Base Mainnet only)
        const validChainId = chainId || BASE_MAINNET_CHAIN_ID
        const updatedGame = await getGame(gameData.id, validChainId)
        const updatedScores = await getScores(gameData.id, validChainId)
        setGameData(updatedGame)
        setScoresData(updatedScores)
        dispatch(setGame(updatedGame))
        dispatch(setScores(updatedScores))
      } catch (error) {
        console.error('Error refreshing game data:', error)
        // Only Base Mainnet is supported
        console.error('Error refreshing game data from Base Mainnet')
      }
    }

    // Refresh every 3 seconds if game is not completed or tied
    if (gameData?.status !== GameStatus.COMPLETED && gameData?.status !== GameStatus.TIED) {
      const interval = setInterval(refreshData, 3000)
      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameData?.id, gameData?.status, chainId, dispatch, setGame, setScores])

  useEffect(() => {
    dispatch(setGame(gameData))
    dispatch(setScores(scoresData))
  }, [dispatch, setGame, gameData, setScores, scoresData])

  return (
    <div>
      <Head>
        <title>BaseFair | Game Result{gameData ? ` #${gameData.id}` : ''}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="py-12 px-4">
        <div className="lg:w-2/3 w-full mx-auto">
          <Link 
            href="/games"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-primary-400 mb-6 transition-colors"
          >
            <FaArrowLeft size={16} />
            Back to Games
          </Link>
          
          {!gameData && (
            <div className="card">
              <div className="text-center py-8">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-gray-300">Loading game data...</p>
              </div>
            </div>
          )}
          
          {gameData && gameData.status === GameStatus.COMPLETED && (
            <div className="card bg-success-900/20 border-success-800 mb-6">
              <div className="flex items-center gap-3">
                <FaCheckCircle className="text-success-400" size={20} />
                <div className="flex-1">
                  <p className="text-success-400 font-semibold">Prize Distributed Automatically</p>
                  <p className="text-gray-400 text-sm">The winner has received their prize automatically when the game completed.</p>
                  {gameData.prizeTxHash && (
                    <a
                      href={`https://basescan.org/tx/${gameData.prizeTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-400 hover:text-primary-300 text-sm mt-2 inline-flex items-center gap-1 underline"
                    >
                      View Transaction →
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {gameData && gameData.status === GameStatus.TIED && (
            <div className="card bg-warning-900/20 border-warning-800 mb-6">
              <div className="flex items-start gap-3">
                <div className="text-warning-400 text-2xl">🤝</div>
                <div className="flex-1">
                  <p className="text-warning-400 font-semibold mb-2">Game Ended in a Tie</p>
                  <p className="text-gray-400 text-sm mb-4">
                    All players had the same flip count. All stakes have been refunded automatically.
                  </p>
                  {address && address.toLowerCase() === gameData.creator.toLowerCase() && (
                    <div className="mt-4">
                      <p className="text-gray-300 text-sm mb-3">Create a rematch game?</p>
                      <button
                        onClick={async () => {
                          if (!address) {
                            toast.warning('Please connect your wallet first!')
                            return
                          }
                          try {
                            setIsCreatingRematch(true)
                            const txHash = await createRematch(gameData.id, `${gameData.name} - Rematch`, gameData.stake)
                            toast.success('Rematch game created!', {
                              onClick: () => {
                                const explorerBase = 'https://basescan.org'
                                window.open(`${explorerBase}/tx/${txHash}`, '_blank')
                              },
                            })
                            // Refresh page after 2 seconds to show new game
                            setTimeout(() => {
                              window.location.reload()
                            }, 2000)
                          } catch (error: any) {
                            toast.error(error.message || 'Failed to create rematch')
                          } finally {
                            setIsCreatingRematch(false)
                          }
                        }}
                        disabled={isCreatingRematch}
                        className="btn-primary flex items-center gap-2"
                      >
                        <FaRedo size={16} />
                        {isCreatingRematch ? 'Creating Rematch...' : 'Create Rematch'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {gameData && <GameResult game={gameData} scores={scoresData} />}
          
          {/* VRF Verification Section */}
          {gameData && gameData.vrfFulfilled && (
            <div className="mt-8">
              <VRFVerification game={gameData} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Page

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { id, chainId: chainIdParam } = context.query
  const { BASE_MAINNET_CHAIN_ID } = await import('@/utils/network')
  
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
  
  // Determine chainId: from query param, or try both networks
  let chainId: number | undefined
  if (chainIdParam) {
    chainId = Number(chainIdParam)
  }
  
  // Fetch game data from Base Mainnet only
  let gameData: GameStruct | null = null
  let scoresData: ScoreStruct[] | null = null
  
  try {
    console.log(`[getServerSideProps] Fetching game ${gameId} on Base Mainnet (chainId: ${BASE_MAINNET_CHAIN_ID})`)
    gameData = await getGame(gameId, BASE_MAINNET_CHAIN_ID)
    scoresData = await getScores(gameId, BASE_MAINNET_CHAIN_ID)
    
    // Validate that we got valid data
    if (gameData && gameData.id === gameId && gameData.id > 0) {
      console.log(`[getServerSideProps] Successfully fetched game ${gameId} on Base Mainnet`)
    } else {
      console.warn(`[getServerSideProps] Invalid game data received for gameId ${gameId}`)
      gameData = null
      scoresData = null
    }
  } catch (error: any) {
    console.warn(`[getServerSideProps] Failed to fetch game ${gameId} from Base Mainnet:`, error?.message || error)
    // Return empty props and let client-side handle it
    // This prevents 404 errors when server can't connect to blockchain
    return {
      props: {
        gameData: null,
        scoresData: [],
      },
    }
  }
  
  // If no valid data, return empty props
  if (!gameData || !scoresData) {
    console.warn('[getServerSideProps] No valid game data, client will fetch')
    return {
      props: {
        gameData: null,
        scoresData: [],
      },
    }
  }

  return {
    props: {
      gameData: JSON.parse(JSON.stringify(gameData)),
      scoresData: JSON.parse(JSON.stringify(scoresData)),
    },
  }
}
