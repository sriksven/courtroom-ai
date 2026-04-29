# ⚖ All Rise — Courtroom AI

**An AI-powered courtroom simulation where you defend yourself against absurd accusations before three distinct Claude AI agents.**

![Built for Octo-Universe Student Hackathon](https://img.shields.io/badge/Octo--Universe-Student%20Hackathon-orange)
![React](https://img.shields.io/badge/React-18-blue)
![Vite](https://img.shields.io/badge/Vite-5-purple)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-green)
![LiveKit](https://img.shields.io/badge/LiveKit-Audio-red)

Step into the dock. The charge is absurd. The prosecutor is theatrical. The judge is unforgiving. All Rise drops you into a fully realized courtroom simulation where you face ridiculous-but-earnest accusations — from stealing office snacks to being personally responsible for Monday mornings — and must argue your innocence across multiple trial phases, with a live AI prosecutor pushing back on every word you say.

---

## What It Does

- Puts you on trial for a randomly assigned absurd charge and lets you plead your case in real time
- Pits you against Reginald P. Harrington III, an AI prosecutor who opens, cross-examines, objects, and closes with theatrical flair
- Lets you request hints from The Strategist, a defense assistant who coaches you without giving everything away
- Scores your performance across four dimensions — Argument Strength, Evidence Quality, Logic, and Persuasion — with a final verdict from Judge Constance Virtue
- Takes approximately 4 minutes for a complete trial

---

## AI Architecture

### Reginald P. Harrington III (Prosecutor)
Model: **gpt-4o-mini**

A Victorian-era legal villain with a flair for the dramatic. Reginald operates on a rolling 6-message context window to stay focused on recent exchanges. His behavior adapts per trial phase — pompous opening statements, sharp cross-examination, theatrical objections, and devastating closing arguments. Each response stays under 3 sentences to keep the trial moving.

### Judge Constance Virtue (Judge)
Model: **gpt-4o**

Cold. Impartial. Precise. The Judge receives the full trial transcript and evaluates your defense across four scoring dimensions with structured JSON output. She does not speak during the trial — she watches. At the end, she delivers the verdict and a brief judicial commentary.

### The Strategist (Defense Assistant)
Model: **gpt-4o-mini**

An optional hint system available between phases. The Strategist has context limited to your current challenge and the immediate exchange, offering targeted tactical advice without playing the trial for you. Hints are rationed — use them wisely.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS (courtroom aesthetic — no purple gradients) |
| AI | OpenAI API — gpt-4o, gpt-4o-mini, TTS |
| Voice | LiveKit real-time audio rooms |
| Deployment | Vercel (serverless functions + static hosting) |
| Testing | Vitest + React Testing Library |

---

## Scoring System

Judge Virtue scores your defense across four dimensions, each out of 10:

| Dimension | What It Measures |
|---|---|
| **Argument Strength** | How forceful and compelling your core defense is |
| **Evidence Quality** | Whether you cited facts, examples, or logical proof |
| **Logic** | Internal consistency and sound reasoning |
| **Persuasion** | Overall rhetorical impact and delivery |

**Maximum score: 40 points.** A score of **24 or above** earns a Not Guilty verdict. Below 24 and the gavel falls against you.

---

## Local Development

```bash
# Clone and install
git clone <repo-url>
cd all-rise
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your keys:
# - OPENAI_API_KEY         (for server-side API calls via /api routes)
# - VITE_OPENAI_API_KEY    (for client-side reference only)
# - LIVEKIT_API_KEY        (LiveKit server credentials)
# - LIVEKIT_API_SECRET
# - LIVEKIT_URL
# - VITE_LIVEKIT_URL       (LiveKit URL exposed to client)

# Run with Vercel CLI — this handles /api serverless routes locally
npx vercel dev

# Or run just the frontend (voice features and AI won't work without /api routes)
npm run dev
```

> **Note:** `npm run dev` starts only the Vite dev server. The `/api` routes that proxy OpenAI and LiveKit calls require `npx vercel dev` to function correctly.

---

## Testing

```bash
# Run unit and integration tests once
npm run test:once

# Run with coverage report
npm run test:coverage
```

---

## Deployment

```bash
# Install Vercel CLI globally
npm i -g vercel

# Deploy to production
vercel --prod
```

After deploying, set the following environment variables in your **Vercel project dashboard** under Settings > Environment Variables:

- `OPENAI_API_KEY`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `LIVEKIT_URL`
- `VITE_LIVEKIT_URL`

---

## Security Note

The OpenAI API key is never exposed to the browser. All AI requests are proxied through Vercel serverless functions in `/api`, which run server-side with access to `OPENAI_API_KEY` as a private environment variable. The client-side `VITE_OPENAI_API_KEY` variable is present only for reference and is not used to make direct API calls.

---

## License

MIT
