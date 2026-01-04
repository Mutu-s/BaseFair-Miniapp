import { toast } from 'react-toastify'
import React from 'react'

export const showTransactionToast = (
  hash: string | undefined,
  type: 'pending' | 'success' | 'error',
  message?: string
) => {
  const config = {
    pending: {
      defaultMessage: 'Transaction bekleniyor...',
      icon: '⏳',
      toastType: 'info' as const,
      autoClose: false as const,
    },
    success: {
      defaultMessage: 'Transaction başarılı!',
      icon: '✅',
      toastType: 'success' as const,
      autoClose: 5000,
    },
    error: {
      defaultMessage: 'Transaction başarısız!',
      icon: '❌',
      toastType: 'error' as const,
      autoClose: 3000,
    },
  }

  const { defaultMessage, icon, toastType, autoClose } = config[type]
  const displayMessage = message || defaultMessage

  const toastContent = (
    <div className="flex items-center">
      <span className="mr-2 text-lg">{icon}</span>
      <div className="flex-1">
        <p className="font-semibold">{displayMessage}</p>
        {hash && type === 'success' && (
          <a
            href={`https://monad.blockscout.com/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline text-sm mt-1 block"
            onClick={(e) => e.stopPropagation()}
          >
            Block Explorer'da Görüntüle
          </a>
        )}
      </div>
    </div>
  )

  return toast(toastContent, {
    type: toastType,
    autoClose: autoClose,
    closeOnClick: true,
    pauseOnHover: true,
  })
}

export const showSuccessToast = (message: string) => {
  toast.success(`✅ ${message}`, {
    autoClose: 3000,
  })
}

export const showErrorToast = (message: string) => {
  toast.error(`❌ ${message}`, {
    autoClose: 4000,
  })
}

export const showInfoToast = (message: string) => {
  toast.info(`ℹ️ ${message}`, {
    autoClose: 3000,
  })
}

export const showWarningToast = (message: string) => {
  toast.warning(`⚠️ ${message}`, {
    autoClose: 3000,
  })
}
