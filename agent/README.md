# agent

## Purpose

This folder contains the long-lived Railway worker process that powers the AI courtroom agents over LiveKit WebRTC. Unlike the stateless Vercel serverless functions in `api/`, this process maintains per-trial memory across the full duration of a session and runs a ReAct (reason-act) loop for the prosecutor agent. It is deployed as a persistent service so that agent state survives multiple rounds of cross-examination.

## Files

- **index.js** - Entry point for the LiveKit worker. Connects to the LiveKit server, registers the worker, and starts listening for participant events and data channel messages.
- **orchestrator.js** - Receives incoming data channel messages from the frontend and routes them to the correct agent (prosecutor, judge, or defense assistant) based on the message type.

## Subdirectories

- **agents/** - The three AI agent implementations: prosecutor (ReAct loop), judge (GPT-4o verdict), and defense assistant (adaptive hints).
- **llm/** - Thin wrappers around the Groq and OpenAI SDKs used by all agents.
- **memory/** - Per-trial memory store, schema definitions, and read/write helpers.
- **prompts/** - System prompt strings and structured output schemas for each agent.
- **tools/** - Ten deterministic tool functions used inside the prosecutor's ReAct loop.

## How it fits in

The frontend (`src/hooks/useVoicePipeline.js` and `src/hooks/useDataChannel.js`) communicates with this process via LiveKit data channel messages. When the agent process is available, it provides richer responses than the stateless `api/` fallback because it can read and write trial memory across rounds. The Railway deployment keeps this process alive for the lifetime of the application.
