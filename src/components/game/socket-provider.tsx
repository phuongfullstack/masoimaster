'use client'

import { useEffect, useRef, useCallback, createContext, useContext, useState, type ReactNode } from 'react'
import { io } from 'socket.io-client'
import { useGameStore } from '@/store/game-store'
import type { ChatMsg } from '@/lib/types'

interface SocketContextType {
  emit: (event: string, data?: any) => void
  connected: boolean
}

const SocketContext = createContext<SocketContextType>({ emit: () => {}, connected: false })

export function useSocket() {
  return useContext(SocketContext)
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<any>(null)
  const [connected, setConnected] = useState(false)
  const store = useGameStore
  const userId = useGameStore(s => s.userId)
  const username = useGameStore(s => s.username)

  useEffect(() => {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
    const isDev = hostname === 'localhost' || hostname === '127.0.0.1'
    const url = isDev ? 'http://localhost:3003' : '/socket.io/?XTransformPort=3003'

    const socket = io(url, {
      transports: ['polling', 'websocket'],
      forceNew: true, reconnection: true, reconnectionAttempts: 10,
      reconnectionDelay: 1000, timeout: 10000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      const s = store.getState()
      if (s.userId && s.username) {
        socket.emit('auth', { userId: s.userId, username: s.username })
        const rc = localStorage.getItem('ma-soi-room-code')
        if (rc) socket.emit('join-room', { code: rc, userId: s.userId, username: s.username })
      }
    })
    socket.on('disconnect', () => setConnected(false))
    socket.on('auth-ok', () => { if (store.getState().screen === 'login') store.getState().setScreen('home') })
    socket.on('room-joined', (d: any) => { localStorage.setItem('ma-soi-room-code', d.room.code); store.getState().setRoom(d.room); store.getState().setScreen('room'); store.getState().clearMessages() })
    socket.on('room-state', (r: any) => { store.getState().setRoom(r); if (r.timerEnd) store.getState().setTimerEnd(r.timerEnd) })
    socket.on('phase-announce', (d: any) => store.getState().setPhaseInfo(d.phase, d.label))
    socket.on('night-wake', (d: any) => { store.getState().setNightWake(d.actionType, d.label, d.duration); if (d.bittenPlayer) store.getState().setBittenPlayer(d.bittenPlayer) })
    socket.on('seer-result', (d: any) => store.getState().setSeerResult(d))
    socket.on('day-announce', (d: any) => { store.getState().setDayResult(d.deaths, d.saved); store.getState().setNightWake(null, '', 0); store.getState().setSeerResult(null) })
    socket.on('vote-result', (d: any) => store.getState().setVoteResult(d))
    socket.on('game-over', (d: any) => { store.getState().setGameOver(d.winner, d.players); localStorage.removeItem('ma-soi-room-code') })
    socket.on('hunter-trigger', () => store.getState().setHunterTriggered(true))
    socket.on('hunter-shot', () => store.getState().setHunterTriggered(false))
    socket.on('chat-message', (m: ChatMsg) => store.getState().addMessage(m))
    socket.on('system-message', (m: any) => store.getState().addMessage({ ...m, id: Math.random().toString(36), senderId: 'system', senderName: 'Hệ thống', createdAt: new Date().toISOString() }))
    socket.on('error', (d: any) => { store.getState().setError(d.message); setTimeout(() => store.getState().setError(null), 3000) })
    socket.on('kicked', () => { localStorage.removeItem('ma-soi-room-code'); store.getState().setRoom(null); store.getState().setScreen('home') })

    return () => { socket.disconnect() }
  }, [])

  useEffect(() => {
    if (userId && username && socketRef.current?.connected) socketRef.current.emit('auth', { userId, username })
  }, [userId, username])

  const emit = useCallback((event: string, data?: any) => { socketRef.current?.emit(event, data) }, [])

  return (
    <SocketContext.Provider value={{ emit, connected }}>
      {children}
    </SocketContext.Provider>
  )
}
