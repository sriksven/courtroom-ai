import { useState, useRef, useCallback, useEffect } from 'react'
import { Room, RoomEvent } from 'livekit-client'

export const VOICE_STATES = {
  IDLE: 'IDLE',
  INITIALIZING: 'INITIALIZING',
  LISTENING: 'LISTENING',
  PROCESSING: 'PROCESSING',
  SPEAKING: 'SPEAKING',
  ERROR: 'ERROR',
}

export function useVoice({ onTranscript, enabled = true }) {
  const [voiceState, setVoiceState] = useState(VOICE_STATES.IDLE)
  const [transcript, setTranscript] = useState('')
  const [errorMessage, setErrorMessage] = useState(null)
  const [roomConnected, setRoomConnected] = useState(false)

  const recognitionRef = useRef(null)
  const audioRef = useRef(null)
  const roomRef = useRef(null)
  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL

  const isAvailable = enabled && typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const shouldListenRef = useRef(false)
  const finalTranscriptRef = useRef('')

  const startListening = useCallback(() => {
    if (!isAvailable) {
      setErrorMessage('Voice input not supported in this browser.')
      setVoiceState(VOICE_STATES.ERROR)
      return
    }

    shouldListenRef.current = true
    finalTranscriptRef.current = ''
    setVoiceState(VOICE_STATES.INITIALIZING)

    function createAndStart() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscriptRef.current += t
          } else {
            interim += t
          }
        }
        const live = finalTranscriptRef.current + interim
        setTranscript(live)
        setVoiceState(VOICE_STATES.LISTENING)
        if (onTranscript) onTranscript(live)
      }

      // Chrome stops continuous recognition after ~60s of silence — auto-restart
      recognition.onend = () => {
        if (shouldListenRef.current) {
          try { createAndStart() } catch { setVoiceState(VOICE_STATES.IDLE) }
        } else {
          setVoiceState(VOICE_STATES.IDLE)
        }
      }

      recognition.onerror = (event) => {
        if (event.error === 'no-speech' && shouldListenRef.current) return
        if (event.error === 'aborted') return
        setErrorMessage(event.error)
        setVoiceState(VOICE_STATES.ERROR)
        shouldListenRef.current = false
      }

      recognition.start()
      setVoiceState(VOICE_STATES.LISTENING)
      recognitionRef.current = recognition
    }

    createAndStart()
  }, [isAvailable, onTranscript])

  const stopListening = useCallback(() => {
    shouldListenRef.current = false
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setVoiceState(VOICE_STATES.IDLE)
  }, [])

  const speakText = useCallback(async (text) => {
    setVoiceState(VOICE_STATES.SPEAKING)
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'onyx' }),
      })

      if (!response.ok) {
        setVoiceState(VOICE_STATES.IDLE)
        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      if (!audioRef.current) {
        audioRef.current = new Audio()
      }
      const audio = audioRef.current
      audio.src = url

      audio.onended = () => {
        setVoiceState(VOICE_STATES.IDLE)
        URL.revokeObjectURL(url)
      }

      audio.onerror = () => {
        setVoiceState(VOICE_STATES.IDLE)
      }

      await audio.play()
    } catch {
      setVoiceState(VOICE_STATES.IDLE)
    }
  }, [])

  const toggleListening = useCallback(() => {
    if (voiceState === VOICE_STATES.LISTENING) {
      stopListening()
    } else {
      startListening()
    }
  }, [voiceState, startListening, stopListening])

  const cleanup = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.stop()
    if (roomRef.current) roomRef.current.disconnect()
  }, [])

  useEffect(() => {
    if (!livekitUrl || !enabled) return

    const connectRoom = async () => {
      try {
        const res = await fetch('/api/livekit-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomName: 'courtroom-main', participantName: `spectator-${Date.now()}` }),
        })
        if (!res.ok) return
        const { token, url } = await res.json()
        if (!token) return

        const room = new Room()
        roomRef.current = room
        room.on(RoomEvent.Connected, () => setRoomConnected(true))
        room.on(RoomEvent.Disconnected, () => setRoomConnected(false))
        await room.connect(url || livekitUrl, token)
      } catch {
        // LiveKit connection failure is non-critical — app works without it
      }
    }

    connectRoom()

    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect()
      }
    }
  }, [livekitUrl, enabled])

  return {
    voiceState,
    transcript,
    errorMessage,
    roomConnected,
    isListening: voiceState === VOICE_STATES.LISTENING,
    isSpeaking: voiceState === VOICE_STATES.SPEAKING,
    isAvailable,
    startListening,
    stopListening,
    speakText,
    toggleListening,
    cleanup,
  }
}
