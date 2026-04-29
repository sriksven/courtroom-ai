import { useState, useRef, useCallback, useEffect } from 'react'
import { PHASES } from '../constants/phases.js'

export const VOICE_MODE_STATES = {
  IDLE: 'IDLE',
  SPEAKING: 'SPEAKING',       // TTS playing
  LISTENING: 'LISTENING',     // waiting for user speech
  PROCESSING: 'PROCESSING',   // submitting to API
  WAITING: 'WAITING',         // waiting for AI response
  DONE: 'DONE',               // trial ended
}

const ROLE_VOICES = {
  prosecutor: 'onyx',
  judge: 'shimmer',
}

// Fetch TTS and play — returns a Promise that resolves when audio ends
async function speakText(text, voice) {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  })
  if (!res.ok) throw new Error('TTS failed')
  const blob = await res.blob()
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.onended = () => { URL.revokeObjectURL(url); resolve() }
    audio.onerror = () => { URL.revokeObjectURL(url); resolve() } // don't block loop on error
    audio.play().catch(() => resolve())
  })
}

// Listen via Web Speech API — resolves with transcript string when speech ends
function listenOnce() {
  return new Promise((resolve) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { resolve(''); return }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    let captured = ''
    recognition.onresult = (e) => {
      captured = Array.from(e.results).map(r => r[0].transcript).join(' ')
    }
    recognition.onend = () => resolve(captured)
    recognition.onerror = () => resolve(captured)
    recognition.start()
  })
}

export function useVoiceMode({ messages, phase, submitDefense, enabled }) {
  const [state, setState] = useState(VOICE_MODE_STATES.IDLE)
  const [speakingRole, setSpeakingRole] = useState(null)
  const [liveTranscript, setLiveTranscript] = useState('')

  const abortRef = useRef(false)
  const loopRunningRef = useRef(false)
  const spokenIdsRef = useRef(new Set())
  const newMessageResolverRef = useRef(null)
  // Keep a live ref to messages so the loop always sees the latest array
  const messagesRef = useRef(messages)
  useEffect(() => { messagesRef.current = messages }, [messages])
  const phaseRef = useRef(phase)
  useEffect(() => { phaseRef.current = phase }, [phase])
  const submitRef = useRef(submitDefense)
  useEffect(() => { submitRef.current = submitDefense }, [submitDefense])

  // Whenever messages change, wake up the loop if it's waiting
  useEffect(() => {
    if (newMessageResolverRef.current) {
      newMessageResolverRef.current()
      newMessageResolverRef.current = null
    }
  }, [messages])

  // Wait until a new unspoken prosecutor/judge message appears
  function waitForNextMessage() {
    return new Promise((resolve) => {
      const check = () => messagesRef.current.find(
        m => (m.role === 'prosecutor' || m.role === 'judge') && !spokenIdsRef.current.has(m.id)
      ) ?? null

      const immediate = check()
      if (immediate) { resolve(immediate); return }

      newMessageResolverRef.current = () => resolve(check())
    })
  }

  const startLoop = useCallback(async () => {
    if (loopRunningRef.current) return
    loopRunningRef.current = true
    abortRef.current = false
    spokenIdsRef.current = new Set()

    try {
      // ── Infinite loop: runs until verdict or manual stop ──────────────────
      while (!abortRef.current) {
        setState(VOICE_MODE_STATES.WAITING)

        // 1. Wait for the next unspoken AI message
        const msg = await waitForNextMessage()
        if (!msg || abortRef.current) break

        spokenIdsRef.current.add(msg.id)

        // 2. Speak it
        setSpeakingRole(msg.role)
        setState(VOICE_MODE_STATES.SPEAKING)
        try {
          await speakText(msg.content, ROLE_VOICES[msg.role] ?? 'onyx')
        } catch {
          // TTS failure doesn't stop the loop
        }
        if (abortRef.current) break
        setSpeakingRole(null)

        // 3. If this was the judge's verdict — trial over
        if (phaseRef.current === PHASES.VERDICT || msg.role === 'judge') {
          setState(VOICE_MODE_STATES.DONE)
          break
        }

        // 4. Listen for defense response
        setState(VOICE_MODE_STATES.LISTENING)
        setLiveTranscript('')

        // Run STT with live interim updates via a separate recognition instance
        const transcript = await new Promise((resolve) => {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
          if (!SpeechRecognition) { resolve(''); return }
          const r = new SpeechRecognition()
          r.continuous = false
          r.interimResults = true
          r.lang = 'en-US'
          let final = ''
          r.onresult = (e) => {
            const interim = Array.from(e.results).map(r => r[0].transcript).join(' ')
            setLiveTranscript(interim)
            if (e.results[e.results.length - 1].isFinal) final = interim
          }
          r.onend = () => resolve(final)
          r.onerror = () => resolve(final)
          if (abortRef.current) { resolve(''); return }
          r.start()
        })

        if (abortRef.current) break
        setLiveTranscript('')

        if (!transcript.trim()) {
          // No speech detected — give another chance without looping
          continue
        }

        // 5. Submit defense — loop will wait for next AI message at top
        setState(VOICE_MODE_STATES.PROCESSING)
        await submitRef.current(transcript)
        setState(VOICE_MODE_STATES.WAITING)
      }
    } finally {
      loopRunningRef.current = false
      if (!abortRef.current) setState(VOICE_MODE_STATES.DONE)
      else setState(VOICE_MODE_STATES.IDLE)
      setSpeakingRole(null)
      setLiveTranscript('')
    }
  }, [])

  const stop = useCallback(() => {
    abortRef.current = true
    // Wake any pending waitForNextMessage so it can exit cleanly
    if (newMessageResolverRef.current) {
      newMessageResolverRef.current()
      newMessageResolverRef.current = null
    }
    setState(VOICE_MODE_STATES.IDLE)
    setSpeakingRole(null)
    setLiveTranscript('')
    loopRunningRef.current = false
  }, [])

  // Auto-start loop when enabled
  useEffect(() => {
    if (enabled && !loopRunningRef.current) {
      startLoop()
    }
    if (!enabled) {
      stop()
    }
  }, [enabled])

  // Re-check for new messages whenever messages change (resolves the wait)
  // Already handled by the useEffect above that calls newMessageResolverRef

  const isAvailable =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  return { state, speakingRole, transcript: liveTranscript, isAvailable, stop }
}
