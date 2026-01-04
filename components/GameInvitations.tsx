import { globalActions } from '@/store/globalSlices'
import { InvitationStruct, RootState, GameStruct } from '@/utils/type.dt'
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useAccount } from 'wagmi'
import { respondToInvite } from '@/services/blockchain'
import { toast } from 'react-toastify'
import { getErrorMessage } from '@/utils/errorMessages'
import PlayerAvatar from './PlayerAvatar'
import LoadingButton from './LoadingButton'

interface ComponentProps {
  invitations: InvitationStruct[]
  game?: GameStruct
}

const GameInvitations: React.FC<ComponentProps> = ({ invitations }) => {
  const dispatch = useDispatch()
  const { address } = useAccount()
  const { game } = useSelector((states: RootState) => states.globalStates)

  const handleRespond = async (accept: boolean, invitation: InvitationStruct, index: number) => {
    if (!address) {
      toast.warning('Please connect your wallet')
      return
    }

    try {
      if (accept) {
        // In new contract, use joinGame instead
        toast.info('In the new contract structure, you can join games directly')
      } else {
        toast.info('You don\'t need to reject invitations, just don\'t join')
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <div className="lg:w-2/3 w-full mx-auto my-10 text-gray-300">
      <h2 className="text-2xl font-semibold mb-6">
        {game ? `Game #${game.id} Invitations` : 'Invitations'}
      </h2>

      {invitations.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>No invitations yet</p>
          <p className="text-sm mt-2">The new contract structure does not have an invitation system</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invitations.map((invitation, index) => (
            <div
              key={invitation.id}
              className="border border-blue-900 p-6 rounded-lg bg-[#010922]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <PlayerAvatar address={invitation.sender} size={40} showAddress />
                  <div>
                    <p className="text-sm text-gray-400">From</p>
                    <p className="font-semibold">Game #{invitation.gameId}</p>
                    <p className="text-sm text-blue-500">Stake: {invitation.stake} ETH</p>
                  </div>
                </div>

                {!invitation.responded && address === invitation.receiver && (
                  <div className="flex gap-2">
                    <LoadingButton
                      onClick={async () => {
                        await handleRespond(true, invitation, index)
                        return undefined
                      }}
                      className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm"
                    >
                      Accept
                    </LoadingButton>
                    <LoadingButton
                      onClick={async () => {
                        await handleRespond(false, invitation, index)
                        return undefined
                      }}
                      className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm"
                    >
                      Reject
                    </LoadingButton>
                  </div>
                )}

                {invitation.responded && (
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      invitation.accepted
                        ? 'bg-green-900 text-green-300'
                        : 'bg-red-900 text-red-300'
                    }`}
                  >
                    {invitation.accepted ? 'Accepted' : 'Rejected'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default GameInvitations
