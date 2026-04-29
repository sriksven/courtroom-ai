export function parseJudgeResponse(rawResponse) {
  let cleaned = rawResponse
  // Strip markdown code fences if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

  try {
    const parsed = JSON.parse(cleaned)

    const scores = parsed.scores || {}
    return {
      guilty: parsed.guilty !== undefined ? parsed.guilty : true,
      verdict_statement: parsed.verdict_statement || 'The court has reached a verdict.',
      scores: {
        strength: scores.strength ?? 0,
        evidence: scores.evidence ?? 0,
        logic: scores.logic ?? 0,
        persuasion: scores.persuasion ?? 0,
      },
      fallacies: parsed.fallacies || [],
    }
  } catch {
    return {
      error: true,
      rawResponse,
      guilty: true,
      verdict_statement: 'The court was unable to render a formal verdict.',
      scores: { strength: 0, evidence: 0, logic: 0, persuasion: 0 },
      fallacies: [],
    }
  }
}
