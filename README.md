# All Rise - AI Courtroom Simulation

> You are the defendant. The charge is absurd. The prosecutor is an AI that remembers every word you say. You have the right to remain eloquent.

**Live Demo:** [courtroom-ai-eight.vercel.app](https://courtroom-ai-eight.vercel.app)

[![Tests](https://img.shields.io/badge/tests-79%20passing-brightgreen)](tests/)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev)
[![Groq](https://img.shields.io/badge/Groq-llama--3.3--70b-orange)](https://groq.com)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o%20%2B%20TTS-412991)](https://openai.com)
[![LiveKit](https://img.shields.io/badge/LiveKit-WebRTC-red)](https://livekit.io)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black)](https://courtroom-ai-eight.vercel.app)

---

## Team

| Name | Role |
|---|---|
| **Krishna Venkatesh** | Solo - Full Stack, AI Architecture, Design |

---

## What It Is

All Rise is a fully realized adversarial AI courtroom. You face real social-crime charges - from commandeering the aux cord to leaving a pan soaking for eleven days - and must argue your innocence across structured trial phases against three independent AI agents:

| Agent | Model | Role |
|---|---|---|
| **Reginald P. Harrington III** | Groq llama-3.3-70b | Theatrical prosecutor with per-trial memory and a ReAct reasoning loop |
| **Judge Constance Virtue** | OpenAI GPT-4o | Silent judge who scores 4 dimensions and delivers a structured JSON verdict |
| **The Strategist** | Groq llama-3.3-70b | Defense assistant who adapts hints to your arguing style, never repeats itself |

The trial takes ~4 minutes. There is no guaranteed outcome. You can lose.

---

## Try It

**[-> courtroom-ai-eight.vercel.app](https://courtroom-ai-eight.vercel.app)**

1. Pick a charge (or write your own)
2. Choose **Text** or **Auto Voice** mode
3. Select 1–5 rounds or let the prosecutor decide dynamically
4. Argue your case and receive a scored verdict from the Judge

---

## The Three Agents

Most people hear "courtroom AI" and think: two sides, prosecution vs defense. The actual design is three independent agents with conflicting goals operating on the same trial:

| Agent | Role | Goal |
|---|---|---|
| **Reginald P. Harrington III** | Prosecution | Win at all costs — invents evidence, attacks your logic, escalates each round |
| **Judge Constance Virtue** | The Court | Find the truth impartially — silent until the end, scores both sides, detects fallacies from prosecution and defense alike |
| **The Strategist** | Defense Assistant | Help you without doing the work — gives hints on demand, adapts to your arguing style, never argues for you |

You play the fourth role: the defendant. You argue your own case.

This is what makes it interesting as an engineering problem. Three agents with different models, different memory, and adversarial goals running against each other on a shared game state — and the outcome is genuinely uncertain.

---

## Architecture

```
Browser (React 18 + Vite) - Vercel
│
├── /api/prosecutor      <- Groq llama-3.3-70b  (stateless fallback)
├── /api/judge           <- OpenAI GPT-4o       (stateless fallback)
├── /api/defense-hint    <- Groq llama-3.3-70b  (stateless fallback)
├── /api/tts             <- OpenAI tts-1-hd     (voices: onyx / shimmer / alloy)
└── /api/livekit-token   <- mints LiveKit JWT
         │
         └── WebSocket -> LiveKit Cloud
                              │
                              └── Agent Process - Railway
                                    │
                                    ├── TrialOrchestrator
                                    ├── Prosecutor Agent  (ReAct loop + 4 tools)
                                    ├── Judge Agent       (chain-of-thought + structured JSON)
                                    └── Defense Assistant (adaptive hints)
                                          │
                                          └── TrialMemory  Map<trialId, TrialMemory>
                                                ├── prosecutorMemory
                                                ├── judgeMemory
                                                └── defenseMemory
```

**Fallback design:** if the Railway agent is down, all calls route silently to the Vercel HTTP API - stateless but fully functional.

---

## Key Features

- **3 AI agents** with separate models, memory, and goals operating on the same trial
- **Prosecutor ReAct loop** - recalls weaknesses, detects fallacies, tracks unused evidence, adapts strategy every round
- **Per-trial memory** - prosecutor in round 3 knows what it said in rounds 1 and 2
- **Fixed or dynamic rounds** - choose 1–5 rounds, or let the prosecutor decide after each cross-examination
- **3 interaction modes** - type, auto-voice (browser STT/TTS while-loop), full live voice (LiveKit WebRTC)
- **Play/pause/stop TTS** on every chat bubble (3 distinct voices)
- **Judge scores 4 dimensions** - Argument Strength, Evidence, Logic, Persuasion (max 40pts; ≥24 = Not Guilty)
- **Animated verdict page** - count-up scores, fallacy list, guilty/not-guilty banner
- **Light/dark theme**, smooth page transitions
- **79 automated tests** (Vitest + React Testing Library)

---

## How the Prosecutor Agent Works

Every round runs a **ReAct loop**:

```
OBSERVE  ->  recallWeaknesses(defenseText)     [Groq: what gaps did they expose?]
            detectFallacy(defenseText)         [Groq: did they commit a fallacy?]
            recallAttackStrategy(memory)       [pure read: current strategy]
            getUnusedEvidence(memory)          [pure read: unused evidence types]

ACT      ->  groqChat(prompt + tool results)   [generate prosecutor response]

WRITE    ->  recordEvidenceUsed                [update memory]
            updateAttackStrategy              [Groq analyzes exchange, writes new strategy]
            addFallacy -> judgeMemory          [if detected]
            addRoundSummary                   [one-sentence round log]
```

The judge receives all round summaries + fallacy list + accumulated scores at verdict time.

---

## Project Structure

```
all-rise/
├── src/
│   ├── App.jsx                      # CSS-based page router (no React Router)
│   ├── components/
│   │   ├── Landing/LandingPage.jsx  # Charge selection + mode picker
│   │   ├── Trial/TrialPage.jsx      # Main trial view (all 3 modes)
│   │   ├── Trial/TrialChatArea.jsx  # Bubbles + per-bubble TTS player
│   │   └── Verdict/VerdictPage.jsx  # Animated scored verdict
│   ├── hooks/
│   │   ├── useTrial.js              # useReducer state machine (7 phases)
│   │   ├── useVoiceMode.js          # Hybrid voice while-loop
│   │   ├── useVoicePipeline.js      # LiveKit WebRTC session
│   │   └── useVoice.js              # STT with live interim updates
│   └── context/TrialContext.jsx     # Trial state + LiveKit room provider
├── agent/
│   ├── index.js                     # LiveKit worker entry
│   ├── orchestrator.js              # Routes messages to agents
│   ├── agents/
│   │   ├── prosecutorAgent.js       # ReAct loop
│   │   ├── judgeAgent.js            # GPT-4o structured verdict
│   │   └── defenseAssistant.js      # Adaptive hints
│   ├── memory/                      # TrialMemory schema + store + helpers
│   └── tools/                       # 10 deterministic tools
├── api/                             # Vercel serverless functions (fallback)
└── tests/unit/                      # 79 tests
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- [Groq API key](https://console.groq.com) (free)
- [OpenAI API key](https://platform.openai.com/api-keys)
- [LiveKit account](https://livekit.io) *(optional - app works without it)*

### Run

```bash
git clone https://github.com/sriksven/courtroom-ai.git
cd courtroom-ai
npm install

cp .env.example .env.local
# Fill in GROQ_API_KEY and OPENAI_API_KEY (+ LiveKit vars if you want voice agent)

npm run dev:no-agent   # Frontend + API only (simplest)
# or
npm run dev            # Frontend + API + LiveKit agent (full experience)
```

Open `http://localhost:5173`

### Environment Variables

```
GROQ_API_KEY=           # Prosecutor + hints + strategy analysis
OPENAI_API_KEY=         # Judge (GPT-4o) + TTS (tts-1-hd)
LIVEKIT_API_KEY=        # Optional
LIVEKIT_API_SECRET=     # Optional
LIVEKIT_URL=            # Optional  wss://your-project.livekit.cloud
VITE_LIVEKIT_URL=       # Optional  (same, exposed to browser)
```

### Tests

```bash
npm run test:once       # run all 79 tests
npm run test:coverage   # with coverage report
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| LLM (prosecutor, hints) | Groq `llama-3.3-70b-versatile` |
| LLM (judge verdict) | OpenAI `gpt-4o` with structured JSON output |
| Text-to-Speech | OpenAI `tts-1-hd` |
| Speech-to-Text | Web Speech API (browser-native) |
| Voice rooms | LiveKit WebRTC |
| Agent framework | `@livekit/agents` v1.3 |
| Frontend deploy | Vercel (serverless functions) |
| Agent deploy | Railway |
| Testing | Vitest + React Testing Library |

---

## License

MIT
