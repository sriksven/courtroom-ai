import { useReducer, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { PHASES } from '../constants/phases.js'
import { buildFullTranscript } from '../utils/transcriptManager.js'

const initialState = {
  phase: PHASES.SETUP,
  accusation: null,
  messages: [],
  round: 0,
  verdict: null,
  scores: null,
  fallacies: [],
  isLoading: false,
  error: null,
}

function getNextPhaseFromDefenseSubmit(currentPhase) {
  switch (currentPhase) {
    case PHASES.OPENING: return { phase: PHASES.CROSS_1, round: 1 }
    case PHASES.CROSS_1: return { phase: PHASES.CROSS_2, round: 2 }
    case PHASES.CROSS_2: return { phase: PHASES.CROSS_3, round: 3 }
    case PHASES.CROSS_3: return { phase: PHASES.CLOSING, round: 0 }
    case PHASES.CLOSING: return { phase: PHASES.VERDICT, round: 0 }
    default: return null
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_ACCUSATION':
      return { ...state, accusation: action.payload }

    case 'START_TRIAL':
      return { ...initialState, phase: PHASES.OPENING, accusation: action.payload }

    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] }

    case 'DEFENSE_SUBMITTED': {
      const next = getNextPhaseFromDefenseSubmit(state.phase)
      if (!next) return state
      return { ...state, phase: next.phase, round: next.round }
    }

    case 'VERDICT_RECEIVED':
      return {
        ...state,
        phase: PHASES.VERDICT,
        verdict: action.payload.verdict,
        scores: action.payload.scores,
        fallacies: action.payload.fallacies ?? [],
      }

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }

    case 'SET_ERROR':
      return { ...state, error: action.payload }

    case 'RESET':
      return { ...initialState }

    default:
      return state
  }
}

// ── API helpers ──────────────────────────────────────────────────────────────

