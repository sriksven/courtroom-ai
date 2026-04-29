const PHASE_INSTRUCTIONS = {
  OPENING: 'Deliver a dramatic opening statement. Cite 2-3 invented but plausible pieces of evidence. Establish the narrative of guilt. 3-5 sentences.',
  CROSS_1: 'Cross-examine the defendant. Attack the specific weakness in their argument. Introduce a new witness or forensic finding that undermines their claim. Be relentless. 3-5 sentences.',
  CROSS_2: 'Cross-examine the defendant again. You have them on the defensive — tighten the pressure. Expose a contradiction between their latest statement and an earlier one. 3-5 sentences.',
  CROSS_3: 'Final cross-examination. The jury is watching. Hit the most damaging point you have. Make it land. 3-5 sentences.',
  CLOSING: 'Deliver your closing argument. Summarize your 3 strongest points from the entire trial. Make an emotional appeal. Remind the court why this defendant is guilty. 4-6 sentences.',
}

export function buildProsecutorPrompt({ accusation, phase, memory, toolResults }) {
  const { weaknesses, fallacy, unusedEvidence, attackInfo } = toolResults

  const memorySection = memory.prosecutorMemory.exploitedWeaknesses.length > 0
    ? `\nWHAT YOU KNOW SO FAR:
- Evidence already cited: ${memory.prosecutorMemory.usedEvidence.join(', ') || 'none yet'}
- Weaknesses already exploited: ${memory.prosecutorMemory.exploitedWeaknesses.map((w, i) => `\n  ${i + 1}. ${w}`).join('')}
- Current strategy: ${memory.prosecutorMemory.attackStrategy}
- Defense patterns noticed: ${memory.prosecutorMemory.defensePatterns.join(', ') || 'still observing'}

DO NOT repeat evidence you have already cited.
DO NOT repeat attack angles you have already used.
BUILD on previous rounds — escalate pressure each round.`
    : ''

  const toolSection = `\nTOOL RESULTS FOR THIS ROUND:
- Weaknesses in their argument: ${weaknesses.length > 0 ? weaknesses.map((w, i) => `\n  ${i + 1}. ${w}`).join('') : 'none detected — find your own angle'}
- Fallacy detected: ${fallacy ? `${fallacy.fallacy} — ${fallacy.explanation}` : 'none'}
- Fresh evidence types available: ${unusedEvidence.slice(0, 3).join(', ')}

Use these findings to craft your response. Cite the fallacy by name if one was detected.`

  return [
    {
      role: 'system',
      content: `You are Reginald P. Harrington III, a theatrical courtroom prosecutor. Your sole goal is to prove the defendant guilty of: "${accusation}". You are sharp, relentless, and use invented but plausible evidence. Never break character. Plain text only — no markdown, no lists, no bullet points.${memorySection}`,
    },
    {
      role: 'user',
      content: `Phase: ${PHASE_INSTRUCTIONS[phase] || PHASE_INSTRUCTIONS.CROSS_1}${toolSection}`,
    },
  ]
}

export function buildStrategyUpdatePrompt({ accusation, defenseText, currentRound }) {
  return [
    {
      role: 'system',
      content: 'You are analyzing a courtroom exchange. Return JSON only: {"evidenceType": "category of evidence just used", "weaknessExploited": "one sentence describing the weakness attacked", "newStrategy": "one sentence on what to do next round", "defensePattern": "one phrase describing how this defendant argues (or null if unclear)"}',
    },
    {
      role: 'user',
      content: `Accusation: ${accusation}\nRound: ${currentRound}\nDefense statement: ${defenseText}`,
    },
  ]
}
