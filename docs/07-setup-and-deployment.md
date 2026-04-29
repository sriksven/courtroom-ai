# Setup and Deployment

## Prerequisites

- Node.js 18 or later
- A Groq API key — [console.groq.com](https://console.groq.com) (free tier available)
- An OpenAI API key — [platform.openai.com](https://platform.openai.com) (for judge + TTS)
- LiveKit account — [livekit.io](https://livekit.io) — **optional** (app works without it)

---

## Local Development

### 1. Clone and install

```bash
git clone https://github.com/sriksven/courtroom-ai.git
cd courtroom-ai
npm install
cd agent && npm install && cd ..
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
# Required
GROQ_API_KEY=gsk_...          # Prosecutor, defense hints, strategy analysis
OPENAI_API_KEY=sk-...         # Judge verdict (GPT-4o) + TTS (tts-1-hd)

# Optional (enables LiveKit voice agent)
LIVEKIT_API_KEY=APIxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LIVEKIT_URL=wss://your-project.livekit.cloud
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
```

### 3. Start the app

**With agent (recommended for full memory + voice support):**
```bash
npm run dev
```
This starts three processes concurrently:
- Express API server on port 3001
- LiveKit agent process
- Vite dev server on port 5173

Open: `http://localhost:5173`

**Without agent (simpler, no LiveKit required):**
```bash
npm run dev:no-agent
```
All AI calls route directly to the HTTP API. Per-trial memory and ReAct loop are disabled, but the trial works normally.

---

## Individual Processes

If you need to start processes separately:

```bash
npm run api          # Express API server only (port 3001)
npm run agent        # LiveKit agent only
npm run dev:frontend # Vite frontend only (port 5173, no API proxy)
```

---

## Environment Variables Reference

| Variable | Required | Used By | Purpose |
|---|---|---|---|
| `GROQ_API_KEY` | Yes | API server, Agent | Prosecutor LLM, defense hints, strategy analysis |
| `OPENAI_API_KEY` | Yes | API server, Agent | Judge verdict (GPT-4o), TTS audio |
| `LIVEKIT_API_KEY` | No | API server | Minting LiveKit JWT tokens |
| `LIVEKIT_API_SECRET` | No | API server | Signing LiveKit JWT tokens |
| `LIVEKIT_URL` | No | Agent | Agent connects to this LiveKit server |
| `VITE_LIVEKIT_URL` | No | Browser | Browser connects to this LiveKit server |

Variables prefixed with `VITE_` are exposed to the browser. All others are server-only. The OpenAI key is never sent to the browser.

---

## How Requests Flow in Development

```
Browser (port 5173)
  │
  │ /api/* requests
  ▼
Vite dev server proxy
  │
  │ forwards to port 3001
  ▼
Express (dev-server.js)
  │
  ├── /api/prosecutor    → api/prosecutor.js
  ├── /api/judge         → api/judge.js
  ├── /api/defense-hint  → api/defense-hint.js
  ├── /api/tts           → api/tts.js
  └── /api/livekit-token → api/livekit-token.js
```

The Express server (`dev-server.js`) dynamically imports each handler from `api/`. The handlers are identical to what runs on Vercel — same code, different host.

---

## Production Deployment (Vercel)

### Deploy

```bash
npm install -g vercel
vercel --prod
```

Or connect your GitHub repo to Vercel for automatic deploys on push.

### How It Works on Vercel

- The React app is built to `dist/` and served as static files
- Each file in `api/*.js` becomes a serverless function automatically
- `vercel.json` rewrites all routes to `index.html` for SPA routing
- The LiveKit agent cannot run on Vercel (it's a long-lived WebSocket process) — all trials fall back to direct HTTP API calls in production unless you host the agent separately

### Environment Variables on Vercel

Set these in your Vercel project dashboard under **Settings → Environment Variables**:

```
GROQ_API_KEY
OPENAI_API_KEY
LIVEKIT_API_KEY      (optional)
LIVEKIT_API_SECRET   (optional)
LIVEKIT_URL          (optional)
VITE_LIVEKIT_URL     (optional — this becomes part of the browser bundle)
```

### vercel.json

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "functions": {
    "api/**/*.js": { "runtime": "@vercel/node@5" }
  },
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## Hosting the Agent Separately

If you want per-trial memory and the ReAct loop in production, the agent needs to run as a long-lived process (not serverless). Options:

- **Railway / Render / Fly.io** — deploy `agent/` as a Node.js service
- **Docker** — containerize the agent directory
- **VM** — `node agent/index.js` on any Node 18+ VM

The agent connects outbound to LiveKit via WebSocket. It only needs:
- `GROQ_API_KEY`
- `OPENAI_API_KEY`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `LIVEKIT_URL`

The browser connects to the same LiveKit room via `VITE_LIVEKIT_URL`.

---

## Build

```bash
npm run build       # builds to dist/
npm run preview     # serve dist/ locally for production testing
```

The build produces:
- `dist/index.html` — 0.5 KB
- `dist/assets/index.css` — 17 KB (4.5 KB gzip)
- `dist/assets/index.js` — 682 KB (187 KB gzip)

The large JS bundle is mostly `livekit-client`. If LiveKit is not needed, removing the import reduces the bundle significantly.

---

## Troubleshooting

**API calls return 404**

The Vite proxy isn't reaching the API server. Make sure `dev-server.js` is running on port 3001. If using `npm run dev`, check the "API" process in the concurrently output.

**Prosecutor responds slowly**

Normal on the first request — Groq cold starts. Subsequent requests are fast. If consistently slow, check your `GROQ_API_KEY` quota.

**Voice mode mic doesn't activate**

Web Speech API requires HTTPS in most browsers. In development, `localhost` is an exception and should work. If using a tunnel (ngrok, etc.), make sure it's HTTPS.

**LiveKit agent not connecting**

Check that `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` match your LiveKit project settings. The agent logs connection errors to stdout. The app will fall back to direct HTTP silently.

**Judge returns invalid JSON**

Rare — the Groq fallback judge uses a text parsing approach and occasionally produces malformed JSON. The API handler strips markdown code fences and retries. If it still fails, `api/judge.js` returns `{ error: 'invalid_verdict' }` and the trial shows an error banner.
