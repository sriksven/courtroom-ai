/**
 * Post-hoc validation: checks that the guilty boolean is consistent with
 * the computed scores. If the judge overrides, the verdict_statement must
 * explain why. Called after the LLM generates the verdict.
 */
export function checkVerdictConsistency(scores, guilty) {
  const total = scores.strength + scores.evidence + scores.logic + scores.persuasion
  const scoreBasedVerdict = total < 24 // below 24 → guilty

  const consistent = scoreBasedVerdict === guilty

  return {
    total,
    scoreBasedVerdict,
    consistent,
    overrideReason: consistent ? null : `Score total is ${total}/40 (threshold: 24), but guilty=${guilty}. Verdict statement must justify this override.`,
  }
}
