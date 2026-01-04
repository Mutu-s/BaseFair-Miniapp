import React, { useState } from 'react'
import { useWaitForTransaction } from 'wagmi'
import { FaSpinner } from 'react-icons/fa'

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick: () => Promise<string | undefined>
  loadingText?: string
  successText?: string
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  onClick,
  children,
  loadingText = 'Loading...',
  successText,
  className = '',
  disabled,
  ...props
}) => {
  const [hash, setHash] = useState<string | undefined>()
  const { isLoading, isSuccess } = useWaitForTransaction({
    hash: hash as `0x${string}` | undefined,
  })

  const handleClick = async () => {
    try {
      const txHash = await onClick()
      if (txHash) {
        setHash(txHash)
      }
    } catch (error) {
      console.error('Transaction error:', error)
    }
  }

  const isDisabled = disabled || isLoading

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`relative ${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      {...props}
    >
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <FaSpinner className="animate-spin" size={16} />
        </span>
      )}
      <span className={isLoading ? 'opacity-0' : ''}>
        {isSuccess && successText ? successText : children}
      </span>
    </button>
  )
}

export default LoadingButton
