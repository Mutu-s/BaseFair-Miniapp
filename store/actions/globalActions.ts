import { GameStruct, ScoreStruct, InvitationStruct } from '@/utils/type.dt'

export const globalActions = {
  setGames: (state: any, action: { payload: GameStruct[] }) => {
    state.games = action.payload
  },
  setGame: (state: any, action: { payload: GameStruct | null }) => {
    state.game = action.payload
  },
  setScores: (state: any, action: { payload: ScoreStruct[] }) => {
    state.scores = action.payload
  },
  setInvitations: (state: any, action: { payload: InvitationStruct[] }) => {
    state.invitations = action.payload
  },
  setCreateModal: (state: any, action: { payload: string }) => {
    state.createModal = action.payload
  },
  setResultModal: (state: any, action: { payload: string }) => {
    state.resultModal = action.payload
  },
  setInviteModal: (state: any, action: { payload: string }) => {
    state.inviteModal = action.payload
  },
  setLoading: (state: any, action: { payload: boolean }) => {
    state.loading = action.payload
  },
  setError: (state: any, action: { payload: string | null }) => {
    state.error = action.payload
  },
}
