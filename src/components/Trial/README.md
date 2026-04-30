# Trial

## Purpose

This folder contains the primary components for the active trial experience. These are the main-path components that the user interacts with during cross-examination. They handle streaming AI responses, all three voice modes (text, hybrid browser STT/TTS, and LiveKit WebRTC), and the real-time chat display.

## Files

- **TrialPage.jsx** - The top-level trial view. Selects the correct voice mode hooks based on user configuration, wires them together with trial context state, and renders the full trial layout by composing `TrialChatArea`, `TrialInputBar`, `VoiceStatus`, and `MicIndicator`.
- **TrialChatArea.jsx** - The scrollable message list for the trial. Renders each message as a streaming chat bubble and attaches per-bubble TTS play, pause, and stop controls so the user can replay any spoken turn.
- **TrialInputBar.jsx** - The defense player's primary input control. Combines a textarea, a mic toggle button, a hint request button, and a submit button. Disabled during AI speaking turns to prevent out-of-order submissions.
- **VoiceStatus.jsx** - A status indicator for hybrid voice mode. Displays the current state of the voice pipeline (speaking, listening, or processing) as a labeled icon so the user knows what the system is doing.
- **MicIndicator.jsx** - A status indicator specific to the LiveKit WebRTC voice mode. Shows connection state and whether the LiveKit participant's microphone is active.

## How it fits in

`TrialPage.jsx` is rendered by `App.jsx` when the trial phase is any state between `OPENING` and `VERDICT`. It reads all trial state from `src/context/TrialContext.jsx` and delegates voice handling to `src/hooks/useVoiceMode.js` (hybrid) or `src/hooks/useVoicePipeline.js` (LiveKit). Streaming responses from the `api/` serverless functions are displayed incrementally through `TrialChatArea`.
