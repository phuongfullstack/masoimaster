'use client'

import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useGameStore } from '@/store/game-store'
import type { ChatMsg } from '@/lib/types'

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const store = useGameStore

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return

    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      const { userId, username } = store.getState()
      if (userId && username) {
        socket.emit('auth', { userId, username })
        // Reconnect to room
        const roomCode = localStorage.getItem('ma-soi-room-code')
        if (roomCode) {
          socket.emit('join-room', { code: roomCode, userId, username })
        }
      }
    })

    socket.on('auth-ok', () => {
      const { screen } = store.getState()
      if (screen === 'login') store.getState().setScreen('home')
    })

    socket.on('room-joined', (data: { room: any }) => {
      const room = data.room as any
      localStorage.setItem('ma-soi-room-code', room.code)
      store.getState().setRoom(room)
      store.getState().setScreen('room')
      store.getState().clearMessages()
    })

    socket.on('room-state', (room: any) => {
      store.getState().setRoom(room)
      if (room.timerEnd) store.getState().setTimerEnd(room.timerEnd)
    })

    socket.on('phase-announce', (data: { phase: string; label: string }) => {
      store.getState().setPhaseInfo(data.phase as any, data.label)
    })

    socket.on('night-wake', (data: { actionType: string; label: string; duration: number; bittenPlayer?: string }) => {
      store.getState().setNightWake(data.actionType, data.label, data.duration)
      if (data.bittenPlayer) store.getState().setBittenPlayer(data.bittenPlayer)
    })

    socket.on('seer-result', (data: { targetName: string; isWolf: boolean }) => {
      store.getState().setSeerResult(data)
    })

    socket.on('day-announce', (data: { dayCount: number; deaths: string[]; saved: boolean }) => {
      store.getState().setDayResult(data.deaths, data.saved)
      store.getState().setNightWake(null, '', 0)
      store.getState().setSeerResult(null)
      store.getState().setBittenPlayer(null)
    })

    socket.on('vote-result', (data: { eliminated: string | null; voteCounts: Record<string, number>; isTie: boolean }) => {
      store.getState().setVoteResult(data)
    })

    socket.on('game-over', (data: { winner: 'werewolf' | 'villager'; players: any[] }) => {
      store.getState().setGameOver(data.winner, data.players)
      localStorage.removeItem('ma-soi-room-code')
    })

    socket.on('hunter-trigger', () => {
      store.getState().setHunterTriggered(true)
    })

    socket.on('hunter-shot', () => {
      store.getState().setHunterTriggered(false)
    })

    socket.on('chat-message', (msg: ChatMsg) => {
      store.getState().addMessage(msg)
    })

    socket.on('system-message', (msg: any) => {
      store.getState().addMessage({ ...msg, id: Math.random().toString(36), senderId: 'system', senderName: 'Hệ thống', createdAt: new Date().toISOString() })
    })

    socket.on('host-changed', (data: { newHost: string }) => {
      store.getState().addMessage({ id: Math.random().toString(36), senderId: 'system', senderName: 'Hệ thống', content: `${data.newHost} trở thành Host mới`, msgType: 'system', phase: '', createdAt: new Date().toISOString() })
    })

    socket.on('player-reconnected', (data: { username: string }) => {
      store.getState().addMessage({ id: Math.random().toString(36), senderId: 'system', senderName: 'Hệ thống', content: `${data.username} đã kết nối lại`, msgType: 'system', phase: '', createdAt: new Date().toISOString() })
    })

    socket.on('error', (data: { message: string }) => {
      store.getState().setError(data.message)
      setTimeout(() => store.getState().setError(null), 3000)
    })

    socket.on('kicked', () => {
      localStorage.removeItem('ma-soi-room-code')
      store.getState().setRoom(null)
      store.getState().setScreen('home')
    })

    socket.on('disconnect', () => {
 console.log('Socket disconnected')
    })
  }, [store])

  useEffect(() => {
    connect()
    return () => { socketRef.current?.disconnect() }
  }, [connect])

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    }
  }, [])

  return { emit, socket: socketRef }
}
