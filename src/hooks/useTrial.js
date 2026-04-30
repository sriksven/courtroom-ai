import { useReducer, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { PHASES, DEFAULT_ROUNDS, DYNAMIC_HARD_CAP, buildPhaseOrder, buildPhaseTransitions } from '../constants/phases.js'
import { buildFullTranscript } from '../utils/transcriptManager.js'

const initialState = {
  phase: PHASES.SETUP,
  accusation: null,
  messages: [],
  round: 0,
  rounds: DEFAULT_ROUNDS,       // number | 'dynamic'
  isDynamic: false,
  phaseOrder: buildPhaseOrder(DEFAULT_ROUNDS),
  transitions: buildPhaseTransitions(DEFAULT_ROUNDS),
  dynamicRoundReasons: [],      // why the prosecutor requested each extra round
  verdict: null,
  scores: null,
  fallacies: [],
  isLoading: false,
  error: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'START_TRIAL':
      return {
        ...initialState,
        phase: PHASES.OPENING,
        accusation: action.payload.accusation,
        rounds: action.payload.rounds,
        isDynamic: action.payload.isDynamic,
        phaseOrder: action.payload.phaseOrder,
        transitions: action.payload.transitions,
        dynamicRoundReasons: [],
      }

    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] }

    case 'ADVANCE_PHASE': {
      const next = state.transitions[state.phase]
      if (!next) return state
      return { ...state, phase: next.phase, round: next.round }
    }

    case 'ADD_DYNAMIC_ROUND': {
      const nextRound = state.round + 1
      const nextPhase = `CROSS_${nextRound}`
      const newPhaseOrder = [...state.phaseOrder]
      // Insert nextPhase before CLOSING if not already there
      const closingIdx = newPhaseOrder.indexOf('CLOSING')
      if (!newPhaseOrder.includes(nextPhase)) {
        newPhaseOrder.splice(closingIdx, 0, nextPhase)
      }
      // Rebuild transitions with one more round
      const newTransitions = { ...state.transitions }
      newTransitions[`CROSS_${state.round}`] = { phase: nextPhase, round: nextRound }
      newTransitions[nextPhase] = { phase: 'CLOSING', round: 0 }
      return {
        ...state,
        phase: nextPhase,
        round: nextRound,
        phaseOrder: newPhaseOrder,
        transitions: newTransitions,
        dynamicRoundReasons: [...state.dynamicRoundReasons, action.payload.reason],
      }
    }

    case 'ADVANCE_TO_CLOSING':
      return { ...state, phase: 'CLOSING', round: 0 }

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

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${path} error: ${res.status}`)
  return res.json()
}

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

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTrial() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const roomRef = useRef(null)
  const trialIdRef = useRef(null)

  function setRoom(room) { roomRef.current = room }

  // ── Prosecutor call ──────────────────────────────────────────────
  async function callProsecutor(accusation, phase, messages, defenseText = '', round = 0, isDynamic = false) {
    const room = roomRef.current
    const trialId = trialIdRef.current
    const history = messages
      .filter(m => m.role === 'prosecutor' || m.role === 'defense')
      .map(m => ({ role: m.role === 'prosecutor' ? 'assistant' : 'user', content: m.content }))

    if (room?.localParticipant) {
      try {
        const res = await sendViaLiveKit(
          room,
          { type: 'defense_submitted', trialId, accusation, phase, round, history, text: defenseText, isDynamic },
          'prosecutor_response',
          20000,
        )
        return { content: res.text, requestAnotherRound: res.requestAnotherRound, reason: res.reason }
      } catch (err) {
        console.warn('[useTrial] LiveKit call failed, falling back to API:', err.message)
      }
    }

    const data = await apiPost('/api/prosecutor', { accusation, phase, history, round, isDynamic })
    return { content: data.content, requestAnotherRound: data.requestAnotherRound ?? false, reason: data.reason ?? '' }
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

  // ── startTrial ───────────────────────────────────────────────────
  const startTrial = useCallback(async (accusation, rounds = DEFAULT_ROUNDS) => {
    trialIdRef.current = uuidv4()
    const isDynamic = rounds === 'dynamic'
    const numRounds = isDynamic ? DEFAULT_ROUNDS : rounds
    const phaseOrder = buildPhaseOrder(numRounds)
    const transitions = buildPhaseTransitions(numRounds)

    dispatch({
      type: 'START_TRIAL',
      payload: { accusation, rounds, isDynamic, phaseOrder, transitions },
    })
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const { content } = await callProsecutor(accusation, PHASES.OPENING, [])
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

  // ── submitDefense ────────────────────────────────────────────────
  const submitDefense = useCallback(async (text) => {
    const currentPhase = state.phase
    const currentRound = state.round
    const isDynamic = state.isDynamic
    const isAtHardCap = currentRound >= DYNAMIC_HARD_CAP

    const defenseMsg = {
      id: uuidv4(), role: 'defense', content: text,
      timestamp: Date.now(), phase: currentPhase, round: currentRound,
    }
    dispatch({ type: 'ADD_MESSAGE', payload: defenseMsg })

    const updatedMessages = [...state.messages, defenseMsg]

    // CLOSING → VERDICT
    if (currentPhase === 'CLOSING') {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })
      try {
        const data = await callJudge(state.accusation, updatedMessages, text)
        dispatch({
          type: 'VERDICT_RECEIVED',
          payload: {
            verdict: data.guilty !== undefined ? data : data.verdict,
            scores: data.scores ?? null,
            fallacies: data.fallacies ?? [],
          },
        })
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: err.message })
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
      return
    }

    // Hard cap: force closing
    if (isDynamic && isAtHardCap) {
      dispatch({ type: 'ADVANCE_TO_CLOSING' })
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })
      try {
        const { content } = await callProsecutor(state.accusation, 'CLOSING', updatedMessages, text, 0, false)
        dispatch({
          type: 'ADD_MESSAGE',
          payload: { id: uuidv4(), role: 'prosecutor', content, timestamp: Date.now(), phase: 'CLOSING', round: 0 },
        })
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: err.message })
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
      return
    }

    // Normal cross / opening → next phase
    const next = state.transitions[currentPhase]
    if (!next) return

    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const isCrossPhase = currentPhase.startsWith('CROSS_') || currentPhase === 'OPENING'
      const useDynamic = isDynamic && isCrossPhase && next.phase !== 'CLOSING'

      if (next.phase === 'VERDICT') {
        const data = await callJudge(state.accusation, updatedMessages, text)
        dispatch({
          type: 'VERDICT_RECEIVED',
          payload: {
            verdict: data.guilty !== undefined ? data : data.verdict,
            scores: data.scores ?? null,
            fallacies: data.fallacies ?? [],
          },
        })
        return
      }

      const response = await callProsecutor(
        state.accusation, next.phase, updatedMessages, text, next.round, useDynamic
      )

      dispatch({
        type: 'ADD_MESSAGE',
        payload: { id: uuidv4(), role: 'prosecutor', content: response.content, timestamp: Date.now(), phase: next.phase, round: next.round },
      })

      // Dynamic: decide next phase based on prosecutor's response
      if (useDynamic) {
        if (response.requestAnotherRound) {
          dispatch({ type: 'ADD_DYNAMIC_ROUND', payload: { reason: response.reason } })
        } else {
          dispatch({ type: 'ADVANCE_TO_CLOSING' })
          // Immediately get prosecutor's closing statement
          const closing = await callProsecutor(state.accusation, 'CLOSING', [...updatedMessages, {
            id: 'tmp', role: 'prosecutor', content: response.content,
          }], '', 0, false)
          dispatch({
            type: 'ADD_MESSAGE',
            payload: { id: uuidv4(), role: 'prosecutor', content: closing.content, timestamp: Date.now(), phase: 'CLOSING', round: 0 },
          })
        }
      } else {
        dispatch({ type: 'ADVANCE_PHASE' })
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [state])

  // ── requestHint ──────────────────────────────────────────────────
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
        } catch { /* fall through */ }
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
    rounds: state.rounds,
    isDynamic: state.isDynamic,
    phaseOrder: state.phaseOrder,
    dynamicRoundReasons: state.dynamicRoundReasons,
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
