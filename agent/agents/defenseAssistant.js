import { groqChat } from '../llm/groqClient.js'
import { buildDefenseHintPrompt } from '../prompts/defensePrompts.js'
import { recallUserStyle } from '../tools/recallUserStyle.js'
import { getProsecutorStrategy } from '../tools/getProsecutorStrategy.js'
import { getUnusedArgumentTypes } from '../tools/getUnusedArgumentTypes.js'
import { recordSuggestionGiven, updateUserStyle } from '../memory/memoryHelpers.js'

/**
 * Defense Assistant Agent — only runs when user explicitly requests a hint.
 *
 * Adapts to: user's arguing style, prosecutor's current strategy,
 * which argument types haven't been tried yet.
 * Never repeats suggestions.
 */
export async function runDefenseAssistant({ memory }) {
  // ── GATHER TOOL RESULTS ──────────────────────────────────────────────────
  const [userStyle, prosecutorStrategy, unusedArgTypes] = await Promise.all([
    recallUserStyle(memory),
    Promise.resolve(getProsecutorStrategy(memory)),
    Promise.resolve(getUnusedArgumentTypes(memory)),
  ])

  const toolResults = { userStyle, prosecutorStrategy, unusedArgTypes }

  // ── GENERATE HINTS ────────────────────────────────────────────────────────
  const messages = buildDefenseHintPrompt({ accusation: memory.accusation, memory, toolResults })
  const hints = await groqChat({ messages, maxTokens: 220, temperature: 0.75 })

  // ── WRITE BACK ────────────────────────────────────────────────────────────
  recordSuggestionGiven(memory, hints.slice(0, 100))
  if (userStyle && !memory.defenseMemory.userStyle) {
    updateUserStyle(memory, userStyle)
  }

  return hints
}
