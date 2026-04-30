# api

## Purpose

This folder contains Vercel serverless functions that serve as the HTTP fallback layer for the AI courtroom simulation. When the long-lived Railway agent process is unavailable or the user is not in a LiveKit WebRTC session, the frontend calls these endpoints directly. Each function is stateless and handles one discrete AI task per request.

## Files

- **defense-hint.js** - Streams a defense hint from Groq sentence by sentence using chunked HTTP transfer encoding. Accepts the current trial context and returns incremental hint text to the client.
- **judge.js** - Calls GPT-4o to produce a structured JSON verdict object containing scores, fallacy detections, and the judge's formal statement. Returns the full verdict in one response.
- **livekit-token.js** - Mints a signed LiveKit JWT token for a given room and participant identity. The client must obtain this token before joining a LiveKit WebRTC room.
- **openaiClient.js** - Shared module that instantiates and exports a configured OpenAI SDK client. Imported by judge.js and tts.js so credentials are initialized once.
- **prosecutor.js** - Streams the prosecutor's response from Groq, either as free text (streaming mode) or as a structured JSON object containing `requestAnotherRound` and `reason` fields (dynamic round mode).
- **tts.js** - Calls the OpenAI tts-1-hd model with a text input and returns a binary audio blob. Used by the frontend when playing back agent speech in hybrid voice mode.

## How it fits in

The frontend (`src/hooks/useTrial.js` and `src/hooks/useVoiceMode.js`) calls these endpoints when the LiveKit agent is not present, providing full trial functionality over plain HTTP. The agent process (`agent/`) duplicates this logic with per-trial memory and ReAct tooling; the serverless functions are the simpler, stateless equivalent. Vercel deploys these functions automatically from the `api/` directory alongside the frontend build.
