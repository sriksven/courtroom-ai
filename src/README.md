# src

## Purpose

This folder contains the entire React 18 + Vite frontend for the AI courtroom simulation. It is the entry point for the Vercel deployment and houses all UI components, application state, custom hooks, utility functions, and constants. The frontend communicates with AI agents either through the Vercel serverless functions in `api/` or directly over LiveKit WebRTC, depending on the selected voice mode.

## Files

- **App.jsx** - Top-level page router implemented with CSS-driven conditional rendering. Displays one of three pages - landing, trial, or verdict - based on application phase state passed down from context.
- **main.jsx** - React entry point. Mounts the `App` component into the DOM and wraps it with the `TrialContext` provider.
- **index.css** - Global stylesheet defining CSS custom properties for theming, color tokens, typography scale, and keyframe animations used throughout the UI.

## Subdirectories

- **components/** - All React UI components, organized by feature area (CaseSelect, Courtroom, InputBar, Landing, Trial, Verdict, shared).
- **constants/** - Static data and configuration: agent persona strings, preset cases, fallacy definitions, and phase constants.
- **context/** - React context that exposes trial state and LiveKit room state to the entire component tree.
- **hooks/** - Custom hooks implementing the trial state machine, all three voice modes, scoring derivation, and audio playback.
- **utils/** - Pure utility functions for fallacy parsing, transcript building, prompt construction, and token estimation.
- **agents/** - Reserved directory for any frontend-side agent logic (currently minimal; agent logic lives in `agent/`).

## How it fits in

The `src/` folder is the sole output of the Vite build pipeline and produces the static assets that Vercel serves. It depends on the `api/` serverless functions for AI responses in text and hybrid voice modes, and on the `agent/` Railway worker for full WebRTC voice mode. All test coverage for this code lives in `tests/`.
