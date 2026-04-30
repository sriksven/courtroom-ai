export const PHASES = {
  SETUP: 'SETUP',
  OPENING: 'OPENING',
  CROSS_1: 'CROSS_1',
  CROSS_2: 'CROSS_2',
  CROSS_3: 'CROSS_3',
  CLOSING: 'CLOSING',
  VERDICT: 'VERDICT',
}

export const DEFAULT_ROUNDS = 3
export const MIN_ROUNDS = 1
export const MAX_ROUNDS = 5
export const DYNAMIC_HARD_CAP = 6

export function buildPhaseOrder(rounds) {
  const crossPhases = Array.from({ length: rounds }, (_, i) => `CROSS_${i + 1}`)
  return ['SETUP', 'OPENING', ...crossPhases, 'CLOSING', 'VERDICT']
}

export function buildPhaseTransitions(rounds) {
  const map = {}
  map['OPENING'] = { phase: 'CROSS_1', round: 1 }
  for (let i = 1; i < rounds; i++) {
    map[`CROSS_${i}`] = { phase: `CROSS_${i + 1}`, round: i + 1 }
  }
  map[`CROSS_${rounds}`] = { phase: 'CLOSING', round: 0 }
  map['CLOSING'] = { phase: 'VERDICT', round: 0 }
  return map
}

export function getProgress(phase, phaseOrder) {
  const idx = phaseOrder.indexOf(phase)
  if (idx <= 0) return 0
  return Math.round((idx / (phaseOrder.length - 1)) * 100)
}

export function getPhaseLabelDynamic(phase, round) {
  if (phase === 'OPENING') return 'Opening Statement'
  if (phase === 'CLOSING') return 'Closing Arguments'
  if (phase === 'VERDICT') return 'Verdict'
  if (phase === 'SETUP') return 'Case Selection'
  if (phase.startsWith('CROSS_')) return `Cross-Examination - Round ${round}`
  return phase
}

// Legacy constants - kept for backward compat with existing tests
export const PHASE_LABELS = {
  SETUP: 'Case Selection',
  OPENING: 'Opening Statement',
  CROSS_1: 'Cross-Examination - Round 1',
  CROSS_2: 'Cross-Examination - Round 2',
  CROSS_3: 'Cross-Examination - Round 3',
  CLOSING: 'Closing Arguments',
  VERDICT: 'Verdict',
}

export const PHASE_ORDER = buildPhaseOrder(DEFAULT_ROUNDS)

export const CROSS_PHASES = [PHASES.CROSS_1, PHASES.CROSS_2, PHASES.CROSS_3]

export function getRoundNumber(phase) {
  const match = phase?.match(/^CROSS_(\d+)$/)
  return match ? parseInt(match[1], 10) : null
}

export function getNextPhase(currentPhase) {
  const idx = PHASE_ORDER.indexOf(currentPhase)
  if (idx === -1 || idx === PHASE_ORDER.length - 1) return null
  return PHASE_ORDER[idx + 1]
}
