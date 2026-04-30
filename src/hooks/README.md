# hooks

## Purpose

This folder contains all custom React hooks that implement the core runtime behavior of the application. The hooks are responsible for the trial state machine, all three voice modes, audio playback, and score derivation. Encapsulating this logic in hooks keeps the UI components thin and makes each behavior independently testable.

## Files

- **useTrial.js** - The central state machine for the entire trial. Uses `useReducer` with a transition map built from `src/constants/phases.js` to advance through phases: `SETUP -> OPENING -> CROSS_1..N -> CLOSING -> VERDICT`. Manages the message history array, initiates streaming calls to the `api/` serverless functions for prosecutor responses and hints, and handles the dynamic round continuation logic by inspecting the `requestAnotherRound` field in the prosecutor's JSON response.
- **useVoice.js** - Implements continuous browser speech-to-text using the Web Speech API. Handles the Chrome timeout issue by automatically restarting recognition after silence-induced stops. Returns a transcript string and a toggle function.
- **useVoiceMode.js** - Implements the hybrid auto-voice loop. After each prosecutor response finishes streaming, this hook plays the response text as TTS (sentence by sentence via `api/tts.js`) and then activates the microphone to capture the defense player's spoken reply. Coordinates streaming TTS playback with the state machine so the UI updates incrementally.
- **useVoicePipeline.js** - Implements the full LiveKit WebRTC voice session. Joins a LiveKit room using a token from `api/livekit-token.js`, publishes the user's microphone track, and routes audio to and from the Railway agent process. Returns room state and connection controls.
- **useDataChannel.js** - Subscribes to LiveKit data channel messages within an active room. Parses incoming messages by type and dispatches the appropriate trial state updates (e.g., prosecutor speaking, verdict received).
- **useScoring.js** - A derived-data hook that receives the raw verdict score object and returns the weighted total, a letter grade, and a per-dimension breakdown. Contains no side effects.
- **useSound.js** - A simple hook that wraps the browser Audio API. Accepts a sound file URL and returns a `play` function. Used for UI sound effects such as the gavel strike on verdict.

## How it fits in

`useTrial.js` is instantiated once in `src/context/TrialContext.jsx` and its state and dispatch are shared globally. `TrialPage.jsx` selects either `useVoiceMode` or `useVoicePipeline` based on the mode the user chose on the landing page. `useScoring` is called in `VerdictPage.jsx`. All hooks that make network requests target the `api/` directory functions or the LiveKit infrastructure.
