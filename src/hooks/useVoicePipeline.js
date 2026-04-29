/**
 * Flow 2 — Full Voice Pipeline
 *
 * Connects to LiveKit room, manages audio tracks, and drives the
 * AgentSession state machine by listening to agent data messages.
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { Room, RoomEvent, Track, createLocalAudioTrack } from 'livekit-client'

export const SESSION_STATES = {
  IDLE: 'IDLE',
  CONNECTING: 'CONNECTING',
  AGENT_READY: 'AGENT_READY',
  AGENT_SPEAKING: 'AGENT_SPEAKING',
  USER_TURN: 'USER_TURN',
  USER_SPEAKING: 'USER_SPEAKING',
  PROCESSING: 'PROCESSING',
  VERDICT: 'VERDICT',
  ERROR: 'ERROR',
}

export function useVoicePipeline({ accusation, phase, round, messages, onProsecutorMessage, onVerdictReceived }) {
  const [sessionState, setSessionState] = useState(SESSION_STATES.IDLE)
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false)
  const [isUserSpeaking, setIsUserSpeaking] = useState(false)
  const [agentVolume, setAgentVolume] = useState(0)
  const [error, setError] = useState(null)

  const roomRef = useRef(null)
  const audioTrackRef = useRef(null)

  // Sync trial state to agent whenever it changes
  useEffect(() => {
    const room = roomRef.current
    if (!room?.localParticipant || sessionState === SESSION_STATES.IDLE) return

    const stateMsg = JSON.stringify({
      type: 'trial_state',
      phase,
      round,
      accusation,
      messages: messages.map(m => ({ role: m.role, content: m.content, id: m.id })),
    })
    room.localParticipant.publishData(
      new TextEncoder().encode(stateMsg),
      { reliable: true }
    ).catch(() => {})
  }, [phase, round, accusation, messages])

  const startSession = useCallback(async () => {
    setSessionState(SESSION_STATES.CONNECTING)
    setError(null)

    try {
      // Fetch token
      const tokenRes = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: `trial-voice-${Date.now()}`,
          participantName: `user-${Date.now()}`,
          canPublish: true,
        }),
      })
      if (!tokenRes.ok) throw new Error('Token fetch failed')
      const { token, url } = await tokenRes.json()

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      })
      roomRef.current = room

      // Data message handler
      room.on(RoomEvent.DataReceived, (payload, participant) => {
        if (!participant) return
        let msg
        try { msg = JSON.parse(new TextDecoder().decode(payload)) } catch { return }

        if (msg.type === 'agent_ready') {
          setSessionState(SESSION_STATES.AGENT_READY)
          // Kick off the trial by sending initial state
          const init = JSON.stringify({
            type: 'trial_state',
            phase: 'OPENING',
            round: 0,
            accusation,
            messages: [],
          })
          room.localParticipant.publishData(new TextEncoder().encode(init), { reliable: true })
        }

        if (msg.type === 'prosecutor_response') {
          setSessionState(SESSION_STATES.AGENT_SPEAKING)
          if (onProsecutorMessage) onProsecutorMessage(msg.text, msg.phase, msg.round)
        }

        if (msg.type === 'defense_transcribed') {
          setSessionState(SESSION_STATES.PROCESSING)
        }

        if (msg.type === 'verdict') {
          setSessionState(SESSION_STATES.VERDICT)
          if (onVerdictReceived) onVerdictReceived(msg.verdict)
        }
      })

      // Track agent speaking via active speaker events
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const agentSpeaking = speakers.some(s => s.identity?.startsWith('agent'))
        const userSpeaking = speakers.some(s => !s.identity?.startsWith('agent'))
        setIsAgentSpeaking(agentSpeaking)
        setIsUserSpeaking(userSpeaking)
        if (agentSpeaking) setSessionState(SESSION_STATES.AGENT_SPEAKING)
        else if (userSpeaking) setSessionState(SESSION_STATES.USER_SPEAKING)
        else if (speakers.length === 0) setSessionState(SESSION_STATES.USER_TURN)
      })

      room.on(RoomEvent.Disconnected, () => {
        setSessionState(SESSION_STATES.IDLE)
        audioTrackRef.current = null
      })

      await room.connect(url || import.meta.env.VITE_LIVEKIT_URL, token)

      // Publish microphone
      const audioTrack = await createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true })
      audioTrackRef.current = audioTrack
      await room.localParticipant.publishTrack(audioTrack)

    } catch (err) {
      setError(err.message)
      setSessionState(SESSION_STATES.ERROR)
    }
  }, [accusation])

  const endSession = useCallback(async () => {
    if (audioTrackRef.current) {
      audioTrackRef.current.stop()
      audioTrackRef.current = null
    }
    if (roomRef.current) {
      await roomRef.current.disconnect()
      roomRef.current = null
    }
    setSessionState(SESSION_STATES.IDLE)
    setIsAgentSpeaking(false)
    setIsUserSpeaking(false)
  }, [])

  useEffect(() => {
    return () => { endSession() }
  }, [])

  return {
    sessionState,
    isAgentSpeaking,
    isUserSpeaking,
    agentVolume,
    error,
    startSession,
    endSession,
    room: roomRef.current,
  }
}
