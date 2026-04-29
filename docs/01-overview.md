# All Rise — Project Overview

## What Is It

All Rise is a browser-based AI courtroom simulation. You are the defendant. An AI prosecutor argues against you across five structured trial phases. An AI judge watches silently and delivers a scored verdict at the end. An AI defense strategist is available for hints if you get stuck.

The app runs in your browser. The trial takes about 4 minutes. You can lose.

---

## The Idea

Most AI applications are cooperative — the AI helps you do something. All Rise is deliberately adversarial. The prosecutor is not trying to help you. It is trying to win. It tracks your arguments, builds on its previous attacks, invents evidence, and escalates pressure each round.

This creates something most AI demos don't have: genuine stakes. If you argue poorly, you get a guilty verdict.

---

## The Characters

### Reginald P. Harrington III — The Prosecutor
A theatrical Victorian-era legal villain. He opens with a dramatic statement citing invented-but-plausible evidence, cross-examines you three times with escalating aggression, and closes with an emotional appeal. He adapts each round based on what you said in previous rounds.

Model: **Groq llama-3.3-70b-versatile** (fast, for real-time adversarial dialogue)

### Judge Constance Virtue — The Judge
Cold. Impartial. Silent until the end. She watches the entire trial, accumulates scores and fallacy detections across every round, then delivers a structured verdict with four dimension scores and a formal statement.

Model: **OpenAI GPT-4o** (structured JSON output, higher reasoning quality for final scoring)

### The Strategist — The Defense Assistant
Optional. Available between rounds via the "Get a Hint" button. Knows your rhetorical style, the prosecutor's current strategy, and which types of arguments you haven't tried yet. Gives you 3 tactical bullet points without playing the trial for you. Never repeats itself.

Model: **Groq llama-3.3-70b-versatile**

---

## The Charges

There are 12 built-in absurd charges, including:

- **The Monday Heist** — Stealing the concept of Monday from collective human consciousness
- **Unlicensed Philosophy** — Deploying "but what even is reality?" at a neighborhood barbecue without a PhD
- **The Existential Houseplant** — Teaching a fiddle-leaf fig to feel existential dread
- **Chronic Time Theft** — Taking 12 minutes longer than every estimate for four straight years
- **Pre-Coffee Confidence** — Issuing strong geopolitical opinions at 7:42 AM

You can also write your own charge.

---

## The Verdict

Judge Virtue scores your defense across four dimensions, each out of 10:

| Dimension | What It Measures |
|---|---|
| Argument Strength | How forceful and compelling your core defense is |
| Evidence Quality | Whether you cited facts, examples, or logical proof |
| Logic | Internal consistency, no self-contradiction |
| Persuasion | Overall rhetorical impact and delivery |

**Maximum: 40 points. Score ≥ 24 → Not Guilty. Below 24 → Guilty.**

The judge also detects logical fallacies committed by either side and lists them in the verdict.

---

## Interaction Modes

The app has three modes, selectable on the landing page:

| Mode | How It Works |
|---|---|
| **Text** | Type your defense. Optional mic button transcribes speech into the text box live as you speak. |
| **Auto Voice** | Fully automated loop: prosecution TTS plays → your mic activates → you speak → transcript submits automatically. No typing. |
| **Live Voice** | WebRTC via LiveKit. Your mic streams to a server-side agent. STT, TTS, and AI all run server-side. The browser is a thin client. |

---

## Pages

```
Landing Page  →  Trial Page  →  Verdict Page
```

- **Landing** — Pick a charge (or write one), choose Text or Auto Voice mode, enter the courtroom
- **Trial** — Five phases of argument. Chat bubbles for prosecutor/defense/judge. Play buttons on every message for manual TTS.
- **Verdict** — Animated score reveal with count-up animation, guilty/not-guilty banner, fallacy list

Navigation uses CSS opacity/transform transitions — pages are always mounted, just shown/hidden.

---

## Key Numbers

- ~4 minutes per trial
- 5 trial phases
- 3 AI agents with separate memory
- 10 deterministic tools used by the prosecutor agent
- 4 scoring dimensions
- 3 TTS voices (onyx, shimmer, alloy)
- 79 automated tests
