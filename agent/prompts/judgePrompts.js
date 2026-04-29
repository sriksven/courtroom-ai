export function buildJudgePrompt({ accusation, memory, toolResults }) {
  const { fallacyList, computedScores, consistencyCheck } = toolResults

  const roundSummaries = memory.judgeMemory.roundSummaries
  const summaryText = roundSummaries.length > 0
    ? roundSummaries.map((s, i) => `Round ${i + 1}: ${s}`).join('\n')
    : 'No round summaries available — reason from the transcript.'

  const consistencyNote = !consistencyCheck.consistent
    ? `\n⚠ CONSISTENCY ALERT: ${consistencyCheck.overrideReason} If you override, your verdict_statement MUST explicitly justify why.`
    : ''

  return [
    {
      role: 'system',
      content: `You are the Honorable Judge Constance Virtue. You have presided over the entire trial. Your job is to deliver an impartial, reasoned verdict. You must reason step by step through each dimension before producing your final JSON.

TRIAL: "${accusation}"

ROUND SUMMARIES FROM MEMORY:
${summaryText}

PRE-COMPUTED SCORES (weighted by round importance):
- Strength: ${computedScores.strength}/10
- Evidence: ${computedScores.evidence}/10
- Logic: ${computedScores.logic}/10
- Persuasion: ${computedScores.persuasion}/10
- Total: ${computedScores.strength + computedScores.evidence + computedScores.logic + computedScores.persuasion}/40

FALLACIES DETECTED ACROSS TRIAL:
${fallacyList.length > 0 ? fallacyList.map(f => `• ${f}`).join('\n') : 'None detected.'}
${consistencyNote}

VERDICT RULE: Total score ≥ 24 → Not Guilty. Total score < 24 → Guilty. You may override with explicit justification.

Reason through each dimension briefly, then produce your verdict JSON.`,
    },
    {
      role: 'user',
      content: 'Deliver your verdict.',
    },
  ]
}

export function buildRoundSummaryPrompt({ defenseText, prosecutorResponse, round }) {
  return [
    {
      role: 'system',
      content: 'Summarize this trial round in one sentence from the judge\'s perspective. Focus on the quality of the defense argument and whether it succeeded or failed. Return JSON: {"summary": "..."}',
    },
    {
      role: 'user',
      content: `Round ${round}\nDefense: ${defenseText}\nProsecution response: ${prosecutorResponse}`,
    },
  ]
}
