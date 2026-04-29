# Trial Flows

## Phase State Machine

The trial is a strict linear state machine. Every phase transition is deterministic.

```
SETUP
  │  startTrial(accusation)
  ▼
OPENING          prosecutor delivers opening statement
  │  submitDefense()
  ▼
CROSS_1  round=1  prosecutor cross-examines
  │  submitDefense()
  ▼
CROSS_2  round=2  prosecutor escalates
  │  submitDefense()
  ▼
CROSS_3  round=3  final cross-examination
  │  submitDefense()
  ▼
CLOSING          prosecutor delivers closing; you deliver yours
  │  submitDefense()
  ▼
VERDICT          judge scores and pronounces
```

The phase transition function:

```js
function getNextPhaseFromDefenseSubmit(currentPhase) {
  switch (currentPhase) {
    case PHASES.OPENING:  return { phase: PHASES.CROSS_1, round: 1 }
    case PHASES.CROSS_1:  return { phase: PHASES.CROSS_2, round: 2 }
    case PHASES.CROSS_2:  return { phase: PHASES.CROSS_3, round: 3 }
    case PHASES.CROSS_3:  return { phase: PHASES.CLOSING,  round: 0 }
    case PHASES.CLOSING:  return { phase: PHASES.VERDICT,  round: 0 }
  }
}
```

---

## Flow 1 — Text Mode

The default mode. You type your defense (or use the mic to transcribe speech into the text box).

```
┌─────────────────────────────────────────────────────┐
│  LANDING PAGE                                       │
│  Select charge → choose "Text" mode → Enter         │
└─────────────────────────┬───────────────────────────┘
                          │ startTrial(accusation)
                          ▼
┌─────────────────────────────────────────────────────┐
│  TRIAL PAGE — Text Mode                             │
│                                                     │
│  [Prosecutor bubble]  ▶ (play button)               │
│                                                     │
│  [ textarea: type your defense        ] [🎙]        │
│  💡 Get a Hint                    [Submit Defense]  │
└─────────────────────────┬───────────────────────────┘
                          │ user types + submits
                          ▼
              submitDefense(text)
                          │
              ┌───────────┴───────────┐
              │                       │
         LiveKit?                  HTTP API
         data channel              /api/prosecutor
              │                       │
              └───────────┬───────────┘
                          │ prosecutor response text
                          ▼
              ADD_MESSAGE (prosecutor bubble)
                          │
                          ▼ (repeat until CLOSING)
                          │
              submitDefense (closing argument)
                          │
              ┌───────────┴───────────┐
              │                       │
         LiveKit?                  HTTP API
         closing_submitted         /api/judge
              │                       │
              └───────────┬───────────┘
                          │ verdict JSON
                          ▼
              VERDICT_RECEIVED → navigate to Verdict Page
```

### Mic Button in Text Mode

The mic button in `TrialInputBar` uses `useVoice` for live STT. As you speak:

```
SpeechRecognition.onresult fires for each word chunk
  → accumulate finalTranscript + interim
  → call onTranscript(finalTranscript + interim)
  → textarea updates in real time
```

When you stop speaking, the text stays in the box. You can edit it before submitting.

---

## Flow 2 — Hybrid Auto-Voice Mode

Fully automated browser-side loop. No typing required. Select "Auto Voice" on the landing page.

```
┌────────────────────────────────────┐
│  Enable hybrid voice               │
│  useVoiceMode({ enabled: true })   │
└──────────────┬─────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │  WAITING             │  ← waitForNextMessage() parks here
    │  (new AI msg?)       │     until messages array changes
    └──────────┬───────────┘
               │ unspoken prosecutor/judge message found
               ▼
    ┌──────────────────────┐
    │  SPEAKING            │  POST /api/tts → audio blob → play()
    │  (TTS playing)       │  marks message id as spoken
    └──────────┬───────────┘
               │ audio.onended
               │
               │ phase == VERDICT? → DONE (break loop)
               │
               ▼
    ┌──────────────────────┐
    │  LISTENING           │  SpeechRecognition.start()
    │  (mic active)        │  live interim transcript shown in VoiceStatus
    └──────────┬───────────┘
               │ recognition.onend
               │
               │ transcript empty? → back to LISTENING
               │
               ▼
    ┌──────────────────────┐
    │  PROCESSING          │  submitDefense(transcript)
    │  (submitting)        │
    └──────────┬───────────┘
               │
               └────────────► back to WAITING
```

