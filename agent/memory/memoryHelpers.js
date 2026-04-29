// Typed read/write helpers so agents never touch raw memory objects directly.

export function addTranscriptMessage(memory, role, content, phase, round) {
  memory.fullTranscript.push({ role, content, phase, round, timestamp: Date.now() })
}

export function addRoundScore(memory, scores) {
  const { strength = 5, evidence = 5, logic = 5, persuasion = 5 } = scores
  memory.judgeMemory.runningScores.strength.push(strength)
  memory.judgeMemory.runningScores.evidence.push(evidence)
  memory.judgeMemory.runningScores.logic.push(logic)
  memory.judgeMemory.runningScores.persuasion.push(persuasion)
}

export function addFallacy(memory, fallacy, who, round, description) {
  memory.judgeMemory.fallaciesDetected.push({ fallacy, who, round, description })
}

export function addRoundSummary(memory, summary) {
  memory.judgeMemory.roundSummaries.push(summary)
}

export function recordEvidenceUsed(memory, evidenceType) {
  if (!memory.prosecutorMemory.usedEvidence.includes(evidenceType)) {
    memory.prosecutorMemory.usedEvidence.push(evidenceType)
  }
}

export function recordWeaknessExploited(memory, description) {
  memory.prosecutorMemory.exploitedWeaknesses.push(description)
}

export function updateAttackStrategy(memory, strategy) {
  memory.prosecutorMemory.attackStrategy = strategy
}

export function addDefensePattern(memory, pattern) {
  if (!memory.prosecutorMemory.defensePatterns.includes(pattern)) {
    memory.prosecutorMemory.defensePatterns.push(pattern)
  }
}

export function recordDefenseArgument(memory, argument, effectiveness) {
  memory.defenseMemory.argumentsUsed.push(argument)
  if (effectiveness === 'effective') memory.defenseMemory.effectiveArguments.push(argument)
  if (effectiveness === 'weak') memory.defenseMemory.weakArguments.push(argument)
}

export function recordSuggestionGiven(memory, suggestion) {
  memory.defenseMemory.suggestionsGiven.push(suggestion)
}

export function updateUserStyle(memory, style) {
  memory.defenseMemory.userStyle = style
}

export function setOpeningStatement(memory, text) {
  memory.prosecutorMemory.openingStatement = text
}
