import { create } from 'zustand'
import type { RoomState, PlayerInfo, ChatMsg, RoleConfig, Phase } from '@/lib/types'

type Screen = 'login' | 'home' | 'room'

interface GameState {
  // Auth
  userId: string
  username: string
  screen: Screen

  // Room
  room: RoomState | null
  roomCode: string

  // Chat
  messages: ChatMsg[]

  // Phase
  currentPhase: Phase
  phaseLabel: string
  timerEnd: number | null

  // Night
  nightWakeAction: string | null
  nightWakeLabel: string
  nightWakeDuration: number
  bittenPlayerId: string | null
  seerResult: { targetName: string; isWolf: boolean } | null

  // Day
  dayDeaths: string[]
  daySaved: boolean

  // Vote
  voteResult: { eliminated: string | null; voteCounts: Record<string, number>; isTie: boolean } | null

  // Game Over
  gameWinner: 'werewolf' | 'villager' | null
  gameOverPlayers: { username: string; role: string; isAlive: boolean }[] | null

  // Hunter
  hunterTriggered: boolean

  // Error
  error: string | null
}

interface GameActions {
  setAuth: (userId: string, username: string) => void
  setScreen: (screen: Screen) => void
  setRoom: (room: RoomState | null) => void
  addMessage: (msg: ChatMsg) => void
  clearMessages: () => void
  setPhaseInfo: (phase: Phase, label: string) => void
  setTimerEnd: (timerEnd: number | null) => void
  setNightWake: (action: string | null, label: string, duration: number) => void
  setBittenPlayer: (id: string | null) => void
  setSeerResult: (result: { targetName: string; isWolf: boolean } | null) => void
  setDayResult: (deaths: string[], saved: boolean) => void
  setVoteResult: (result: { eliminated: string | null; voteCounts: Record<string, number>; isTie: boolean } | null) => void
  setGameOver: (winner: 'werewolf' | 'villager', players: { username: string; role: string; isAlive: boolean }[]) => void
  setHunterTriggered: (v: boolean) => void
  setError: (error: string | null) => void
  resetGame: () => void
}

const initialState: GameState = {
  userId: '', username: '', screen: 'login',
  room: null, roomCode: '',
  messages: [], currentPhase: 'lobby', phaseLabel: '', timerEnd: null,
  nightWakeAction: null, nightWakeLabel: '', nightWakeDuration: 0, bittenPlayerId: null, seerResult: null,
  dayDeaths: [], daySaved: false,
  voteResult: null,
  gameWinner: null, gameOverPlayers: null,
  hunterTriggered: false, error: null,
}

export const useGameStore = create<GameState & GameActions>((set) => ({
  ...initialState,

  setAuth: (userId, username) => set({ userId, username, screen: 'home' }),
  setScreen: (screen) => set({ screen }),
  setRoom: (room) => set({ room, roomCode: room?.code || '' }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  clearMessages: () => set({ messages: [] }),
  setPhaseInfo: (phase, label) => set({ currentPhase: phase, phaseLabel: label }),
  setTimerEnd: (timerEnd) => set({ timerEnd }),
  setNightWake: (action, label, duration) => set({ nightWakeAction: action, nightWakeLabel: label, nightWakeDuration: duration }),
  setBittenPlayer: (id) => set({ bittenPlayerId: id }),
  setSeerResult: (result) => set({ seerResult: result }),
  setDayResult: (deaths, saved) => set({ dayDeaths: deaths, daySaved: saved }),
  setVoteResult: (result) => set({ voteResult: result }),
  setGameOver: (winner, players) => set({ gameWinner: winner, gameOverPlayers: players, currentPhase: 'game_over' }),
  setHunterTriggered: (v) => set({ hunterTriggered: v }),
  setError: (error) => set({ error }),
  resetGame: () => set({
    ...initialState, userId: '', username: '', screen: 'home',
  }),
}))
