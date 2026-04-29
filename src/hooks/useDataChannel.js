import { useEffect, useRef, useCallback } from 'react'

/**
 * Wraps LiveKit room data messaging.
 * The room is passed in (from the trial context or a parent component).
 */
export function useDataChannel(room) {
  const listenersRef = useRef(new Map()) // eventType → Set<callback>

  // Subscribe to incoming data messages
  useEffect(() => {
    if (!room) return

    function handleData(payload, participant) {
      if (!participant) return // ignore self
      let msg
      try {
        msg = JSON.parse(new TextDecoder().decode(payload))
      } catch {
        return
      }

      const handlers = listenersRef.current.get(msg.type)
      if (handlers) {
        handlers.forEach(fn => fn(msg))
      }
      // Also fire wildcard listeners
      const wildcards = listenersRef.current.get('*')
      if (wildcards) {
        wildcards.forEach(fn => fn(msg))
      }
    }

    room.on('dataReceived', handleData)
    return () => room.off('dataReceived', handleData)
  }, [room])

  const on = useCallback((type, callback) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set())
    }
    listenersRef.current.get(type).add(callback)
    return () => listenersRef.current.get(type)?.delete(callback)
  }, [])

  const send = useCallback(async (data) => {
    if (!room?.localParticipant) {
      console.warn('[useDataChannel] Room not connected, dropping message:', data.type)
      return false
    }
    try {
      const encoded = new TextEncoder().encode(JSON.stringify(data))
      await room.localParticipant.publishData(encoded, { reliable: true })
      return true
    } catch (err) {
      console.error('[useDataChannel] Send failed:', err.message)
      return false
    }
  }, [room])

  return { send, on }
}