### State References

The while loop runs async and can't close over React state directly (it would be stale). Instead it uses refs:

```js
messagesRef.current  — updated by useEffect watching messages
phaseRef.current     — updated by useEffect watching phase
submitRef.current    — updated by useEffect watching submitDefense
```

### waitForNextMessage Pattern

```js
function waitForNextMessage() {
  return new Promise((resolve) => {
    const check = () =>
      messagesRef.current.find(
        m => (m.role === 'prosecutor' || m.role === 'judge')
          && !spokenIdsRef.current.has(m.id)
      ) ?? null

    const immediate = check()
    if (immediate) { resolve(immediate); return }

    // Park: store resolver, fired by useEffect when messages change
    newMessageResolverRef.current = () => resolve(check())
  })
}

// useEffect that fires the resolver
useEffect(() => {
  if (newMessageResolverRef.current) {
    newMessageResolverRef.current()
    newMessageResolverRef.current = null
  }
}, [messages])
```

---

## Flow 3 — Full Live Voice Mode

WebRTC via LiveKit. Everything runs server-side. The browser only handles mic input and audio output.

```
┌──────────────────────────────────────────────────┐
│  startSession() called                           │
│  1. POST /api/livekit-token → JWT                │
│  2. room.connect(livekitUrl, token)              │
│  3. createLocalAudioTrack() → publish mic        │
│  4. wait for { type: 'agent_ready' }             │
└──────────────┬───────────────────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │  AGENT_READY         │  send trial_state (accusation, phase, messages)
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │  AGENT_SPEAKING      │  agent TTS audio streams to browser via WebRTC
    │                      │  ActiveSpeakersChanged detects agent speaking
    └──────────┬───────────┘
               │ agent stops speaking
               ▼
    ┌──────────────────────┐
    │  USER_TURN           │  user speaks into mic
    │                      │  audio streams to agent via WebRTC
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │  PROCESSING          │  agent STT → runs prosecutor agent → TTS
    └──────────┬───────────┘
               │
               └────────────► back to AGENT_SPEAKING
```

### Data Messages in Full Voice

The browser and agent exchange data messages alongside the audio stream:

| Direction | Type | Payload |
|---|---|---|
| browser → agent | `trial_state` | `{ phase, round, accusation, messages[] }` |
| agent → browser | `agent_ready` | `{}` |
| agent → browser | `prosecutor_response` | `{ text, phase, round }` |
| agent → browser | `defense_transcribed` | `{}` |
| agent → browser | `verdict` | `{ guilty, verdict_statement, scores, fallacies }` |

---

## Prosecutor Agent Flow (ReAct)

Runs on every defense submission. Three stages: Observe → Act → Write.

