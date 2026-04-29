import { openaiVerdict } from '../llm/openaiClient.js'
import { buildJudgePrompt } from '../prompts/judgePrompts.js'
import { tallyFallacies } from '../tools/tallyFallacies.js'
import { computeScores } from '../tools/computeScores.js'
import { checkVerdictConsistency } from '../tools/checkVerdictConsistency.js'

/**
 * Judge Agent — chain-of-thought + tools → structured JSON verdict
 *
 * Runs once at end of trial with full memory context.
 * Tools are called before prompt assembly (deterministic pre-prompt pattern).
 * check_verdict_consistency is called post-hoc to validate.
 */
export async function runJudgeAgent({ memory }) {
  // ── GATHER TOOL RESULTS ──────────────────────────────────────────────────
  const fallacyList = tallyFallacies(memory)
  const computedScores = computeScores(memory)

  // Pre-compute consistency check with expected guilty based on scores
  const total = computedScores.strength + computedScores.evidence + computedScores.logic + computedScores.persuasion
  const expectedGuilty = total < 24
  const consistencyCheck = checkVerdictConsistency(computedScores, expectedGuilty)

  const toolResults = { fallacyList, computedScores, consistencyCheck }

  // ── GENERATE VERDICT (chain-of-thought inside GPT-4o) ────────────────────
  const messages = buildJudgePrompt({ accusation: memory.accusation, memory, toolResults })
  const verdict = await openaiVerdict({ messages })

  // ── POST-HOC VALIDATION ──────────────────────────────────────────────────
  const finalCheck = checkVerdictConsistency(verdict.scores, verdict.guilty)
  if (!finalCheck.consistent) {
    console.warn(`[judgeAgent] Verdict inconsistency: ${finalCheck.overrideReason}`)
    // Trust GPT-4o's judgment — it had the consistency note in the prompt
  }

  // Merge the pre-accumulated fallacy list with any the judge added
  const allFallacies = [
    ...fallacyList,
    ...(verdict.fallacies ?? []).filter(f => !fallacyList.some(existing => existing.includes(f.split('—')[0].trim()))),
  ]

  return {
    ...verdict,
    fallacies: allFallacies,
    scores: verdict.scores,
  }
}
