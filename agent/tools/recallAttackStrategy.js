/**
 * Returns current attack strategy and exploited weaknesses.
 * Pure in-memory read — no LLM call.
 */
export function recallAttackStrategy(memory) {
  return {
    strategy: memory.prosecutorMemory.attackStrategy,
    exploitedWeaknesses: memory.prosecutorMemory.exploitedWeaknesses,
    defensePatterns: memory.prosecutorMemory.defensePatterns,
  }
}
