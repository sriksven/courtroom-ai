# utils

## Purpose

This folder contains pure utility functions that perform data transformation tasks needed by both hooks and components. None of the functions in this folder hold state or produce side effects. They are kept separate from hooks and components to make them straightforward to unit test in isolation.

## Files

- **fallacyParser.js** - Parses the fallacy array from the judge agent's JSON response. Handles malformed strings, normalizes fallacy type identifiers, and returns a clean array of `{ type, explanation }` objects. Edge cases such as missing fields and duplicate entries are handled explicitly.
- **promptBuilder.js** - Builds the formatted transcript string that is injected into the judge's system prompt. Iterates over the message history array and produces a labeled, turn-by-turn text block with speaker role prefixes.
- **tokenCounter.js** - Estimates the token count for an array of chat messages using a character-based heuristic. Used by `useTrial.js` to detect when the transcript is approaching model context limits and to decide whether to truncate older messages.
- **transcriptManager.js** - Builds and formats the complete trial transcript for display and export purposes. Differs from `promptBuilder.js` in that it targets human-readable output rather than prompt injection, including timestamps and phase labels.

## How it fits in

`fallacyParser.js` is called in `src/hooks/useTrial.js` when the judge response arrives, before the verdict data is stored in state. `promptBuilder.js` and `transcriptManager.js` are called inside `useTrial.js` to construct the strings passed to `api/judge.js`. `tokenCounter.js` is used in `useTrial.js` to guard against context overflow on long trials. All four files are covered by unit tests in `tests/unit/`.
