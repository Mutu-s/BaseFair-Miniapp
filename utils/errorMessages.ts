/**
 * User-friendly error message translations
 */
export const getErrorMessage = (error: any): string => {
  const message = error?.message || error?.reason || error?.toString() || 'Unknown error'
  const errorString = message.toLowerCase()

  const errorMap: Record<string, string> = {
    'insufficient funds': 'Insufficient balance. Please add more ETH tokens.',
    'insufficient house balance': 'House balance is insufficient for this stake amount. Please try a smaller stake or wait for the house to be funded.',
    'user rejected': 'Transaction cancelled by user.',
    'user denied': 'Transaction denied by user.',
    'execution reverted': 'Transaction failed. Please try again.',
    'nonce too low': 'Nonce error. Please refresh the page.',
    'network error': 'Network error. Please check your connection.',
    'transaction underpriced': 'Gas price too low. Please try again.',
    'replacement transaction underpriced': 'New transaction gas price too low.',
    'already known': 'This transaction is already being processed.',
    'game not found': 'Game not found.',
    'game not available': 'Game is not available.',
    'game is full': 'Game is full.',
    'already joined': 'You have already joined this game.',
    'not a player': 'You are not a player in this game.',
    'game not in progress': 'Game is not in progress. Game has not started or has been completed.',
    'vrf not fulfilled': 'VRF has not been fulfilled yet. Please wait a few seconds and try again.',
    'vrf not fulfilled yet': 'VRF has not been fulfilled yet. Please wait a few seconds and try again.',
    'already completed': 'You have already completed this game.',
    'bet must be at least 1 mon': 'Minimum stake is 0.000003 ETH (~$0.01).',
    'bet must be at least 0.01': 'Minimum stake is 0.000003 ETH (~$0.01).',
    'bet must be at least 0.000003': 'Minimum stake is 0.000003 ETH (~$0.01).',
    'players must be between 2 and 4': 'Number of players must be between 2 and 4.',
    'ai games must have exactly 2 players': 'AI games must have exactly 2 players.',
    'incorrect password': 'Incorrect password. Please check and try again.',
    'password': 'Password is required for this game.',
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(errorMap)) {
    if (errorString.includes(key)) {
      return value
    }
  }

  // Check for specific error codes
  if (error?.code === 4001) {
    return 'Transaction rejected by user.'
  }

  if (error?.code === -32603) {
    return 'Internal JSON-RPC error. Please try again.'
  }

  // Return original message if no match found
  return `Error: ${message}`
}

export const showTransactionToast = (
  hash: string | undefined,
  type: 'pending' | 'success' | 'error',
  message?: string
) => {
  const config = {
    pending: {
      defaultMessage: 'Transaction pending...',
      icon: '⏳',
    },
    success: {
      defaultMessage: 'Transaction successful!',
      icon: '✅',
    },
    error: {
      defaultMessage: 'Transaction failed!',
      icon: '❌',
    },
  }

  const { defaultMessage, icon } = config[type]
  const displayMessage = message || defaultMessage

  return {
    message: displayMessage,
    icon,
    hash,
    type,
  }
}
