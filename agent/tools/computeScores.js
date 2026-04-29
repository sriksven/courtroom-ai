// Weighted average: closing (last round) counts 40%, earlier rounds split the rest.
// Round 1: 15%, Round 2: 20%, Round 3: 25%, Closing: 40%
const WEIGHTS = [0.15, 0.20, 0.25, 0.40]

function weightedAvg(values) {
  if (values.length === 0) return 5
  const weights = WEIGHTS.slice(-values.length)
  const total = weights.reduce((a, b) => a + b, 0)
  const sum = values.reduce((acc, v, i) => acc + v * weights[i], 0)
  return Math.round((sum / total) * 10) / 10
}

/**
 * Computes final per-dimension scores from running per-round scores.
 * Pure in-memory calculation — no LLM call.
 */
export function computeScores(memory) {
  const { strength, evidence, logic, persuasion } = memory.judgeMemory.runningScores

  return {
    strength: Math.round(weightedAvg(strength)),
    evidence: Math.round(weightedAvg(evidence)),
    logic: Math.round(weightedAvg(logic)),
    persuasion: Math.round(weightedAvg(persuasion)),
  }
}
