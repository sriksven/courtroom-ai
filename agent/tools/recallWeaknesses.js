import { groqJSON } from '../llm/groqClient.js'

/**
 * Analyzes the current defense statement against all previous defense
 * statements stored in memory. Returns logical weaknesses and contradictions.
 * Called deterministically before the prosecutor LLM prompt.
 */
export async function recallWeaknesses(memory, currentDefenseText) {
  const previousArguments = memory.defenseMemory.argumentsUsed

  if (previousArguments.length === 0) {
    // First defense — basic weakness analysis only
    const result = await groqJSON({
      messages: [
        {
          role: 'system',
          content: 'You are a legal analyst. Identify the top 2 logical weaknesses or unsupported claims in this defense statement. Return JSON: {"weaknesses": ["...", "..."]}',
        },
        { role: 'user', content: currentDefenseText },
      ],
      maxTokens: 200,
    })
    return result.weaknesses ?? []
  }

  const result = await groqJSON({
    messages: [
      {
        role: 'system',
        content: 'You are a legal analyst. Given previous defense arguments and a new one, identify: (1) internal contradictions between old and new, (2) unsupported claims, (3) logical gaps. Return JSON: {"weaknesses": ["..."]}',
      },
      {
        role: 'user',
        content: `Previous arguments:\n${previousArguments.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\nNew argument:\n${currentDefenseText}`,
      },
    ],
    maxTokens: 250,
  })
  return result.weaknesses ?? []
}
