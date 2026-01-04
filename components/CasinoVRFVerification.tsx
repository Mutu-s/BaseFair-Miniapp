import React, { useState, useEffect } from 'react'
import { CasinoGameType, CasinoGameState } from '@/services/casino'
import { verifyCasinoVRFRandomness, generateCasinoVerificationProof, getCasinoVerificationReport, formatCasinoResult } from '@/utils/casinoVRFVerification'
import { FaCheckCircle, FaTimesCircle, FaCopy, FaDownload, FaShieldAlt, FaInfoCircle } from 'react-icons/fa'
import { useChainId } from 'wagmi'

interface CasinoVRFVerificationProps {
  gameType: CasinoGameType
  gameState: CasinoGameState
  className?: string
}

const CasinoVRFVerification: React.FC<CasinoVRFVerificationProps> = ({ gameType, gameState, className = '' }) => {
  const chainId = useChainId()
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean
    verificationData: any
    details: {
      resultValid: boolean
      seedValid: boolean
      blockDataValid: boolean
      timestampValid: boolean
    }
  } | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Auto-verify when component mounts
    if (gameState && gameState.settled) {
      handleVerify()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.gameId, gameState.settled])

  const handleVerify = async () => {
    setIsVerifying(true)
    try {
      const result = await verifyCasinoVRFRandomness(gameType, gameState)
      setVerificationResult(result)
    } catch (error) {
      console.error('Verification error:', error)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleCopyProof = async () => {
    if (!verificationResult) return
    
    const report = await getCasinoVerificationReport(gameType, gameState)
    try {
      await navigator.clipboard.writeText(report)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleDownloadReport = async () => {
    if (!verificationResult) return
    
    const report = await getCasinoVerificationReport(gameType, gameState)
    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vrf-verification-${gameType.toLowerCase()}-${gameState.gameId}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const gameTypeName = gameType.charAt(0) + gameType.slice(1).toLowerCase()

  if (!gameState.settled) {
    return (
      <div className={`card bg-warning-900/20 border-warning-800 ${className}`}>
        <div className="flex items-center gap-3">
          <FaInfoCircle className="text-warning-400" size={20} />
          <div>
            <p className="text-warning-400 font-semibold">Game Not Settled</p>
            <p className="text-gray-400 text-sm">This game has not been settled yet.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`card bg-gradient-to-br from-primary-900/20 via-dark-800/50 to-primary-900/20 border-2 border-primary-500/30 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-500/20 rounded-lg">
            <FaShieldAlt className="text-primary-400" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-100 mb-1">VRF Fairness Verification</h3>
            <p className="text-xs text-gray-400">{gameTypeName} Game #{gameState.gameId}</p>
          </div>
        </div>
        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className="btn-outline text-xs px-3 py-1.5 disabled:opacity-50"
        >
          {isVerifying ? 'Verifying...' : 'Verify'}
        </button>
      </div>

      {isVerifying && !verificationResult && (
        <div className="text-center py-6">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
          <p className="text-gray-400 mt-3 text-sm">Verifying randomness...</p>
        </div>
      )}

      {verificationResult && (
        <div className="space-y-4">
          {/* Verification Status */}
          <div className={`p-4 rounded-xl border-2 ${
            verificationResult.isValid
              ? 'bg-success-900/30 border-success-500/50'
              : 'bg-error-900/30 border-error-500/50'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              {verificationResult.isValid ? (
                <FaCheckCircle className="text-success-400" size={24} />
              ) : (
                <FaTimesCircle className="text-error-400" size={24} />
              )}
              <div className="flex-1">
                <h4 className={`font-bold text-lg ${
                  verificationResult.isValid ? 'text-success-400' : 'text-error-400'
                }`}>
                  {verificationResult.isValid ? 'Verification Passed' : 'Verification Failed'}
                </h4>
                <p className="text-gray-300 text-sm">
                  {verificationResult.isValid
                    ? 'The randomness used in this game is verifiable and fair.'
                    : 'There may be an issue with the randomness verification.'}
                </p>
              </div>
            </div>

            {/* Verification Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div className={`p-3 rounded-lg border ${
                verificationResult.details.resultValid
                  ? 'bg-success-900/20 border-success-500/30'
                  : 'bg-error-900/20 border-error-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {verificationResult.details.resultValid ? (
                    <FaCheckCircle className="text-success-400" size={14} />
                  ) : (
                    <FaTimesCircle className="text-error-400" size={14} />
                  )}
                  <span className="text-xs font-semibold text-gray-300">Result</span>
                </div>
                <p className="text-xs text-gray-400">
                  {formatCasinoResult(gameType, gameState.result)}
                </p>
              </div>

              <div className={`p-3 rounded-lg border ${
                verificationResult.details.seedValid
                  ? 'bg-success-900/20 border-success-500/30'
                  : 'bg-error-900/20 border-error-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {verificationResult.details.seedValid ? (
                    <FaCheckCircle className="text-success-400" size={14} />
                  ) : (
                    <FaTimesCircle className="text-error-400" size={14} />
                  )}
                  <span className="text-xs font-semibold text-gray-300">Seed</span>
                </div>
                <p className="text-xs text-gray-400">
                  {verificationResult.details.seedValid ? 'Valid seed' : 'Invalid seed'}
                </p>
              </div>

              <div className={`p-3 rounded-lg border ${
                verificationResult.details.blockDataValid
                  ? 'bg-success-900/20 border-success-500/30'
                  : 'bg-warning-900/20 border-warning-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {verificationResult.details.blockDataValid ? (
                    <FaCheckCircle className="text-success-400" size={14} />
                  ) : (
                    <FaInfoCircle className="text-warning-400" size={14} />
                  )}
                  <span className="text-xs font-semibold text-gray-300">Block Data</span>
                </div>
                <p className="text-xs text-gray-400">
                  {verificationResult.details.blockDataValid ? 'Block verified' : 'Block data unavailable'}
                </p>
              </div>

              <div className={`p-3 rounded-lg border ${
                verificationResult.details.timestampValid
                  ? 'bg-success-900/20 border-success-500/30'
                  : 'bg-error-900/20 border-error-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {verificationResult.details.timestampValid ? (
                    <FaCheckCircle className="text-success-400" size={14} />
                  ) : (
                    <FaTimesCircle className="text-error-400" size={14} />
                  )}
                  <span className="text-xs font-semibold text-gray-300">Timestamp</span>
                </div>
                <p className="text-xs text-gray-400">
                  {verificationResult.details.timestampValid ? 'Valid timestamp' : 'Invalid timestamp'}
                </p>
              </div>
            </div>
          </div>

          {/* Game Data */}
          <div className="bg-dark-900/60 rounded-xl p-4 border border-dark-700/50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-gray-200">Game Data</h4>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-primary-400 hover:text-primary-300"
              >
                {showDetails ? 'Hide' : 'Show'} Details
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 px-2 bg-dark-800/50 rounded border border-dark-700/50">
                <span className="text-gray-400">Game ID:</span>
                <span className="text-gray-200 font-mono">{gameState.gameId}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 px-2 bg-dark-800/50 rounded border border-dark-700/50">
                <span className="text-gray-400">Result:</span>
                <span className="text-gray-200 font-mono">{formatCasinoResult(gameType, gameState.result)}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 px-2 bg-dark-800/50 rounded border border-dark-700/50">
                <span className="text-gray-400">Bet Amount:</span>
                <span className="text-gray-200 font-mono">{parseFloat(gameState.betAmount).toFixed(4)} ETH</span>
              </div>

              <div className="flex items-center justify-between py-1.5 px-2 bg-dark-800/50 rounded border border-dark-700/50">
                <span className="text-gray-400">Payout:</span>
                <span className="text-gray-200 font-mono">{parseFloat(gameState.payout).toFixed(4)} ETH</span>
              </div>

              {showDetails && (
                <>
                  <div className="flex items-center justify-between py-1.5 px-2 bg-dark-800/50 rounded border border-dark-700/50">
                    <span className="text-gray-400">Player:</span>
                    <span className="text-gray-200 font-mono text-[10px] break-all">
                      {gameState.player.slice(0, 10)}...{gameState.player.slice(-8)}
                    </span>
                  </div>

                  {verificationResult.verificationData.blockNumber && (
                    <div className="flex items-center justify-between py-1.5 px-2 bg-dark-800/50 rounded border border-dark-700/50">
                      <span className="text-gray-400">Block Number:</span>
                      <span className="text-gray-200 font-mono">
                        {verificationResult.verificationData.blockNumber}
                      </span>
                    </div>
                  )}

                  {verificationResult.verificationData.blockHash && (
                    <div className="flex items-center justify-between py-1.5 px-2 bg-dark-800/50 rounded border border-dark-700/50">
                      <span className="text-gray-400">Block Hash:</span>
                      <span className="text-gray-200 font-mono text-[10px] break-all">
                        {verificationResult.verificationData.blockHash.slice(0, 20)}...
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-1.5 px-2 bg-dark-800/50 rounded border border-dark-700/50">
                    <span className="text-gray-400">Seed:</span>
                    <span className="text-gray-200 font-mono text-[10px] break-all">
                      {verificationResult.verificationData.seed.slice(0, 20)}...
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 px-2 bg-dark-800/50 rounded border border-dark-700/50">
                    <span className="text-gray-400">Verification Proof:</span>
                    <span className="text-gray-200 font-mono text-[10px] break-all">
                      {verificationResult.verificationData.verificationProof.slice(0, 20)}...
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleCopyProof}
              className="btn-outline flex-1 flex items-center justify-center gap-2 text-xs"
            >
              <FaCopy size={14} />
              {copied ? 'Copied!' : 'Copy Proof'}
            </button>
            <button
              onClick={handleDownloadReport}
              className="btn-outline flex-1 flex items-center justify-center gap-2 text-xs"
            >
              <FaDownload size={14} />
              Download Report
            </button>
          </div>

          {/* Info */}
          <div className="bg-primary-900/20 border border-primary-500/30 rounded-lg p-3">
            <p className="text-xs text-gray-300 leading-relaxed">
              <strong className="text-primary-400">How Verification Works:</strong> This verification checks that the game result was generated using verifiable randomness (block.prevrandao) and that all game data is valid. The verification proof can be independently verified by anyone using the on-chain data.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default CasinoVRFVerification






