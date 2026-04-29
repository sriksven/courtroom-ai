/**
 * Returns a plain-language description of what the Prosecutor has been targeting.
 * Used by the Defense Assistant to suggest counter-strategies.
 * Pure in-memory read.
 */
export function getProsecutorStrategy(memory) {
  return {
    currentStrategy: memory.prosecutorMemory.attackStrategy,
    exploitedWeaknesses: memory.prosecutorMemory.exploitedWeaknesses,
    defensePatterns: memory.prosecutorMemory.defensePatterns,
  }
}
