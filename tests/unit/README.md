# unit

## Purpose

This folder contains all 79 unit tests for the courtroom AI frontend. Tests are written with Vitest and React Testing Library and run in a jsdom environment with no browser required. The tests focus on the trial state machine, data transformation utilities, and API routing logic - the parts of the codebase most likely to break silently.

## Files

- **smoke.test.js** - The largest test file. Covers the phase state machine transitions built by `src/constants/phases.js`, the `useReducer` logic in `src/hooks/useTrial.js`, and the routing logic that selects between the `api/` serverless endpoints and the LiveKit agent path.
- **fallacyParser.test.js** - Tests the fallacy string parsing logic in `src/utils/fallacyParser.js`. Covers edge cases including missing fields, unknown fallacy type identifiers, duplicate entries, and malformed JSON strings in the judge response.
- **promptBuilder.test.js** - Tests `src/utils/promptBuilder.js`. Verifies that transcript strings are correctly formatted with role prefixes, that empty message arrays produce an empty string, and that special characters in message text are preserved.
- **tokenCounter.test.js** - Tests the character-based token estimation heuristic in `src/utils/tokenCounter.js`. Verifies expected approximate counts for known inputs and ensures the function handles empty arrays without errors.
- **transcriptManager.test.js** - Tests `src/utils/transcriptManager.js`. Checks that full transcripts include phase labels, speaker names, and timestamps, and that the output is suitable for human reading rather than prompt injection.
- **placeholder.test.js** - A minimal sanity test that asserts `true === true`. It serves as a permanent baseline that confirms the test runner itself is configured correctly.

## How it fits in

These tests are run by `vitest` as configured in `vite.config.js` or a dedicated `vitest.config.js` at the project root. They import directly from `src/` and mock the `api/` fetch calls where needed. Passing all unit tests is a prerequisite for merging changes to the state machine or any utility function.
