# Courtroom

## Purpose

This folder contains an alternative set of courtroom layout components that present the trial as a chat-style interface. These components are a compositional alternative to the components in `Trial/` and share the same data sources but offer a different visual structure. They exist to support layout experimentation without modifying the primary trial view.

## Files

- **ChatArea.jsx** - Renders the scrollable area containing all chat bubbles for the current trial. Handles auto-scrolling to the latest message and passes each message to `ChatBubble`.
- **ChatBubble.jsx** - Renders a single message bubble with role-appropriate styling (prosecutor, defense, judge). Displays the speaker name, message text, and an optional timestamp.
- **Courtroom.jsx** - The top-level wrapper for this courtroom layout. Composes `TrialHeader`, `ChatArea`, and an input bar, and connects them to trial context state.
- **PhaseTransition.jsx** - Displays an animated overlay or banner when the trial moves from one phase to the next. Reads the current and previous phase from context and triggers the animation on phase change.
- **TrialHeader.jsx** - A sticky header bar showing the current trial phase badge, the accusation text, and a round counter. Updates reactively as phase state changes.

## How it fits in

These components consume state from `src/context/TrialContext.jsx` and can be swapped in place of the `Trial/` components by changing which component `App.jsx` renders for the trial route. Phase constants and transition logic used by `PhaseTransition.jsx` and `TrialHeader.jsx` are defined in `src/constants/phases.js`.
