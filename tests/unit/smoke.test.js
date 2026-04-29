/**
 * Smoke tests — verify critical paths don't throw at runtime.
 * These are unit-level: no network calls, no browser APIs needed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ── Phase machine ─────────────────────────────────────────────────────────────

import { PHASES, PHASE_ORDER, getNextPhase, getRoundNumber, CROSS_PHASES } from '../../src/constants/phases.js'

describe('Phase constants', () => {
  it('PHASE_ORDER starts with SETUP and ends with VERDICT', () => {
    expect(PHASE_ORDER[0]).toBe(PHASES.SETUP)
    expect(PHASE_ORDER[PHASE_ORDER.length - 1]).toBe(PHASES.VERDICT)
  })

  it('getNextPhase advances correctly through full sequence', () => {
    const sequence = [
      [PHASES.SETUP, PHASES.OPENING],
      [PHASES.OPENING, PHASES.CROSS_1],
      [PHASES.CROSS_1, PHASES.CROSS_2],
      [PHASES.CROSS_2, PHASES.CROSS_3],
      [PHASES.CROSS_3, PHASES.CLOSING],
      [PHASES.CLOSING, PHASES.VERDICT],
    ]
    for (const [from, to] of sequence) {
      expect(getNextPhase(from)).toBe(to)
    }
  })

  it('getNextPhase returns null at VERDICT', () => {
    expect(getNextPhase(PHASES.VERDICT)).toBeNull()
  })

  it('getRoundNumber returns correct rounds for CROSS phases', () => {
    expect(getRoundNumber(PHASES.CROSS_1)).toBe(1)
    expect(getRoundNumber(PHASES.CROSS_2)).toBe(2)
    expect(getRoundNumber(PHASES.CROSS_3)).toBe(3)
    expect(getRoundNumber(PHASES.OPENING)).toBeNull()
    expect(getRoundNumber(PHASES.VERDICT)).toBeNull()
  })

  it('CROSS_PHASES contains exactly CROSS_1, CROSS_2, CROSS_3', () => {
    expect(CROSS_PHASES).toEqual([PHASES.CROSS_1, PHASES.CROSS_2, PHASES.CROSS_3])
  })
})

// ── useTrial state machine ────────────────────────────────────────────────────

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock livekit-client (not needed in unit tests)
vi.mock('livekit-client', () => ({
  Room: vi.fn(() => ({ on: vi.fn(), disconnect: vi.fn(), localParticipant: null })),
  RoomEvent: { Connected: 'connected', Disconnected: 'disconnected', DataReceived: 'dataReceived' },
}))

vi.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }))

import { useTrial } from '../../src/hooks/useTrial.js'

function mockProsecutorResponse(text = 'Prosecution speaks.') {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ content: text }),
  })
}

function mockJudgeResponse(guilty = false) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      guilty,
      verdict_statement: 'The defendant is found not guilty.',
      scores: { strength: 7, evidence: 7, logic: 7, persuasion: 7 },
      fallacies: [],
    }),
  })
}

describe('useTrial state machine', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('starts in SETUP phase with no messages', () => {
    const { result } = renderHook(() => useTrial())
    expect(result.current.phase).toBe(PHASES.SETUP)
    expect(result.current.messages).toHaveLength(0)
    expect(result.current.isLoading).toBe(false)
  })

  it('startTrial transitions to OPENING and adds prosecutor message', async () => {
    mockProsecutorResponse('Ladies and gentlemen of the jury…')
    const { result } = renderHook(() => useTrial())

    await act(async () => {
      await result.current.startTrial('Theft of concept of Monday')
    })

    expect(result.current.phase).toBe(PHASES.OPENING)
    expect(result.current.accusation).toBe('Theft of concept of Monday')
    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0].role).toBe('prosecutor')
    expect(result.current.messages[0].content).toBe('Ladies and gentlemen of the jury…')
    expect(result.current.isLoading).toBe(false)
  })

  it('submitDefense from OPENING → CROSS_1 adds defense + prosecutor messages', async () => {
    mockProsecutorResponse('Opening prosecution.')
    const { result } = renderHook(() => useTrial())

    await act(async () => { await result.current.startTrial('Stealing Monday') })
    expect(result.current.phase).toBe(PHASES.OPENING)

    mockProsecutorResponse('Cross examination round 1.')

    await act(async () => { await result.current.submitDefense('I am innocent.') })

    expect(result.current.phase).toBe(PHASES.CROSS_1)
    expect(result.current.round).toBe(1)
    // messages: [prosecutor opening, defense, prosecutor cross_1]
    expect(result.current.messages).toHaveLength(3)
    expect(result.current.messages[1].role).toBe('defense')
    expect(result.current.messages[2].role).toBe('prosecutor')
    expect(result.current.messages[2].phase).toBe(PHASES.CROSS_1)
  })

  it('phase advances correctly through all CROSS rounds', async () => {
    const { result } = renderHook(() => useTrial())

    mockProsecutorResponse('Opening.')
    await act(async () => { await result.current.startTrial('Test charge') })

    const transitions = [
      { from: PHASES.OPENING, to: PHASES.CROSS_1, round: 1 },
      { from: PHASES.CROSS_1, to: PHASES.CROSS_2, round: 2 },
      { from: PHASES.CROSS_2, to: PHASES.CROSS_3, round: 3 },
    ]

    for (const { to, round } of transitions) {
      mockProsecutorResponse(`Response for ${to}`)
      await act(async () => { await result.current.submitDefense('Defense argument') })
      expect(result.current.phase).toBe(to)
      expect(result.current.round).toBe(round)
    }
  })

  it('CLOSING → VERDICT calls judge and dispatches VERDICT_RECEIVED', async () => {
    const { result } = renderHook(() => useTrial())

    // OPENING → CROSS_1 → CROSS_2 → CROSS_3 → CLOSING (4 submits with prosecutor responses)
    mockProsecutorResponse('Opening.')
    await act(async () => { await result.current.startTrial('Test') })
    for (let i = 0; i < 4; i++) {
      mockProsecutorResponse(`Response ${i + 1}`)
      await act(async () => { await result.current.submitDefense('defense') })
    }
    expect(result.current.phase).toBe(PHASES.CLOSING)

    // CLOSING → VERDICT: judge call, no prosecutor response needed
    mockJudgeResponse(false)
    await act(async () => { await result.current.submitDefense('Closing argument') })

    expect(result.current.phase).toBe(PHASES.VERDICT)
    expect(result.current.verdict).toBeTruthy()
    expect(result.current.scores).toEqual({ strength: 7, evidence: 7, logic: 7, persuasion: 7 })
  })

  it('API error sets error state and does not crash', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    const { result } = renderHook(() => useTrial())

    await act(async () => { await result.current.startTrial('Test') })

    expect(result.current.error).toBeTruthy()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.phase).toBe(PHASES.OPENING) // phase still advances (START_TRIAL dispatched)
  })

  it('resetTrial returns to initial state', async () => {
    mockProsecutorResponse('Opening.')
    const { result } = renderHook(() => useTrial())
    await act(async () => { await result.current.startTrial('Test') })

    act(() => { result.current.resetTrial() })

    expect(result.current.phase).toBe(PHASES.SETUP)
    expect(result.current.messages).toHaveLength(0)
    expect(result.current.accusation).toBeNull()
  })
})

// ── API routing: correct endpoint called per phase ────────────────────────────

describe('API routing', () => {
  beforeEach(() => mockFetch.mockReset())

  it('startTrial calls /api/prosecutor', async () => {
    mockProsecutorResponse()
    const { result } = renderHook(() => useTrial())
    await act(async () => { await result.current.startTrial('Test') })

    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/prosecutor')
    const body = JSON.parse(opts.body)
    expect(body.phase).toBe(PHASES.OPENING)
    expect(body.accusation).toBe('Test')
  })

  it('submitDefense at CLOSING calls /api/judge', async () => {
    const { result } = renderHook(() => useTrial())

    // Need 4 submits to reach CLOSING, then 1 more for VERDICT
    mockProsecutorResponse()
    await act(async () => { await result.current.startTrial('Test') })
    for (let i = 0; i < 4; i++) {
      mockProsecutorResponse()
      await act(async () => { await result.current.submitDefense('x') })
    }
    expect(result.current.phase).toBe(PHASES.CLOSING)

    mockJudgeResponse()
    await act(async () => { await result.current.submitDefense('Closing') })

    const judgeCall = mockFetch.mock.calls.find(([url]) => url === '/api/judge')
    expect(judgeCall).toBeTruthy()
    expect(JSON.parse(judgeCall[1].body).accusation).toBe('Test')
  })

  it('correct round is sent to /api/prosecutor after OPENING → CROSS_1', async () => {
    const { result } = renderHook(() => useTrial())

    mockProsecutorResponse('Opening.')
    await act(async () => { await result.current.startTrial('Test') })

    mockProsecutorResponse('Cross 1.')
    await act(async () => { await result.current.submitDefense('defense') })

    // Second prosecutor call should have phase CROSS_1
    const cross1Call = mockFetch.mock.calls[1]
    const body = JSON.parse(cross1Call[1].body)
    expect(body.phase).toBe(PHASES.CROSS_1)
  })
})

// ── cases.js sanity ───────────────────────────────────────────────────────────

import CASES from '../../src/constants/cases.js'

describe('Cases data', () => {
  it('has at least one case', () => {
    expect(CASES.length).toBeGreaterThan(0)
  })

  it('every case has id, title, and accusation', () => {
    for (const c of CASES) {
      expect(c).toHaveProperty('id')
      expect(c).toHaveProperty('title')
      expect(c).toHaveProperty('accusation')
      expect(typeof c.accusation).toBe('string')
      expect(c.accusation.length).toBeGreaterThan(10)
    }
  })

  it('all case IDs are unique', () => {
    const ids = CASES.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
