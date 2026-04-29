# Architecture

## System Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser (React 18 + Vite)                    │
│                                                                     │
│  LandingPage → TrialPage → VerdictPage                              │
│  TrialContext (LiveKit room + trial state)                           │
│  useTrial (useReducer state machine)                                 │
│  useVoiceMode (hybrid while-loop)                                    │
│  useVoicePipeline (LiveKit WebRTC)                                   │
└──────────────┬──────────────────────────────────────────────────────┘
               │
               │  HTTP /api/*          LiveKit data channel
               │  (always available)   (when agent running)
               │
┌──────────────┴──────────────────────────────────────────────────────┐
│                  API Layer (Express dev / Vercel prod)               │
│                                                                     │
│  /api/prosecutor   — Groq fallback (stateless)                      │
│  /api/judge        — Groq fallback (stateless)                      │
│  /api/defense-hint — Groq fallback (stateless)                      │
│  /api/tts          — OpenAI tts-1-hd                                │
│  /api/livekit-token — mints LiveKit JWT                             │
└──────────────┬──────────────────────────────────────────────────────┘
               │
               │  LiveKit room (WebSocket + WebRTC)
               │
┌──────────────┴──────────────────────────────────────────────────────┐
│                    Agent Process (@livekit/agents)                   │
│                                                                     │
│  TrialOrchestrator                                                  │
│    ├── prosecutorAgent  (ReAct loop, Groq)                          │
│    ├── judgeAgent       (chain-of-thought, GPT-4o)                  │
│    └── defenseAssistant (adaptive hints, Groq)                      │
│                                                                     │
│  TrialMemory (Map<trialId, TrialMemory>, in-process)                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Component Tree

```
App
├── LandingPage
│   ├── cases grid (CASES constant)
│   ├── custom textarea
│   └── mode selector (text / auto-voice)
├── TrialPage
│   ├── charge header (accusation, voice toggle, theme toggle)
│   ├── progress bar
│   ├── phase nav
│   ├── TrialChatArea
│   │   ├── ChatBubble (prosecutor / defense / judge / system)
│   │   └── PlayButton (per bubble TTS player)
│   └── bottom bar (one of three):
│       ├── TrialInputBar   (text mode)
│       ├── VoiceStatus     (hybrid mode)
│       └── MicIndicator    (full voice mode)
└── VerdictPage
    ├── animated score cards
    ├── guilty/not-guilty banner
    └── fallacy list
```

### State

State is managed in two places:

**`useTrial` (useReducer)** — owns all trial state:
- `phase` — current trial phase (SETUP → OPENING → CROSS_1-3 → CLOSING → VERDICT)
- `messages` — all chat messages with role, content, phase, round, timestamp
- `accusation` — the charge text
- `round` — current cross-examination round (1-3)
- `verdict` / `scores` / `fallacies` — populated at VERDICT
- `isLoading` / `error`

**`App` (useState)** — owns page-level state:
- `page` — which page is visible ('landing' | 'trial' | 'verdict')
- `voiceModeOn` — 'off' | 'hybrid' | 'full'
- `theme` — 'light' | 'dark'

`TrialContext` wraps `useTrial` and provides it to all components. It also manages the LiveKit room connection and calls `trial.setRoom(room)` on successful connect.

### Routing

There is no React Router. Pages use CSS classes for transitions:

```css
.page { position: absolute; ... transition: opacity 0.4s, transform 0.4s; }
.page.visible { opacity: 1; transform: translateX(0); }
.page.hidden { opacity: 0; transform: translateX(40px); pointer-events: none; }
```

All three pages are always mounted in the DOM. Switching pages just changes the CSS class. This preserves component state across page transitions.

### Theming

Light/dark theme uses CSS custom properties on the `<html>` element:

```css
:root {
  --bg: #ffffff;
  --text: #1a1a1a;
  --accent: #1a1a1a;
  /* ... */
}
[data-theme="dark"] {
  --bg: #0d0d0d;
  --text: #e8e4de;
  /* ... */
}
```

`App` sets `data-theme` on `document.documentElement` and saves the preference to `localStorage`.

---

## API Layer

### Development

`dev-server.js` is an Express server on port 3001. It dynamically imports each `/api/*.js` handler and wraps it for Express. Vite proxies `/api/*` to `localhost:3001`.

```
Browser → Vite (5173) → [proxy /api/*] → Express (3001) → handler
```

### Production

Each file in `/api/*.js` becomes a Vercel serverless function automatically (zero config via `vercel.json`). The same handler code runs — Vercel's request/response API is compatible with Express.

### Handlers

| File | Method | Input | Output |
|---|---|---|---|
| `prosecutor.js` | POST | `{ accusation, phase, history[] }` | `{ content: string }` |
| `judge.js` | POST | `{ accusation, transcript }` | `{ guilty, verdict_statement, scores, fallacies }` |
| `defense-hint.js` | POST | `{ accusation, latestProsecutorStatement }` | `{ hints: string }` |
| `tts.js` | POST | `{ text, voice }` | `audio/mpeg` blob |
| `livekit-token.js` | POST | `{ roomName, participantName, canPublish }` | `{ token, url }` |

---

## Agent Architecture

The agent is a separate Node.js process using `@livekit/agents`. It connects to a LiveKit room, receives data messages from the browser, runs the appropriate agent, and publishes the response back.

### Entry Point (`agent/index.js`)

```
defineAgent entry:
  1. ctx.connect() — join the LiveKit room
  2. send { type: 'agent_ready' } to browser
  3. listen for data messages:
     - 'defense_submitted'  → orchestrator.handleDefenseSubmitted()
                            → publish { type: 'prosecutor_response', text }
     - 'closing_submitted'  → orchestrator.handleClosingSubmitted()
                            → publish { type: 'verdict', verdict }
     - 'hint_requested'     → orchestrator.handleHintRequested()
                            → publish { type: 'hint_response', hints }
  4. wait for room disconnect
```

### Message Routing

```
Browser                          Agent
  │                                │
  │── defense_submitted ──────────►│
  │   { trialId, accusation,       │── runProsecutorAgent()
  │     phase, round, text }       │   (ReAct loop)
  │                                │
  │◄─ prosecutor_response ─────────│
  │   { text, phase, round }       │
```

### Fallback Chain

The browser always tries LiveKit first. If the room isn't connected, or if the LiveKit call times out, it falls back to the direct HTTP API:

```
callProsecutor():
  if room?.localParticipant:
    try sendViaLiveKit(..., timeout=20s)
    on failure: fall through
  return apiPost('/api/prosecutor', ...)
```

This means the app works with or without the agent running. Without the agent, you lose per-trial memory and the ReAct loop, but the trial still functions.

---

## Data Flow: Full Request Cycle

### Text Mode — Defense Submit

```
1. User types defense text, clicks Submit
2. submitDefense(text) called
3. useReducer: ADD_MESSAGE (defense msg), DEFENSE_SUBMITTED (advance phase)
4. compute next phase/round from phase transition table
5. if next phase != VERDICT:
     callProsecutor(accusation, next.phase, messages, text, next.round)
     → try LiveKit data channel (20s timeout)
     → fallback: POST /api/prosecutor
     → response text
     ADD_MESSAGE (prosecutor msg)
6. if next phase == VERDICT:
     callJudge(accusation, messages, text)
     → try LiveKit data channel (30s timeout)
     → fallback: POST /api/judge
     → verdict JSON
     VERDICT_RECEIVED
```

### Hybrid Voice Mode — Full Loop

```
while (!aborted):
  SET_STATE WAITING
  msg = await waitForNextMessage()     ← parks until messages array changes
  mark msg as spoken
  SET_STATE SPEAKING
  await speakText(msg.content, voice)  ← POST /api/tts → play audio
  if phase == VERDICT: break
  SET_STATE LISTENING
  transcript = await SpeechRecognition (with live interim display)
  if transcript empty: continue        ← try again
  SET_STATE PROCESSING
  await submitDefense(transcript)
  SET_STATE WAITING
  ← loop
```
