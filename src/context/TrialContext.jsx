import React, { createContext, useContext, useEffect, useRef } from 'react'
import { Room, RoomEvent } from 'livekit-client'
import { useTrial } from '../hooks/useTrial.js'

const TrialContext = createContext(null)

export function TrialProvider({ children }) {
  const trial = useTrial()
  const roomRef = useRef(null)

  // Connect to LiveKit for Flow 1 data channel routing
  // Failure is non-critical — app falls back to direct API calls
  useEffect(() => {
    const livekitUrl = import.meta.env.VITE_LIVEKIT_URL
    if (!livekitUrl) return

    let room
    async function connect() {
      try {
        const res = await fetch('/api/livekit-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: `trial-${Date.now()}`,
            participantName: `user-${Date.now()}`,
            canPublish: false, // text-only in Flow 1
          }),
        })
        if (!res.ok) return
        const { token, url } = await res.json()
        if (!token) return

        room = new Room()
        roomRef.current = room
        trial.setRoom(room)

        room.on(RoomEvent.Disconnected, () => {
          roomRef.current = null
          trial.setRoom(null)
        })

        await room.connect(url || livekitUrl, token)
        console.log('[TrialContext] LiveKit connected for Flow 1 data channel')
      } catch (err) {
        console.info('[TrialContext] LiveKit unavailable, using direct API:', err.message)
      }
    }

    connect()

    return () => {
      if (room) room.disconnect()
    }
  }, [])

  return (
    <TrialContext.Provider value={{ ...trial, room: roomRef.current }}>
      {children}
    </TrialContext.Provider>
  )
}

export function useTrialContext() {
  const ctx = useContext(TrialContext)
  if (!ctx) throw new Error('useTrialContext must be used within TrialProvider')
  return ctx
}
