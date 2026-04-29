const ALL_EVIDENCE_TYPES = [
  'forensic analysis',
  'eyewitness testimony',
  'documentary evidence',
  'circumstantial evidence',
  'expert opinion',
  'digital/electronic evidence',
  'physical evidence',
  'character witness',
]

/**
 * Returns evidence types not yet deployed by the prosecutor.
 * Pure in-memory lookup — no LLM call.
 */
export function getUnusedEvidence(memory) {
  const used = memory.prosecutorMemory.usedEvidence
  return ALL_EVIDENCE_TYPES.filter(t => !used.some(u => u.toLowerCase().includes(t.split(' ')[0].toLowerCase())))
}
