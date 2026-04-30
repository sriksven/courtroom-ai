import { useState, useRef, useCallback, useEffect } from 'react'
import { PHASES } from '../constants/phases.js'

export const VOICE_MODE_STATES = {
  IDLE: 'IDLE',
  SPEAKING: 'SPEAKING',
  LISTENING: 'LISTENING',
  PROCESSING: 'PROCESSING',
  WAITING: 'WAITING',
  DONE: 'DONE',
}

const ROLE_VOICES = {
  prosecutor: 'onyx',
  judge: 'shimmer',
}

// Fetch TTS for a chunk and return an Audio object ready to play
async function fetchAudio(text, voice) {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  })
  if (!res.ok) throw new Error('TTS failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  return { audio: new Audio(url), url }
}

// Play audio, resolving when it ends
function playAudio({ audio, url }) {
  return new Promise((resolve) => {
    audio.onended = () => { URL.revokeObjectURL(url); resolve() }
    audio.onerror = () => { URL.revokeObjectURL(url); resolve() }
    audio.play().catch(() => resolve())
  })
}

export function useVoiceMode({ messages, phase, submitDefense, enabled }) {
  const [state, setState] = useState(VOICE_MODE_STATES.IDLE)
  const [speakingRole, setSpeakingRole] = useState(null)
  const [liveTranscript, setLiveTranscript] = useState('')

  const abortRef = useRef(false)
  const loopRunningRef = useRef(false)
  const spokenIdsRef = useRef(new Set())
  const messagesRef = useRef(messages)
  const phaseRef = useRef(phase)
  const submitRef = useRef(submitDefense)

  // Resolver called on every messages change (new message OR content update)
  const onMessagesChangedRef = useRef(null)

  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { submitRef.current = submitDefense }, [submitDefense])

  // Wake anything waiting on messages whenever they change
  useEffect(() => {
    if (onMessagesChangedRef.current) {
      onMessagesChangedRef.current()
      onMessagesChangedRef.current = null
    }
  }, [messages])

  // Wait for a message change notification
  function waitForMessagesChange() {
    return new Promise(resolve => {
      onMessagesChangedRef.current = resolve
    })
  }

  // Wait until a new unspoken AI message with non-empty content appears
  function waitForNextMessage() {
    return new Promise((resolve) => {
      function check() {
        const msg = messagesRef.current.find(
          m => (m.role === 'prosecutor' || m.role === 'judge') &&
               !spokenIdsRef.current.has(m.id) &&
               m.content.length > 0
        )
        if (msg) {
          resolve(msg)
        } else {
          // Re-register - content hasn't arrived yet
          onMessagesChangedRef.current = check
        }
      }
      check()
    })
  }

  // Speak a streaming message sentence by sentence.
  // Watches messagesRef for content updates, extracts complete sentences,
  // fires TTS immediately, and queues audio so playback is continuous.
  async function speakStreamingMessage(msgId, voice) {
    let spokenUpTo = 0
    // Chain of audio play Promises so sentences play in order
    let playChain = Promise.resolve()
    // Prefetch next sentence while current is playing
    let prefetchPromise = null

    const SENTENCE_BOUNDARY = /[.!?][)”"']?\s+/g

    function extractNextSentences(content) {
      const unspoken = content.slice(spokenUpTo)
      let lastEnd = -1
      SENTENCE_BOUNDARY.lastIndex = 0
      let match
      while ((match = SENTENCE_BOUNDARY.exec(unspoken)) !== null) {
        lastEnd = match.index + match[0].length
      }
      if (lastEnd < 0) return null
      const sentence = unspoken.slice(0, lastEnd).trim()
      spokenUpTo += lastEnd
      return sentence || null
    }

    function queueSentence(text) {
      // Prefetch audio while current sentence plays
      const fetchP = fetchAudio(text, voice).catch(() => null)
      playChain = playChain.then(async () => {
        if (abortRef.current) return
        const audioObj = await fetchP
        if (audioObj && !abortRef.current) await playAudio(audioObj)
      })
    }

    // Drain any complete sentences from current content
    function drainSentences(content) {
      let sentence
      while ((sentence = extractNextSentences(content)) !== null) {
        queueSentence(sentence)
      }
    }

    // Watch content as it streams in
    while (!abortRef.current) {
      const msg = messagesRef.current.find(m => m.id === msgId)
      const content = msg?.content ?? ''

      drainSentences(content)

      // Wait for next content update OR timeout (stream probably finished)
      const result = await Promise.race([
        waitForMessagesChange().then(() => 'changed'),
        new Promise(resolve => setTimeout(() => resolve('timeout'), 700)),
      ])

      if (result === 'timeout') {
        // Stream settled — speak any remaining text
        const finalMsg = messagesRef.current.find(m => m.id === msgId)
        const remaining = (finalMsg?.content ?? '').slice(spokenUpTo).trim()
        if (remaining) queueSentence(remaining)
        break
      }
    }

    // Wait for all queued audio to finish
    await playChain
  }

  const startLoop = useCallback(async () => {
    if (loopRunningRef.current) return
    loopRunningRef.current = true
    abortRef.current = false
    spokenIdsRef.current = new Set()

    try {
      while (!abortRef.current) {
        setState(VOICE_MODE_STATES.WAITING)

        // 1. Wait for next unspoken AI message (with content)
        const msg = await waitForNextMessage()
        if (!msg || abortRef.current) break

        spokenIdsRef.current.add(msg.id)

        // 2. Speak it (streaming sentence by sentence)
        setSpeakingRole(msg.role)
        setState(VOICE_MODE_STATES.SPEAKING)
        try {
          await speakStreamingMessage(msg.id, ROLE_VOICES[msg.role] ?? 'onyx')
        } catch {
          // TTS failure doesn't stop the loop
        }
        if (abortRef.current) break
        setSpeakingRole(null)

        // 3. Verdict - trial over
        if (phaseRef.current === PHASES.VERDICT || msg.role === 'judge') {
          setState(VOICE_MODE_STATES.DONE)
          break
        }

        // 4. Listen for defense
        setState(VOICE_MODE_STATES.LISTENING)
        setLiveTranscript('')

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

        if (!transcript.trim()) continue

        // 5. Submit defense
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
    if (onMessagesChangedRef.current) {
      onMessagesChangedRef.current()
      onMessagesChangedRef.current = null
    }
    setState(VOICE_MODE_STATES.IDLE)
    setSpeakingRole(null)
    setLiveTranscript('')
    loopRunningRef.current = false
  }, [])

  useEffect(() => {
    if (enabled && !loopRunningRef.current) startLoop()
    if (!enabled) stop()
  }, [enabled])

  const isAvailable =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  return { state, speakingRole, transcript: liveTranscript, isAvailable, stop }
}
