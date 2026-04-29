/**
 * Deduplicates and formats the accumulated fallacy list from judgeMemory.
 * Pure in-memory read — no LLM call.
 */
export function tallyFallacies(memory) {
  const seen = new Set()
  const deduped = []

  for (const f of memory.judgeMemory.fallaciesDetected) {
    const key = `${f.fallacy}-${f.who}-${f.round}`
    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(f)
    }
  }

  // Format for inclusion in judge prompt and final verdict
  return deduped.map(f =>
    `${f.fallacy} — ${f.who.toUpperCase()} in Round ${f.round}: ${f.description}`
  )
}
