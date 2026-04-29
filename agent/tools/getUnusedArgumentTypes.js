const ALL_ARGUMENT_TYPES = [
  { type: 'alibi', description: 'Establish you were somewhere else or had no opportunity' },
  { type: 'intent defense', description: "Argue you had no intention to do wrong — it was accidental or a misunderstanding" },
  { type: 'procedural challenge', description: 'Challenge the legitimacy of how evidence was collected or how this trial is being run' },
  { type: 'witness challenge', description: "Attack the credibility of the prosecution's witnesses or evidence sources" },
  { type: 'evidence challenge', description: "Directly dispute the existence or interpretation of the prosecution's evidence" },
  { type: 'emotional appeal', description: 'Appeal to fairness, compassion, or the absurdity of the situation' },
  { type: 'character evidence', description: 'Argue your general character makes the alleged act implausible' },
  { type: 'comparative argument', description: 'Point out that others do the same thing without consequence' },
  { type: 'technical defense', description: 'Use a technical, definitional, or semantic argument to undermine the charge' },
]

/**
 * Returns argument types the user hasn't tried yet.
 * Pure in-memory calculation.
 */
export function getUnusedArgumentTypes(memory) {
  const used = memory.defenseMemory.argumentsUsed.map(a => a.toLowerCase())

  return ALL_ARGUMENT_TYPES.filter(({ type }) =>
    !used.some(u => u.includes(type.split(' ')[0]))
  )
}
