import { groqJSON } from '../llm/groqClient.js'

/**
 * Returns the user's argumentation style, classifying it if not yet known.
 */
export async function recallUserStyle(memory) {
  if (memory.defenseMemory.userStyle) {
    return memory.defenseMemory.userStyle
  }

  const args = memory.defenseMemory.argumentsUsed
  if (args.length === 0) return null

  try {
    const result = await groqJSON({
      messages: [
        {
          role: 'system',
          content: 'Classify the argumentation style of these defense statements. Options: "emotional" (appeals to feelings/fairness), "logical" (structured reasoning), "evidence-based" (cites facts/examples), "humorous" (jokes/absurdism). Return JSON: {"style": "..."}',
        },
        { role: 'user', content: args.join('\n\n') },
      ],
      maxTokens: 50,
    })
    return result.style ?? 'logical'
  } catch {
    return 'logical'
  }
}
