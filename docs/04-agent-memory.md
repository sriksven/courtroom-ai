# Agent Memory System

## Overview

Each trial gets its own `TrialMemory` object, created at `startTrial()` and keyed by a `uuid` (`trialId`). Memory is held in a `Map<trialId, TrialMemory>` in the agent process. It lives for the duration of the trial plus 10 minutes, then is automatically cleaned up.

The memory system exists to solve one problem: **a prosecutor that remembers what it said and what you said.**

Without memory, the prosecutor in round 3 has no idea what happened in rounds 1 and 2. It would repeat evidence, re-open closed arguments, and never escalate. With memory, each round the prosecutor knows exactly what it has already tried, what worked, and what it should try next.

---

## Memory Schema

```js
{
  trialId: string,         // uuid
  accusation: string,      // the charge
  startedAt: number,       // Date.now()

  prosecutorMemory: {
    usedEvidence: [],          // evidence types already cited (no repeats)
    exploitedWeaknesses: [],   // specific logical gaps already attacked
    defensePatterns: [],       // patterns in user's arguing style
    attackStrategy: string,    // current strategy, updated each round
    openingStatement: string,  // stored for context in later rounds
  },

  judgeMemory: {
    runningScores: {
      strength:   [],    // per-round scores, averaged at verdict
      evidence:   [],
      logic:      [],
      persuasion: [],
    },
    fallaciesDetected: [],   // { fallacy, who, round, description }
    notableArguments: [],    // strong defense points noted
    roundSummaries: [],      // one-sentence summary per round
  },

  defenseMemory: {
    argumentsUsed: [],       // brief descriptions of all defense arguments
    effectiveArguments: [],  // arguments that showed strength
    weakArguments: [],       // arguments that exposed gaps
    suggestionsGiven: [],    // hints already given (for deduplication)
    userStyle: null,         // 'emotional' | 'logical' | 'evidence-based' | 'humorous'
  },

  fullTranscript: [],    // { role, content, phase, round, timestamp }
}
```

---

## Memory Store

```
agent/memory/memoryStore.js
```

An in-process `Map`. Simple by design — trials are 4 minutes long, no persistence needed.

```js
const store = new Map()
const cleanupTimers = new Map()

setMemory(trialId, memory)    // write
getMemory(trialId)            // read → TrialMemory | null
deleteMemory(trialId)         // cleanup
scheduleCleanup(trialId, 10min) // auto-delete 10min after verdict
```

**Why in-process instead of a database?** Trials are short-lived (4 minutes) and session-scoped. A database would add network latency to every tool call, cost money per read/write, and require infrastructure setup with no benefit for this use case.

---

## Memory Helpers

```
agent/memory/memoryHelpers.js
```

All memory writes go through typed helper functions. Agents never mutate memory objects directly.

```js
// Transcript
addTranscriptMessage(memory, role, content, phase, round)

// Judge memory
addRoundScore(memory, { strength, evidence, logic, persuasion })
addFallacy(memory, fallacy, who, round, description)
addRoundSummary(memory, summary)

// Prosecutor memory
recordEvidenceUsed(memory, evidenceType)       // deduplicates
recordWeaknessExploited(memory, description)
updateAttackStrategy(memory, strategy)
addDefensePattern(memory, pattern)             // deduplicates
setOpeningStatement(memory, text)

// Defense memory
recordDefenseArgument(memory, argument, effectiveness) // 'effective' | 'weak' | 'neutral'
recordSuggestionGiven(memory, suggestion)
updateUserStyle(memory, style)
```

---

## How Memory Flows Through a Trial

### Round 1 (Opening)

1. `runProsecutorAgent` called, memory is fresh
2. `recallAttackStrategy` returns default: `"Establish the facts and build initial pressure."`
3. `getUnusedEvidence` returns all evidence types (nothing used yet)
4. Prosecutor generates opening statement
5. **Write back**: `setOpeningStatement`, `recordEvidenceUsed('forensic analysis')`, `addRoundSummary('Opening statements delivered.')`

### Round 2 (Cross 1)

1. Defense submitted a response
2. `recallWeaknesses(defenseText)` — Groq identifies gaps in the defense argument
3. `detectFallacy(defenseText)` — Groq checks if defense committed a logical fallacy
4. `recallAttackStrategy` — reads current strategy string (still default after round 1)
5. Prosecutor generates cross-examination, using weakness analysis as attack vector
6. **Write back**:
   - if fallacy detected: `addFallacy(judgeMemory, ...)`
   - `recordDefenseArgument(arg, effectiveness)`
   - `groqJSON` strategy update → `recordEvidenceUsed(type)`, `recordWeaknessExploited(weakness)`, `updateAttackStrategy(newStrategy)`, `addDefensePattern(pattern)`
   - `addRoundSummary(summary)`

### Round 3 (Cross 2)

- `recallAttackStrategy` now returns the *updated* strategy from round 2
- `getUnusedEvidence` now excludes evidence types already cited in rounds 1-2
- `recallWeaknesses` can identify patterns across rounds because `defensePatterns` is populated
- Prosecutor adapts to the user's accumulated arguing style

### Verdict

1. `tallyFallacies(memory)` — returns all `judgeMemory.fallaciesDetected` entries
2. `computeScores(memory)` — averages `judgeMemory.runningScores` arrays
3. GPT-4o receives: accusation + full transcript + tool results → structured verdict

---

## The 10 Prosecutor Tools

These are called deterministically before prompt assembly — not as part of an LLM-driven function-calling loop. The results are injected into the prompt as context.

| Tool | Type | What It Does |
|---|---|---|
| `recallWeaknesses` | Groq call | Analyzes the defense text and identifies specific logical vulnerabilities |
| `detectFallacy` | Groq call | Classifies whether the defense text commits a named logical fallacy |
| `recallAttackStrategy` | Pure memory read | Returns the current attack strategy string |
| `getUnusedEvidence` | Pure memory read | Returns evidence types not yet cited in this trial |
| `recallUserStyle` | Groq call | Classifies the user's arguing style from their argument history |
| `getProsecutorStrategy` | Pure memory read | Returns strategy + used evidence + exploited weaknesses for defense assistant |
| `getUnusedArgumentTypes` | Pure memory computation | Computes which of 6 argument types (emotional, evidence-based, logical, humor, narrative, technical) haven't been used |
| `tallyFallacies` | Pure memory read | Returns all detected fallacies for judge |
| `computeScores` | Pure memory computation | Averages running score arrays into final dimension scores |
| `checkVerdictConsistency` | Pure computation | Checks if a guilty/not-guilty verdict is consistent with the score total |

---

## Memory Lifecycle

```
startTrial(accusation)
  → trialIdRef.current = uuidv4()
  → orchestrator.initTrial(trialId, accusation)
  → createTrialMemory(trialId, accusation)
  → setMemory(trialId, memory)
       │
       │ (trial progresses, memory updated each round)
       │
submitDefense (CLOSING)
  → orchestrator.handleClosingSubmitted()
  → runJudgeAgent()
  → scheduleCleanup(trialId, 10min)   ← starts countdown
       │
       │ 10 minutes later
       ▼
deleteMemory(trialId)                 ← Map entry removed, GC can collect
```
