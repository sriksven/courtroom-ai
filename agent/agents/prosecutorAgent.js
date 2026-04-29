import { groqChat, groqJSON } from '../llm/groqClient.js'
import { buildProsecutorPrompt, buildStrategyUpdatePrompt } from '../prompts/prosecutorPrompts.js'
import { recallWeaknesses } from '../tools/recallWeaknesses.js'
import { getUnusedEvidence } from '../tools/getUnusedEvidence.js'
import { detectFallacy } from '../tools/detectFallacy.js'
import { recallAttackStrategy } from '../tools/recallAttackStrategy.js'
import {
  recordEvidenceUsed,
  recordWeaknessExploited,
  updateAttackStrategy,
  addDefensePattern,
  addFallacy,
  addRoundSummary,
  recordDefenseArgument,
  setOpeningStatement,
} from '../memory/memoryHelpers.js'

/**
 * Prosecutor Agent — ReAct loop
 *
 * Reason → gather tool results → generate response → write back to memory
 */
export async function runProsecutorAgent({ memory, defenseText, phase, round }) {
  // ── OBSERVE: gather all tool results deterministically ──────────────────
  const [weaknesses, fallacyResult, attackInfo] = await Promise.all([
    recallWeaknesses(memory, defenseText),
    defenseText ? detectFallacy(defenseText) : Promise.resolve({ fallacy: null, explanation: null }),
    Promise.resolve(recallAttackStrategy(memory)),
  ])
  const unusedEvidence = getUnusedEvidence(memory)

  const toolResults = { weaknesses, fallacy: fallacyResult, unusedEvidence, attackInfo }

  // ── ACT: generate prosecutor response ────────────────────────────────────
  const messages = buildProsecutorPrompt({ accusation: memory.accusation, phase, memory, toolResults })
  const responseText = await groqChat({ messages, maxTokens: 220, temperature: 0.88 })

  // ── WRITE BACK: update memory with what happened this round ──────────────

  // Record fallacy in judge memory if detected
  if (fallacyResult.fallacy && defenseText) {
    addFallacy(memory, fallacyResult.fallacy, 'defense', round, fallacyResult.explanation)
  }

  // Record the defense argument and classify effectiveness
  if (defenseText) {
    const effectiveness = weaknesses.length >= 2 ? 'weak' : weaknesses.length === 0 ? 'effective' : 'neutral'
    recordDefenseArgument(memory, defenseText.slice(0, 80), effectiveness)
  }

  // Update prosecutor strategy state via a quick analysis call
  if (defenseText && phase !== 'OPENING') {
    try {
      const strategyMessages = buildStrategyUpdatePrompt({ accusation: memory.accusation, defenseText, currentRound: round })
      const update = await groqJSON({ messages: strategyMessages, maxTokens: 200 })
      if (update.evidenceType) recordEvidenceUsed(memory, update.evidenceType)
      if (update.weaknessExploited) recordWeaknessExploited(memory, `Round ${round}: ${update.weaknessExploited}`)
      if (update.newStrategy) updateAttackStrategy(memory, update.newStrategy)
      if (update.defensePattern) addDefensePattern(memory, update.defensePattern)

      // Write round summary to judge memory
      addRoundSummary(memory, update.weaknessExploited
        ? `Round ${round}: Defense argued ${defenseText.slice(0, 60)}… Prosecutor countered by exploiting: ${update.weaknessExploited}`
        : `Round ${round}: Exchange completed.`
      )
    } catch {
      // Non-critical — continue without memory update
      addRoundSummary(memory, `Round ${round}: Exchange completed.`)
    }
  }

  if (phase === 'OPENING') {
    setOpeningStatement(memory, responseText)
    // Mark forensic as used for opening (prosecutor always uses it)
    recordEvidenceUsed(memory, 'forensic analysis')
    addRoundSummary(memory, 'Opening statements delivered.')
  }

  return responseText
}
