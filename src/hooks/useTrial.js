import { useReducer, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { PHASES, DEFAULT_ROUNDS, DYNAMIC_HARD_CAP, COURT_INTERVENTION_ROUND, buildPhaseOrder, buildPhaseTransitions, buildPhaseOrderWithWitnesses, buildPhaseTransitionsWithWitnesses } from '../constants/phases.js'
import { buildFullTranscript } from '../utils/transcriptManager.js'

export const MAX_HINTS = 3

const INTERVENTION_MESSAGES = [
  'Order! This cross-examination has gone on far too long. The court will allow each party two final rounds to make their case before we move to closing arguments.',
  'The court notes that this matter has been argued at considerable length. You have two rounds to finalize your positions. After that, closing arguments will begin. There will be no exceptions.',
  'Both parties have two rounds remaining before this court moves to closing statements. Make them count.',
  'Enough. Two rounds remain. Use them wisely.',
]

const FINAL_ROUND_MESSAGE = 'This is your final round. Closing arguments follow immediately after.'

const initialState = {
  phase: PHASES.SETUP,
  accusation: null,
  messages: [],
  round: 0,
  rounds: DEFAULT_ROUNDS,       // number | 'dynamic'
  isDynamic: false,
  difficulty: 'normal',         // 'easy' | 'normal' | 'hard'
  phaseOrder: buildPhaseOrder(DEFAULT_ROUNDS),
  transitions: buildPhaseTransitions(DEFAULT_ROUNDS),
  dynamicRoundReasons: [],      // why the prosecutor requested each extra round
  interventionDelivered: false,
  roundsAfterIntervention: 0,
  verdict: null,
  scores: null,
  fallacies: [],
  hintsUsed: 0,
  isLoading: false,
  error: null,
  witnessConfig: null,
  prosecutionWitnessProfiles: [],
  witnessQuestionsAsked: 0,
  defenseWitnessesUsed: 0,
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
        difficulty: action.payload.difficulty,
        phaseOrder: action.payload.phaseOrder,
        transitions: action.payload.transitions,
        dynamicRoundReasons: [],
        hintsUsed: 0,
        interventionDelivered: false,
        roundsAfterIntervention: 0,
        witnessConfig: action.payload.witnessConfig ?? null,
        prosecutionWitnessProfiles: [],
        witnessQuestionsAsked: 0,
        defenseWitnessesUsed: 0,
      }

    case 'USE_HINT':
      return { ...state, hintsUsed: state.hintsUsed + 1 }

    case 'COURT_INTERVENED':
      return { ...state, interventionDelivered: true, roundsAfterIntervention: 0 }

    case 'INCREMENT_POST_INTERVENTION':
      return { ...state, roundsAfterIntervention: state.roundsAfterIntervention + 1 }

    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] }

    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(m =>
          m.id === action.payload.id ? { ...m, content: action.payload.content } : m
        ),
      }

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

    case 'ADD_PROSECUTION_WITNESS': {
      const profiles = [...state.prosecutionWitnessProfiles]
      profiles[action.payload.witnessNum - 1] = action.payload.profile
      return { ...state, prosecutionWitnessProfiles: profiles, witnessQuestionsAsked: 0 }
    }
    case 'ADVANCE_WITNESS_QUESTION':
      return { ...state, witnessQuestionsAsked: state.witnessQuestionsAsked + 1 }
    case 'RESET_WITNESS_QUESTIONS':
      return { ...state, witnessQuestionsAsked: 0 }
    case 'USE_DEFENSE_WITNESS':
      return { ...state, defenseWitnessesUsed: state.defenseWitnessesUsed + 1 }

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

