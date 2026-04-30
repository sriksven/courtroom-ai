# context

## Purpose

This folder contains the React context that makes trial state and LiveKit room state available to the entire component tree without prop drilling. It is the integration point between the `useTrial` state machine, the LiveKit room connection, and the UI components that need to read or dispatch actions against trial state.

## Files

- **TrialContext.jsx** - Defines and exports a `TrialContext` React context, a `TrialProvider` component that wraps the app, and a `useTrial` custom hook shortcut for consuming the context. The provider instantiates `src/hooks/useTrial.js` to obtain the state and dispatch function, manages the LiveKit room reference, and exposes them together through context value. Components anywhere in the tree can call `useTrial()` to access the current phase, message history, verdict data, and action dispatchers.

## How it fits in

`main.jsx` wraps the entire application in `TrialProvider`. `App.jsx` reads the current phase from context to decide which page to render. All trial-facing components - `LandingPage`, `TrialPage`, `VerdictPage`, and their children - consume the context rather than receiving trial state as props. The LiveKit hooks (`src/hooks/useVoicePipeline.js`, `src/hooks/useDataChannel.js`) also reference the room object stored in context.
