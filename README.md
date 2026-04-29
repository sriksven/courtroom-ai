# ⚖ All Rise — AI Courtroom Simulation

> **Hackathon Submission** — An AI-powered courtroom where you defend yourself against absurd charges before three independent AI agents, in real time, with your voice or your keyboard.

[![Tests](https://img.shields.io/badge/tests-79%20passing-brightgreen)](tests/)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev)
[![Groq](https://img.shields.io/badge/Groq-llama--3.3--70b-orange)](https://groq.com)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o%20%2B%20TTS-412991)](https://openai.com)
[![LiveKit](https://img.shields.io/badge/LiveKit-WebRTC-red)](https://livekit.io)

---

## The Problem

Most AI applications let you talk *to* a single model. You ask, it answers. The interaction is flat — cooperative, deferential, predictable.

Real argument is adversarial. You need to think on your feet, defend a position under pressure, respond to counterevidence, and stay persuasive as the stakes escalate. No single-model chatbot replicates that.

**All Rise** is built around a different premise: what if AI argued *against* you?

---

## What It Is

All Rise is a fully realized courtroom simulation. You are the defendant. The charge is absurd. You must defend yourself across five structured trial phases — opening, three rounds of cross-examination, and a closing argument — while:

- A **theatrical prosecutor** invents evidence, exploits your logical gaps, and escalates pressure each round
- A **defense strategist** whispers tactical hints if you ask, without playing the trial for you
- A **silent judge** watches the entire trial, then delivers a scored verdict with full reasoning

The trial takes approximately 4 minutes. There is no guaranteed outcome. You can lose.

---

## Themes Addressed

| Theme | How |
|---|---|
| **Multi-agent AI** | Three independent agents with different models, memory, and goals operate on the same trial transcript |
| **Real-time voice AI** | Three interaction modes: text, browser-side auto-voice loop, and full WebRTC live voice via LiveKit |
| **AI reasoning under constraint** | Prosecutor uses a ReAct loop with 10 deterministic tools; Judge uses chain-of-thought with GPT-4o structured JSON output |
| **Human–AI adversarial interaction** | Core mechanic is arguing against an AI that is explicitly trying to defeat you |

---

## Approach & Development

### The Core Challenge

The first design decision was: how do you make an AI adversary that *feels* like it's actually tracking the argument? A naive implementation — same system prompt every round — produces a prosecutor that forgets what happened two rounds ago and repeats itself. That breaks the simulation.

The solution is per-trial **agent memory**:

- The prosecutor writes to memory after every round: what evidence it used, what weakness it exploited, what it thinks the user's rhetorical pattern is
- The judge accumulates round scores and fallacy detections across the whole trial
- The defense assistant reads the user's style and tracks which hint types it has already given, so it never repeats

All memory lives in a `Map<trialId, TrialMemory>` in the agent process. Trials are scoped by a `uuid` generated at `startTrial()` and passed with every message.

### The Prosecutor Agent — ReAct Loop

Every round:

```
OBSERVE  → recallWeaknesses(defenseText)     [Groq: what gaps did the user expose?]
           detectFallacy(defenseText)          [Groq: did the user commit a logical fallacy?]
           recallAttackStrategy(memory)        [pure read: current strategy string]
           getUnusedEvidence(memory)           [pure read: evidence types not yet cited]

ACT      → groqChat(prompt + tool results)    [llama-3.3-70b generates response]

WRITE    → recordEvidenceUsed                 [update memory]
           updateAttackStrategy               [Groq analyzes exchange, writes new strategy]
           addFallacy to judgeMemory           [if detected]
           addRoundSummary                     [one-sentence round log]
```

This means the prosecutor in round 3 knows what arguments the user made in rounds 1 and 2, which evidence has already been deployed, and what the user's rhetorical tendencies are.

### The Judge Agent — Chain of Thought

Runs once at verdict. Uses GPT-4o (not Groq) for higher-quality structured output:

```
tallyFallacies(memory)          → list all logged fallacies from all rounds
computeScores(memory)           → weighted average of per-round scores
checkVerdictConsistency(scores) → pre-check: what do the numbers imply?

→ GPT-4o with strict JSON schema: { guilty, verdict_statement, scores, fallacies }

→ post-hoc consistency check against score math
```

Score ≥ 24/40 → Not Guilty. Below 24 → Guilty. The judge can override if the argument was genuinely exceptional in either direction.

### Three Interaction Modes

**Text mode**: type your defense, optional mic button fills the textarea with live STT as you speak.

**Hybrid auto-voice**: a `while` loop that runs until verdict — speak the prosecution message via TTS, auto-activate mic, listen with live interim transcript, submit when speech ends. Built entirely in the browser with Web Speech API.

**Full live voice (Flow 2)**: WebRTC via LiveKit. Browser publishes mic audio to a room. The server-side voice agent handles STT, sends defense to the prosecutor agent, and TTS the response back. The browser is just a thin client.

---

## Architecture

```
Browser (React 18 + Vite)
│
├── LandingPage       — case selection + mode picker (text / auto-voice)
├── TrialPage         — phase nav, chat, voice status
│   ├── useVoiceMode  — hybrid browser voice loop (while loop + Web Speech API)
│   └── useVoicePipeline — LiveKit WebRTC session management
├── TrialChatArea     — per-bubble TTS play/pause/stop via OpenAI TTS
└── VerdictPage       — animated scored verdict
          │
          │  HTTP /api/*  (dev: Express on 3001; prod: Vercel serverless)
          │  LiveKit data channel (when agent running)
          ▼
API Layer (Express / Vercel Functions)
│
├── /api/prosecutor   — Groq llama-3.3-70b (stateless fallback)
├── /api/judge        — Groq llama-3.3-70b (stateless fallback)
├── /api/defense-hint — Groq llama-3.3-70b (stateless fallback)
├── /api/tts          — OpenAI tts-1-hd (voices: onyx, shimmer, alloy)
└── /api/livekit-token — mints LiveKit JWT
          │
          │  LiveKit room (when agent running)
          ▼
Agent Process (@livekit/agents)
│
├── TrialOrchestrator  — routes messages to the right agent
│   ├── prosecutorAgent — ReAct loop, Groq llama-3.3-70b
│   ├── judgeAgent      — chain-of-thought, GPT-4o structured JSON
│   └── defenseAssistant — hint generation, Groq llama-3.3-70b
│
└── TrialMemory (in-process Map<trialId, TrialMemory>)
    ├── prosecutorMemory  — usedEvidence, exploitedWeaknesses, attackStrategy
    ├── judgeMemory       — runningScores, fallaciesDetected, roundSummaries
    └── defenseMemory     — argumentsUsed, userStyle, suggestionsGiven
```

**Fallback design**: if the LiveKit agent is not running, every call routes directly to the `/api` HTTP endpoints. The experience degrades gracefully — you lose per-trial memory and the ReAct loop, but the trial still works.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + Vite | Fast HMR, ESM-native |
| Styling | CSS custom properties + Tailwind | Light/dark theme via `data-theme`, no framework lock-in |
| LLM (prosecutor, hints) | Groq `llama-3.3-70b-versatile` | Low latency, high quality for adversarial dialogue |
| LLM (judge verdict) | OpenAI `gpt-4o` | Structured JSON output, higher reasoning quality for final verdict |
| TTS | OpenAI `tts-1-hd` | Three distinct voices: onyx (prosecutor), shimmer (judge), alloy (defense) |
| Voice pipeline | LiveKit WebRTC + `@livekit/agents` | Real-time audio rooms with data channel for agent ↔ browser messaging |
| State machine | React `useReducer` | Trial phases as explicit states, predictable transitions |
| Testing | Vitest + React Testing Library | 79 tests, full phase machine coverage |
| Deployment | Vercel (serverless) | Zero-config, each `/api/*.js` becomes a function |

---

## Trial Phases

```
SETUP → OPENING → CROSS_1 → CROSS_2 → CROSS_3 → CLOSING → VERDICT
```

| Phase | What Happens |
|---|---|
| Opening | Prosecutor delivers theatrical opening, cites 2–3 invented pieces of evidence |
| Cross 1–3 | Three rounds of escalating cross-examination; prosecutor attacks your specific arguments |
| Closing | Prosecutor summarizes strongest points; you deliver your closing argument |
| Verdict | Judge scores all four dimensions, detects fallacies, delivers verdict |

---

## Scoring

| Dimension | What It Measures |
|---|---|
| **Argument Strength** | How forceful and compelling your core defense is |
| **Evidence Quality** | Whether you cited facts, examples, or logical proof |
| **Logic** | Internal consistency and sound reasoning |
| **Persuasion** | Overall rhetorical impact |

**Score ≥ 24/40 → Not Guilty. Below 24 → Guilty.**

---

## Local Setup

### Prerequisites

- Node.js 18+
- Groq API key ([console.groq.com](https://console.groq.com))
- OpenAI API key (for Judge + TTS)
- LiveKit account ([livekit.io](https://livekit.io)) — optional, app works without it

```bash
git clone https://github.com/sriksven/courtroom-ai.git
cd courtroom-ai
npm install

cp .env.example .env.local
# Fill in GROQ_API_KEY, OPENAI_API_KEY
# Optionally fill in LIVEKIT_* for voice agent
```

### Run (with agent)
```bash
npm run dev
# Starts: Express API (3001) + LiveKit agent + Vite frontend (5173)
```

### Run (without agent — simpler)
```bash
npm run dev:no-agent
# Starts: Express API (3001) + Vite frontend (5173)
# All AI calls route through direct HTTP — no per-trial memory, but fully functional
```

### Environment Variables

```
GROQ_API_KEY=           # Prosecutor + Defense Hint + strategy analysis
OPENAI_API_KEY=         # Judge verdict (GPT-4o) + TTS (tts-1-hd)
LIVEKIT_API_KEY=        # Optional: LiveKit server credentials
LIVEKIT_API_SECRET=     # Optional
LIVEKIT_URL=            # Optional: wss://your-project.livekit.cloud
VITE_LIVEKIT_URL=       # Optional: same URL, exposed to browser
```

---

## Testing

```bash
npm run test:once       # run all 79 tests once
npm run test            # watch mode
npm run test:coverage   # coverage report
```

Tests cover:
- Phase machine: all 7 transitions including CLOSING → VERDICT
- `submitDefense` round number correctness
- Correct API endpoint called per phase
- Error handling without crash
- `resetTrial` returning to initial state
- Cases data integrity

---

## Project Structure

```
all-rise/
├── src/
│   ├── App.jsx                      # Page router (landing/trial/verdict)
│   ├── components/
│   │   ├── Landing/LandingPage.jsx  # Case selection + mode picker
│   │   ├── Trial/
│   │   │   ├── TrialPage.jsx        # Main trial view
│   │   │   ├── TrialChatArea.jsx    # Chat bubbles + per-bubble TTS player
│   │   │   ├── TrialInputBar.jsx    # Text input + live STT
│   │   │   ├── VoiceStatus.jsx      # Hybrid voice mode UI
│   │   │   └── MicIndicator.jsx     # Full voice mode UI
│   │   └── Verdict/VerdictPage.jsx  # Animated scored verdict
│   ├── hooks/
│   │   ├── useTrial.js              # Trial state machine (useReducer)
│   │   ├── useVoiceMode.js          # Hybrid voice while-loop orchestrator
│   │   ├── useVoicePipeline.js      # LiveKit WebRTC session
│   │   ├── useVoice.js              # STT with live interim updates
│   │   └── useDataChannel.js        # LiveKit data channel wrapper
│   └── context/TrialContext.jsx     # LiveKit room + trial state provider
├── agent/
│   ├── index.js                     # LiveKit worker entry point
│   ├── orchestrator.js              # Routes messages to agents
│   ├── agents/
│   │   ├── prosecutorAgent.js       # ReAct loop with 10 tools
│   │   ├── judgeAgent.js            # Chain-of-thought, GPT-4o structured output
│   │   └── defenseAssistant.js      # Adaptive hint generation
│   ├── memory/
│   │   ├── TrialMemory.js           # Memory schema
│   │   ├── memoryStore.js           # Map<trialId, TrialMemory> with auto-cleanup
│   │   └── memoryHelpers.js         # Typed write helpers
│   ├── tools/                       # 10 deterministic tools for agents
│   └── llm/
│       ├── groqClient.js            # groqChat + groqJSON
│       └── openaiClient.js          # openaiChat + openaiVerdict
├── api/                             # Vercel serverless functions (HTTP fallback)
│   ├── prosecutor.js
│   ├── judge.js
│   ├── defense-hint.js
│   ├── tts.js
│   └── livekit-token.js
├── tests/unit/                      # 79 tests
├── dev-server.js                    # Express wrapper for local dev
└── vercel.json                      # Deployment config
```

---

## Key Design Decisions

**Why three separate agents instead of one?** Each agent has a fundamentally different goal — the prosecutor wants to win, the judge wants truth, the strategist wants to help you without doing the work for you. Giving them separate memory, separate prompts, and separate models ensures they don't bleed into each other.

**Why Groq for the prosecutor?** Latency. Cross-examination feels like cross-examination when the response comes back in under 2 seconds. GPT-4o at 15+ seconds per response breaks the rhythm of a trial.

**Why GPT-4o only for the judge?** The verdict is the one moment where structured JSON correctness and reasoning quality matter more than speed. The judge runs once, at the end, with the full transcript. Taking 10 seconds is fine.

**Why a while loop for hybrid voice?** A useEffect-triggered approach fires once per state change. A genuine `while` loop with Promise parking (`waitForNextMessage`) maps naturally to the sequential flow: speak → listen → submit → wait → repeat. It's easier to reason about and harder to get into bad states.

**Why in-process memory instead of a database?** Trials are 4 minutes long. A Map with a 10-minute cleanup timer is the right tool. Adding a database would introduce latency, cost, and operational complexity with no benefit.

---

## What's Next

- Persistent leaderboard (high scores across trial topics)
- Multiplayer mode (two humans, one as prosecutor, one as defense)
- Custom personas (upload a character description and get a custom prosecutor)
- Verdict appeals (argue your case again with the full previous transcript as context)

---

## Acknowledgements

- [Groq](https://groq.com) — fast inference for adversarial dialogue
- [OpenAI](https://openai.com) — GPT-4o structured output + TTS voices
- [LiveKit](https://livekit.io) — WebRTC rooms and agent SDK
- [Anthropic Claude](https://claude.ai) — development assistance

---

## License

MIT — use freely, fork openly, argue loudly.
