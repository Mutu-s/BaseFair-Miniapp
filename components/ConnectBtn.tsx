import { ConnectButton } from '@rainbow-me/rainbowkit'
import Image from 'next/image'
import React from 'react'

const ConnectBtn: React.FC = () => {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading'
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === 'authenticated')

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    className="btn-primary text-sm px-6 py-2.5 font-bold"
                    onClick={openConnectModal}
                    type="button"
                  >
                    Connect Wallet
                  </button>
                )
              }

              if (chain.unsupported) {
                return (
                  <button
                    className="btn-outline text-sm px-6 py-2.5 font-bold border-error-500/50 text-error-400 hover:bg-error-500/20"
                    onClick={openChainModal}
                    type="button"
                  >
                    Wrong Network
                  </button>
                )
              }

              return (
                <button
                  className="btn-primary text-sm px-5 py-2.5 font-bold"
                  onClick={openAccountModal}
                  type="button"
                >
                  {account.displayName}
                </button>
              )
            })()}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}

export default ConnectBtn
