# InputBar

## Purpose

This folder contains the alternative input bar components used in the `Courtroom/` layout. They mirror the functionality of `Trial/TrialInputBar.jsx` but are structured to be composed independently. The bar allows the defense player to type a response, request a hint, or toggle the microphone for voice input.

## Files

- **DefenseInput.jsx** - A controlled textarea component for the defense player's typed response. Manages its own character count display and fires an `onChange` callback as the user types.
- **HintButton.jsx** - A button that triggers a hint request to the defense assistant agent. Displays a loading state while the hint is streaming and is disabled between submissions to prevent duplicate requests.
- **InputBar.jsx** - The wrapper component that composes `DefenseInput`, `HintButton`, and `VoiceButton` into a single horizontal bar. Handles the submit action and passes the current input value to the trial state machine.
- **VoiceButton.jsx** - A microphone toggle button that activates or deactivates browser-based speech recognition. Shows a recording indicator while the microphone is active.

## How it fits in

`InputBar.jsx` is used inside `Courtroom/Courtroom.jsx` as the primary means of player interaction during cross-examination. It calls actions from `src/context/TrialContext.jsx` to submit defense responses and trigger hint requests. The voice capability it exposes connects to `src/hooks/useVoice.js` for browser STT.
