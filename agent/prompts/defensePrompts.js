export function buildDefenseHintPrompt({ accusation, memory, toolResults }) {
  const { userStyle, prosecutorStrategy, unusedArgTypes } = toolResults

  const styleNote = userStyle
    ? `\nThe user argues in an ${userStyle} style. Tailor your suggestions to fit this approach — don't suggest techniques that feel foreign to how they naturally argue.`
    : ''

  const strategyNote = prosecutorStrategy.currentStrategy
    ? `\nThe Prosecutor's current strategy: "${prosecutorStrategy.currentStrategy}". Recent attacks: ${prosecutorStrategy.exploitedWeaknesses.slice(-2).join('; ') || 'none yet'}.`
    : ''

  const unusedNote = unusedArgTypes.length > 0
    ? `\nArgument types not yet tried:\n${unusedArgTypes.slice(0, 4).map(a => `• ${a.type}: ${a.description}`).join('\n')}`
    : ''

  const alreadySuggested = memory.defenseMemory.suggestionsGiven
  const avoidNote = alreadySuggested.length > 0
    ? `\nDO NOT suggest these — already given: ${alreadySuggested.slice(-4).join('; ')}`
    : ''

  return [
    {
      role: 'system',
      content: `You are a sharp legal strategist whispering tactics to the defendant in the case: "${accusation}". Give exactly 3 bullet points (using • character) with specific, actionable defense tactics. Be concrete — name the exact angle to use, not generic advice.${styleNote}${strategyNote}${unusedNote}${avoidNote}

No preamble. No headers. Just the 3 bullets.`,
    },
    {
      role: 'user',
      content: 'Give me my next move.',
    },
  ]
}