async function* apiStream(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${path} error: ${res.status}`)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    yield decoder.decode(value, { stream: true })
  }
}

/** LLM sometimes returns JSON as prose, e.g. {"content":"Ladies and gentlemen..."}. Strip to spoken text. */
function normalizeProsecutorText(raw) {
  if (raw == null) return ''
  const s = String(raw).trim()
  if (!s.startsWith('{')) return String(raw)
  try {
    const parsed = JSON.parse(s)
    if (typeof parsed.content === 'string' && parsed.content.trim()) return parsed.content.trim()
    if (typeof parsed.response === 'string' && parsed.response.trim()) return parsed.response.trim()
  } catch {
    /* not valid JSON — show as-is */
  }
  return String(raw)
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
  // onChunk: optional callback(partialContent) called as text streams in
  async function callProsecutor(accusation, phase, messages, defenseText = '', round = 0, isDynamic = false, onChunk = null, difficulty = 'normal') {
    const room = roomRef.current
    const trialId = trialIdRef.current
    const history = messages
      .filter(m => m.role === 'prosecutor' || m.role === 'defense')
      .map(m => ({ role: m.role === 'prosecutor' ? 'assistant' : 'user', content: m.content }))

    if (room?.localParticipant) {
      try {
        const res = await sendViaLiveKit(
          room,
          { type: 'defense_submitted', trialId, accusation, phase, round, history, text: defenseText, isDynamic, difficulty },
          'prosecutor_response',
          20000,
        )
        const raw = res.text ?? res.content ?? ''
        return {
          content: normalizeProsecutorText(raw),
          requestAnotherRound: res.requestAnotherRound,
          reason: res.reason ?? '',
        }
      } catch (err) {
        console.warn('[useTrial] LiveKit call failed, falling back to API:', err.message)
      }
    }

    // Dynamic mode needs JSON response - no streaming
    if (isDynamic) {
      const data = await apiPost('/api/prosecutor', { accusation, phase, history, round, isDynamic, difficulty })
      return {
        content: normalizeProsecutorText(data.content),
        requestAnotherRound: data.requestAnotherRound ?? false,
        reason: data.reason ?? '',
      }
    }

    // Stream fixed-mode responses
    let content = ''
    for await (const chunk of apiStream('/api/prosecutor', { accusation, phase, history, round, isDynamic, difficulty, stream: true })) {
      content += chunk
      if (onChunk) onChunk(content)
    }
    const finalText = normalizeProsecutorText(content)
    if (onChunk && finalText !== content) onChunk(finalText)
    return { content: finalText, requestAnotherRound: false, reason: '' }
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
  const startTrial = useCallback(async (accusation, rounds = DEFAULT_ROUNDS, difficulty = 'normal', witnessConfig = null) => {
    trialIdRef.current = uuidv4()
    const isDynamic = rounds === 'dynamic'
    const numRounds = isDynamic ? DEFAULT_ROUNDS : rounds
    const phaseOrder = buildPhaseOrderWithWitnesses(numRounds, witnessConfig)
    const transitions = buildPhaseTransitionsWithWitnesses(numRounds, witnessConfig)

    dispatch({
      type: 'START_TRIAL',
      payload: { accusation, rounds, isDynamic, difficulty, phaseOrder, transitions, witnessConfig },
    })
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const msgId = uuidv4()
      dispatch({
        type: 'ADD_MESSAGE',
        payload: { id: msgId, role: 'prosecutor', content: '', timestamp: Date.now(), phase: PHASES.OPENING, round: null },
      })
      await callProsecutor(accusation, PHASES.OPENING, [], '', 0, false, (partial) => {
        dispatch({ type: 'UPDATE_MESSAGE', payload: { id: msgId, content: partial } })
      }, difficulty)
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
    const difficulty = state.difficulty

    const defenseMsg = {
      id: uuidv4(), role: 'defense', content: text,
      timestamp: Date.now(), phase: currentPhase, round: currentRound,
    }
    dispatch({ type: 'ADD_MESSAGE', payload: defenseMsg })

    const updatedMessages = [...state.messages, defenseMsg]

    // ── PROSECUTION_WITNESS phase: user cross-examines prosecution witness ──
    if (currentPhase.startsWith('PROSECUTION_WITNESS_')) {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })
      try {
        const witnessNum = parseInt(currentPhase.replace('PROSECUTION_WITNESS_', ''))
        const witnessProfile = state.prosecutionWitnessProfiles[witnessNum - 1]

        const responseData = await apiPost('/api/witness-response', {
          witness: witnessProfile,
          question: text,
          side: 'prosecution',
          accusation: state.accusation,
          questionsAsked: state.witnessQuestionsAsked,
        })

        dispatch({ type: 'ADD_MESSAGE', payload: {
          id: uuidv4(), role: 'prosecution_witness', content: responseData.response,
          witnessProfile, timestamp: Date.now(), phase: currentPhase,
        }})
        dispatch({ type: 'ADVANCE_WITNESS_QUESTION' })

        const newQCount = state.witnessQuestionsAsked + 1
        if (newQCount >= 2) {
          const next = state.transitions[currentPhase]
          dispatch({ type: 'ADVANCE_PHASE' })
          dispatch({ type: 'RESET_WITNESS_QUESTIONS' })

          if (next?.phase.startsWith('CROSS_')) {
            const msgId = uuidv4()
            dispatch({ type: 'ADD_MESSAGE', payload: { id: msgId, role: 'prosecutor', content: '', timestamp: Date.now(), phase: next.phase, round: next.round } })
            await callProsecutor(state.accusation, next.phase, updatedMessages, '', next.round, false, (partial) => {
              dispatch({ type: 'UPDATE_MESSAGE', payload: { id: msgId, content: partial } })
            }, difficulty)
          } else if (next?.phase === 'CLOSING') {
            const closingId = uuidv4()
            dispatch({ type: 'ADD_MESSAGE', payload: { id: closingId, role: 'prosecutor', content: '', timestamp: Date.now(), phase: 'CLOSING', round: 0 } })
            await callProsecutor(state.accusation, 'CLOSING', updatedMessages, '', 0, false, (partial) => {
              dispatch({ type: 'UPDATE_MESSAGE', payload: { id: closingId, content: partial } })
            }, difficulty)
          }
        }
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: err.message })
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
      return
    }

    // ── CLOSING → VERDICT ──────────────────────────────────────────
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

    // ── Dynamic mode: CROSS phases (multi-round with court intervention) ──
    if (isDynamic && currentPhase.startsWith('CROSS_')) {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      const streamClosing = async (msgsForClosing) => {
        dispatch({ type: 'ADVANCE_TO_CLOSING' })
        const closingId = uuidv4()
        dispatch({ type: 'ADD_MESSAGE', payload: { id: closingId, role: 'prosecutor', content: '', timestamp: Date.now(), phase: 'CLOSING', round: 0 } })
        await callProsecutor(state.accusation, 'CLOSING', msgsForClosing, '', 0, false, (partial) => {
          dispatch({ type: 'UPDATE_MESSAGE', payload: { id: closingId, content: partial } })
        }, difficulty)
      }

      try {
        // Absolute hard cap
        if (currentRound >= DYNAMIC_HARD_CAP) {
          await streamClosing(updatedMessages)
          return
        }

        // Court intervenes at COURT_INTERVENTION_ROUND — warn both parties
        if (currentRound === COURT_INTERVENTION_ROUND) {
          const msg = INTERVENTION_MESSAGES[Math.floor(Math.random() * INTERVENTION_MESSAGES.length)]
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              id: uuidv4(),
              role: 'judge',
              content: msg,
              timestamp: Date.now(),
              phase: currentPhase,
              round: currentRound,
              isIntervention: true,
            },
          })
          dispatch({ type: 'COURT_INTERVENED' })
        }

        const nextRound = currentRound + 1
        const nextPhase = `CROSS_${nextRound}`

        const msgId = uuidv4()
        dispatch({ type: 'ADD_MESSAGE', payload: { id: msgId, role: 'prosecutor', content: '', timestamp: Date.now(), phase: nextPhase, round: nextRound } })
        const response = await callProsecutor(state.accusation, nextPhase, updatedMessages, text, nextRound, true, null, difficulty)
        dispatch({ type: 'UPDATE_MESSAGE', payload: { id: msgId, content: response.content } })

        // Track rounds after intervention
        const isPostIntervention = currentRound >= COURT_INTERVENTION_ROUND
        if (isPostIntervention) {
          dispatch({ type: 'INCREMENT_POST_INTERVENTION' })
        }

        // After intervention, only allow 2 more rounds total
        const roundsUsedAfter = nextRound - COURT_INTERVENTION_ROUND
        const forcedClose = roundsUsedAfter >= 2

        // Round-9 reminder: one round left
        if (roundsUsedAfter === 1) {
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              id: uuidv4(),
              role: 'judge',
              content: FINAL_ROUND_MESSAGE,
              timestamp: Date.now(),
              phase: nextPhase,
              round: nextRound,
              isIntervention: true,
            },
          })
        }

        if (response.requestAnotherRound && !forcedClose) {
          dispatch({ type: 'ADD_DYNAMIC_ROUND', payload: { reason: response.reason } })
        } else {
          const msgsWithLastCross = [...updatedMessages, { id: 'tmp', role: 'prosecutor', content: response.content }]
          await streamClosing(msgsWithLastCross)
        }
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: err.message })
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
      return
    }

    // ── Fixed mode / OPENING → next phase (transitions-based) ─────
    const next = state.transitions[currentPhase]
    if (!next) return

    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
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

      if (next.phase.startsWith('PROSECUTION_WITNESS_')) {
        try {
          const witnessNum = parseInt(next.phase.replace('PROSECUTION_WITNESS_', ''))

          const genData = await apiPost('/api/generate-witnesses', {
            accusation: state.accusation, side: 'prosecution', count: 1,
          })
          const profile = genData.witnesses[0]

          dispatch({ type: 'ADD_MESSAGE', payload: {
            id: uuidv4(), role: 'prosecutor',
            content: `The prosecution calls ${profile.name}. ${profile.title}. Please take the stand.`,
            timestamp: Date.now(), phase: next.phase, round: currentRound,
          }})

          const testimonyData = await apiPost('/api/witness-testimony', {
            witness: profile, side: 'prosecution', accusation: state.accusation,
          })

          dispatch({ type: 'ADD_MESSAGE', payload: {
            id: uuidv4(), role: 'prosecution_witness', content: testimonyData.testimony,
            witnessProfile: profile, timestamp: Date.now(), phase: next.phase,
          }})

          dispatch({ type: 'ADD_PROSECUTION_WITNESS', payload: { witnessNum, profile } })
          dispatch({ type: 'ADVANCE_PHASE' })
        } catch (err) {
          dispatch({ type: 'SET_ERROR', payload: err.message })
        } finally {
          dispatch({ type: 'SET_LOADING', payload: false })
        }
        return
      }

      // Dynamic OPENING: first cross uses dynamic mode so prosecutor can decide after round 1
      const isOpeningDynamic = isDynamic && currentPhase === 'OPENING'
      const msgId = uuidv4()
      dispatch({ type: 'ADD_MESSAGE', payload: { id: msgId, role: 'prosecutor', content: '', timestamp: Date.now(), phase: next.phase, round: next.round } })
      const response = await callProsecutor(
        state.accusation, next.phase, updatedMessages, text, next.round, isOpeningDynamic,
        isOpeningDynamic ? null : (partial) => { dispatch({ type: 'UPDATE_MESSAGE', payload: { id: msgId, content: partial } }) },
        difficulty
      )

      if (isOpeningDynamic) {
        dispatch({ type: 'UPDATE_MESSAGE', payload: { id: msgId, content: response.content } })
        if (response.requestAnotherRound) {
          dispatch({ type: 'ADD_DYNAMIC_ROUND', payload: { reason: response.reason } })
        } else {
          dispatch({ type: 'ADVANCE_TO_CLOSING' })
          const closingId = uuidv4()
          dispatch({ type: 'ADD_MESSAGE', payload: { id: closingId, role: 'prosecutor', content: '', timestamp: Date.now(), phase: 'CLOSING', round: 0 } })
          await callProsecutor(state.accusation, 'CLOSING', [...updatedMessages, { id: 'tmp', role: 'prosecutor', content: response.content }], '', 0, false, (partial) => {
            dispatch({ type: 'UPDATE_MESSAGE', payload: { id: closingId, content: partial } })
          }, difficulty)
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
  // onChunk: callback(partialText) called as hint streams in
  const requestHint = useCallback(async (onChunk) => {
    if (state.hintsUsed >= MAX_HINTS) return null
    const lastProsecutorMsg = [...state.messages].reverse().find(m => m.role === 'prosecutor')
    if (!lastProsecutorMsg) return null
    dispatch({ type: 'USE_HINT' })
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
      let hint = ''
      for await (const chunk of apiStream('/api/defense-hint', {
        accusation: state.accusation,
        latestProsecutorStatement: lastProsecutorMsg.content,
      })) {
        hint += chunk
        if (onChunk) onChunk(hint)
      }
      return hint
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
      return null
    }
  }, [state.messages, state.accusation])

  const callDefenseWitness = useCallback(async () => {
    const config = state.witnessConfig
    const witnessIdx = state.defenseWitnessesUsed
    if (!config?.enabled || witnessIdx >= (config.defenseWitnesses?.length ?? 0)) return

    const profile = config.defenseWitnesses[witnessIdx]
    const currentPhase = state.phase
    const difficulty = state.difficulty

    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })
    dispatch({ type: 'USE_DEFENSE_WITNESS' })

    try {
      const testimonyData = await apiPost('/api/witness-testimony', {
        witness: profile, side: 'defense', accusation: state.accusation,
      })

      dispatch({ type: 'ADD_MESSAGE', payload: {
        id: uuidv4(), role: 'defense_witness', content: testimonyData.testimony,
        witnessProfile: profile, timestamp: Date.now(), phase: currentPhase,
      }})

      for (let q = 1; q <= 2; q++) {
        const crossData = await apiPost('/api/witness-cross', {
          witness: profile, accusation: state.accusation,
          questionNumber: q, testimony: testimonyData.testimony,
        })

        dispatch({ type: 'ADD_MESSAGE', payload: {
          id: uuidv4(), role: 'prosecutor', content: crossData.question,
          timestamp: Date.now(), phase: currentPhase,
        }})

        const respData = await apiPost('/api/witness-response', {
          witness: profile, question: crossData.question,
          side: 'defense', accusation: state.accusation, questionsAsked: q - 1,
        })

        dispatch({ type: 'ADD_MESSAGE', payload: {
          id: uuidv4(), role: 'defense_witness', content: respData.response,
          witnessProfile: profile, timestamp: Date.now(), phase: currentPhase,
        }})
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [state.witnessConfig, state.defenseWitnessesUsed, state.accusation, state.phase, state.difficulty, state.messages])

  const resetTrial = useCallback(() => dispatch({ type: 'RESET' }), [])

  return {
    phase: state.phase,
    accusation: state.accusation,
    messages: state.messages,
    round: state.round,
    rounds: state.rounds,
    isDynamic: state.isDynamic,
    difficulty: state.difficulty,
    phaseOrder: state.phaseOrder,
    dynamicRoundReasons: state.dynamicRoundReasons,
    interventionDelivered: state.interventionDelivered,
    roundsAfterIntervention: state.roundsAfterIntervention,
    verdict: state.verdict,
    scores: state.scores,
    fallacies: state.fallacies,
    hintsUsed: state.hintsUsed,
    isLoading: state.isLoading,
    error: state.error,
    startTrial,
    submitDefense,
    requestHint,
    callDefenseWitness,
    resetTrial,
    setRoom,
    witnessConfig: state.witnessConfig,
    prosecutionWitnessProfiles: state.prosecutionWitnessProfiles,
    witnessQuestionsAsked: state.witnessQuestionsAsked,
    defenseWitnessesUsed: state.defenseWitnessesUsed,
  }
}
