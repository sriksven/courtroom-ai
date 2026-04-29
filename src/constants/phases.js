export const PHASES = {
  SETUP: 'SETUP',
  OPENING: 'OPENING',
  CROSS_1: 'CROSS_1',
  CROSS_2: 'CROSS_2',
  CROSS_3: 'CROSS_3',
  CLOSING: 'CLOSING',
  VERDICT: 'VERDICT',
}

export const PHASE_LABELS = {
  SETUP: 'Case Selection',
  OPENING: 'Opening Statement',
  CROSS_1: 'Cross-Examination — Round 1',
  CROSS_2: 'Cross-Examination — Round 2',
  CROSS_3: 'Cross-Examination — Round 3',
  CLOSING: 'Closing Arguments',
  VERDICT: 'Verdict',
}

export const PHASE_ORDER = [
  PHASES.SETUP,
  PHASES.OPENING,
  PHASES.CROSS_1,
  PHASES.CROSS_2,
  PHASES.CROSS_3,
  PHASES.CLOSING,
  PHASES.VERDICT,
]

export const CROSS_PHASES = [PHASES.CROSS_1, PHASES.CROSS_2, PHASES.CROSS_3]

export function getRoundNumber(phase) {
  const crossMap = { CROSS_1: 1, CROSS_2: 2, CROSS_3: 3 }
  return crossMap[phase] ?? null
}

export function getNextPhase(currentPhase) {
  const idx = PHASE_ORDER.indexOf(currentPhase)
  if (idx === -1 || idx === PHASE_ORDER.length - 1) return null
  return PHASE_ORDER[idx + 1]
}
