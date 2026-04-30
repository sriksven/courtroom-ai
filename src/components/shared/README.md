# shared

## Purpose

This folder contains small, generic UI components that are used in more than one feature area of the application. They have no dependency on trial-specific state and can be imported freely by any component in the `components/` tree. Centralizing them here prevents duplication and provides a consistent visual language for error states and loading feedback.

## Files

- **ErrorBanner.jsx** - Renders a styled error message bar when a string is passed via the `message` prop. Returns null when `message` is falsy, so callers can render it unconditionally alongside other content.
- **LoadingDots.jsx** - Animates three dots in a pulsing sequence to indicate that an asynchronous operation is in progress. Used inside chat bubbles while a streaming AI response is pending.
- **Tooltip.jsx** - Wraps any child element with a hover-activated tooltip. Accepts a `text` prop for the tooltip content and positions the bubble above or below the target based on available space.

## How it fits in

`ErrorBanner` is used in `TrialPage.jsx` and `VerdictPage.jsx` to surface API and connection errors to the user. `LoadingDots` appears inside `TrialChatArea.jsx` while the prosecutor or judge response is streaming. `Tooltip` is used on icon buttons in `TrialInputBar.jsx` and elsewhere to label controls that lack visible text labels.