async function apiPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${path} error: ${res.status}`)
  return res.json()
}

// Send a message via LiveKit room data channel and wait for response type
function sendViaLiveKit(room, message, expectedResponseType, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    if (!room?.localParticipant) {
      reject(new Error('LiveKit room not connected'))
      return
    }

    const timer = setTimeout(() => {
      room.off('dataReceived', handler)
      reject(new Error(`LiveKit timeout waiting for ${expectedResponseType}`))
    }, timeoutMs)

    function handler(payload, participant) {
      if (!participant) return
      let msg
      try { msg = JSON.parse(new TextDecoder().decode(payload)) } catch { return }
      if (msg.type === expectedResponseType) {
        clearTimeout(timer)
        room.off('dataReceived', handler)
        resolve(msg)
      } else if (msg.type === 'error' && msg.originalType === message.type) {
        clearTimeout(timer)
        room.off('dataReceived', handler)
        reject(new Error(msg.message))
      }
    }

    room.on('dataReceived', handler)

    const encoded = new TextEncoder().encode(JSON.stringify(message))
    room.localParticipant.publishData(encoded, { reliable: true }).catch(err => {
      clearTimeout(timer)
      room.off('dataReceived', handler)
      reject(err)
    })
  })
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useTrial() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const roomRef = useRef(null)
  const trialIdRef = useRef(null) // stable ID for this trial session — correlates agent memory

  // Called by TrialContext after LiveKit room connects
  function setRoom(room) {
    roomRef.current = room
  }

  function useRoom() {
    return roomRef.current
  }

  // ── Prosecutor call: LiveKit if room connected, else direct API ──
  async function callProsecutor(accusation, phase, messages, defenseText = '', round = 0) {
    const room = roomRef.current
    const trialId = trialIdRef.current
    const history = messages
      .filter(m => m.role === 'prosecutor' || m.role === 'defense')
      .map(m => ({ role: m.role === 'prosecutor' ? 'assistant' : 'user', content: m.content }))

    if (room?.localParticipant) {
      try {
        const res = await sendViaLiveKit(
          room,
          { type: 'defense_submitted', trialId, accusation, phase, round, history, text: defenseText },
          'prosecutor_response',
          20000,
        )
        return res.text
      } catch (err) {
        console.warn('[useTrial] LiveKit call failed, falling back to API:', err.message)
      }
    }

    const data = await apiPost('/api/prosecutor', { accusation, phase, history })
    return data.content
  }

  async function callJudge(accusation, messages, defenseText = '') {
    const room = roomRef.current
    const trialId = trialIdRef.current
    const transcript = buildFullTranscript(messages)

    if (room?.localParticipant) {
      try {
        const res = await sendViaLiveKit(
          room,
          { type: 'closing_submitted', trialId, accusation, transcript, text: defenseText, messages },
          'verdict',
          30000,
        )
        return res.verdict
      } catch (err) {
        console.warn('[useTrial] LiveKit judge call failed, falling back to API:', err.message)
      }
    }

    return apiPost('/api/judge', { accusation, transcript })
  }

  // ── startTrial ──────────────────────────────────────────────────
  const startTrial = useCallback(async (accusation) => {
    trialIdRef.current = uuidv4() // fresh ID for each trial
    dispatch({ type: 'START_TRIAL', payload: accusation })
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })
    try {
      const content = await callProsecutor(accusation, PHASES.OPENING, [])
      dispatch({
        type: 'ADD_MESSAGE',
        payload: { id: uuidv4(), role: 'prosecutor', content, timestamp: Date.now(), phase: PHASES.OPENING, round: null },
      })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── submitDefense ───────────────────────────────────────────────
  const submitDefense = useCallback(async (text) => {
    const currentPhase = state.phase
    const currentRound = state.round

    const defenseMsg = {
      id: uuidv4(), role: 'defense', content: text,
      timestamp: Date.now(), phase: currentPhase, round: currentRound,
    }
    dispatch({ type: 'ADD_MESSAGE', payload: defenseMsg })
    dispatch({ type: 'DEFENSE_SUBMITTED' })

    const next = getNextPhaseFromDefenseSubmit(currentPhase)
    if (!next) return

    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    const updatedMessages = [...state.messages, defenseMsg]

    try {
      if (next.phase !== PHASES.VERDICT) {
        const content = await callProsecutor(state.accusation, next.phase, updatedMessages, text, next.round)
        dispatch({
          type: 'ADD_MESSAGE',
          payload: { id: uuidv4(), role: 'prosecutor', content, timestamp: Date.now(), phase: next.phase, round: next.round },
        })
      } else {
        const data = await callJudge(state.accusation, updatedMessages, text)
        dispatch({
          type: 'VERDICT_RECEIVED',
          payload: {
            verdict: data.guilty !== undefined ? data : data.verdict,
            scores: data.scores ?? null,
            fallacies: data.fallacies ?? [],
          },
        })
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [state])

  // ── requestHint ─────────────────────────────────────────────────
  const requestHint = useCallback(async () => {
    const lastProsecutorMsg = [...state.messages].reverse().find(m => m.role === 'prosecutor')
    if (!lastProsecutorMsg) return null

    const room = roomRef.current
    try {
      if (room?.localParticipant) {
        try {
          const res = await sendViaLiveKit(
            room,
            { type: 'hint_requested', trialId: trialIdRef.current, accusation: state.accusation, latestProsecutorStatement: lastProsecutorMsg.content },
            'hint_response',
            10000,
          )
          return res.hints
        } catch {
          // fall through to API
        }
      }
      const data = await apiPost('/api/defense-hint', {
        accusation: state.accusation,
        latestProsecutorStatement: lastProsecutorMsg.content,
      })
      return data.hints ?? data.hint ?? ''
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
      return null
    }
  }, [state.messages, state.accusation])

  const resetTrial = useCallback(() => dispatch({ type: 'RESET' }), [])

  return {
    phase: state.phase,
    accusation: state.accusation,
    messages: state.messages,
    round: state.round,
    verdict: state.verdict,
    scores: state.scores,
    fallacies: state.fallacies,
    isLoading: state.isLoading,
    error: state.error,
    startTrial,
    submitDefense,
    requestHint,
    resetTrial,
    setRoom,
  }
}
