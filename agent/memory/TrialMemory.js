export function createTrialMemory(trialId, accusation) {
  return {
    trialId,
    accusation,
    startedAt: Date.now(),

    prosecutorMemory: {
      usedEvidence: [],          // evidence types already cited
      exploitedWeaknesses: [],   // specific logical gaps already attacked
      defensePatterns: [],       // patterns in user's argumentation style
      attackStrategy: 'Establish the facts and build initial pressure.',
      openingStatement: '',
    },

    judgeMemory: {
      runningScores: {
        strength: [],
        evidence: [],
        logic: [],
        persuasion: [],
      },
      fallaciesDetected: [],      // { fallacy, who, round, description }
      notableArguments: [],       // strong defense points
      roundSummaries: [],         // one-sentence summary per round
    },

    defenseMemory: {
      argumentsUsed: [],
      effectiveArguments: [],
      weakArguments: [],
      suggestionsGiven: [],
      userStyle: null,            // 'emotional' | 'logical' | 'evidence-based' | 'humorous' | null
    },

    fullTranscript: [],           // { role, content, phase, round, timestamp }
  }
}