```
DEFENSE SUBMITTED
        │
        ▼
┌───────────────────────────────────────────────────┐
│  OBSERVE (parallel tool calls)                    │
│                                                   │
│  recallWeaknesses(defenseText)                    │
│    → Groq: "what logical gaps does this expose?"  │
│                                                   │
│  detectFallacy(defenseText)                       │
│    → Groq: "did they commit a logical fallacy?"   │
│                                                   │
│  recallAttackStrategy(memory)                     │
│    → pure read: current strategy string           │
│                                                   │
│  getUnusedEvidence(memory)                        │
│    → pure read: evidence types not yet cited      │
└───────────────┬───────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────┐
│  ACT                                              │
│                                                   │
│  buildProsecutorPrompt({                          │
│    accusation, phase, memory, toolResults         │
│  })                                               │
│    → system: "You are Reginald..."                │
│    → tool results injected as context             │
│    → full transcript as context                   │
│                                                   │
│  groqChat(messages, maxTokens=220, temp=0.88)     │
│    → response text                                │
└───────────────┬───────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────┐
│  WRITE BACK                                       │
│                                                   │
│  if fallacy detected: addFallacy(judgeMemory)     │
│  recordDefenseArgument(effectiveness)             │
│                                                   │
│  groqJSON(strategyUpdatePrompt)                   │
│    → { evidenceType, weaknessExploited,           │
│        newStrategy, defensePattern }              │
│                                                   │
│  recordEvidenceUsed(evidenceType)                 │
│  recordWeaknessExploited(weakness)                │
│  updateAttackStrategy(newStrategy)                │
│  addDefensePattern(pattern)                       │
│  addRoundSummary(summary)                         │
└───────────────────────────────────────────────────┘
```

---

## Judge Agent Flow (Chain of Thought)

Runs once. Receives the full trial context with accumulated memory.

```
CLOSING ARGUMENT SUBMITTED
        │
        ▼
┌──────────────────────────────────────────────┐
│  PRE-PROMPT TOOLS                            │
│                                              │
│  tallyFallacies(memory)                      │
│    → list all { fallacy, who, round }        │
│                                              │
│  computeScores(memory)                       │
│    → weighted average of runningScores[]     │
│    → { strength, evidence, logic, persuasion }│
│                                              │
│  checkVerdictConsistency(scores, expected)   │
│    → { consistent, total, overrideReason }   │
└───────────────┬──────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────┐
│  GPT-4o with strict JSON schema              │
│                                              │
│  Input: accusation + full transcript         │
│         + tool results injected              │
│                                              │
│  Output (enforced by schema):                │
│  {                                           │
│    guilty: boolean,                          │
│    verdict_statement: string,                │
│    scores: { strength, evidence,             │
│              logic, persuasion },            │
│    fallacies: string[],                      │
│    reasoning: string                         │
│  }                                           │
└───────────────┬──────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────┐
│  POST-HOC VALIDATION                         │
│                                              │
│  checkVerdictConsistency(verdict.scores,     │
│                          verdict.guilty)     │
│  → log warning if inconsistent               │
│  → trust GPT-4o's judgment                   │
│                                              │
│  merge fallacy lists                         │
│  scheduleCleanup(trialId, 10min)             │
└──────────────────────────────────────────────┘
```

---

## Defense Assistant Flow (Hint)

Runs on demand when the user clicks "Get a Hint".

```
HINT REQUESTED
        │
        ▼
┌────────────────────────────────────────────────┐
│  OBSERVE (parallel tool calls)                 │
│                                                │
│  recallUserStyle(memory)                       │
│    → Groq: classify arguing style from history │
│    → 'emotional' | 'logical' |                 │
│       'evidence-based' | 'humorous'            │
│                                                │
│  getProsecutorStrategy(memory)                 │
│    → pure read: current attack strategy string │
│                                                │
│  getUnusedArgumentTypes(memory)                │
│    → compute which of 6 argument types         │
│       haven't been used yet                    │
└───────────────┬────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────┐
│  groqChat(hintPrompt, maxTokens=220, temp=0.75)│
│    → 3 bullet-point tactical hints             │
│    → adapted to user's style                   │
│    → counters prosecutor's current strategy    │
│    → suggests unused argument types            │
│    → never repeats previous hints              │
└───────────────┬────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────┐
│  WRITE BACK                                    │
│                                                │
│  recordSuggestionGiven(hints.slice(0, 100))    │
│  updateUserStyle(userStyle)                    │
└────────────────────────────────────────────────┘
```
