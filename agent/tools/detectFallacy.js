import { groqJSON } from '../llm/groqClient.js'

/**
 * Detects logical fallacies in a statement.
 * Quick Groq call — used post-analysis by the prosecutor to call out fallacies
 * and by the judge to accumulate the fallacy list.
 */
export async function detectFallacy(statement) {
  try {
    const result = await groqJSON({
      messages: [
        {
          role: 'system',
          content: 'You are a logic expert. Check if this statement contains a logical fallacy. If yes, identify it. Return JSON: {"fallacy": "name or null", "explanation": "brief explanation or null"}. Be strict — only flag clear fallacies.',
        },
        { role: 'user', content: statement },
      ],
      maxTokens: 150,
    })
    return {
      fallacy: result.fallacy ?? null,
      explanation: result.explanation ?? null,
    }
  } catch {
    return { fallacy: null, explanation: null }
  }
}
