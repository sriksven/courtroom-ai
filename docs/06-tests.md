# Tests

## Summary

```
Test Files:  6
Tests:       79 passing
Framework:   Vitest + React Testing Library
Coverage:    npm run test:coverage
```

All tests are unit tests located in `tests/unit/`. No end-to-end tests are currently automated (the Playwright config exists but the `tests/e2e/` folder is empty).

---

## Running Tests

```bash
npm run test:once      # run all tests once, exit
npm run test           # watch mode (re-runs on file change)
npm run test:coverage  # run once with V8 coverage report
```

---

## Test Files

### `smoke.test.js` — 18 tests

The most important test file. Covers the critical paths of the entire application end-to-end at the unit level.

**Setup:**
- `global.fetch` mocked with `vi.fn()`
- `livekit-client` mocked (no real WebSocket connections)
- `uuid` mocked to return `'test-uuid-1234'` (deterministic)

**Helper functions:**
```js
mockProsecutorResponse(text)   // mock fetch → { content: text }
mockJudgeResponse(guilty)      // mock fetch → { guilty, verdict_statement, scores, fallacies }
```

**Phase constants (5 tests):**

| Test | What It Checks |
|---|---|
| PHASE_ORDER starts/ends correctly | `PHASE_ORDER[0] === SETUP`, `PHASE_ORDER[-1] === VERDICT` |
| getNextPhase full sequence | All 6 transitions: SETUP→OPENING, OPENING→CROSS_1, ... CLOSING→VERDICT |
| getNextPhase returns null at VERDICT | Terminal state has no next |
| getRoundNumber returns 1/2/3 for CROSS phases | Returns null for non-CROSS phases |
| CROSS_PHASES contains exactly CROSS_1/2/3 | Array membership check |

**useTrial state machine (6 tests):**

| Test | What It Checks |
|---|---|
| Initial state | `phase === SETUP`, `messages.length === 0`, `isLoading === false` |
| startTrial | Transitions to OPENING, adds 1 prosecutor message, sets accusation, clears loading |
| submitDefense OPENING → CROSS_1 | Adds defense + prosecutor messages, phase === CROSS_1, round === 1 |
| All CROSS round transitions | 3 successive submits advance correctly through CROSS_1/2/3 with correct rounds |
| CLOSING → VERDICT | 4 submits reach CLOSING, 5th triggers judge call, phase === VERDICT, scores populated |
| API error | Sets `error` state, `isLoading === false`, doesn't crash |
| resetTrial | Returns to SETUP, clears messages and accusation |

**API routing (3 tests):**

| Test | What It Checks |
|---|---|
| startTrial calls /api/prosecutor | URL, body.phase === OPENING, body.accusation correct |
| CLOSING submit calls /api/judge | Judge endpoint called after 4 submits + 1 more |
| Correct phase sent to prosecutor | CROSS_1 phase in body after first defense submit |

**Cases data integrity (3 tests):**

| Test | What It Checks |
|---|---|
| At least one case exists | `CASES.length > 0` |
| All cases have id, title, accusation | Property check + accusation.length > 10 |
| All case IDs are unique | `new Set(ids).size === ids.length` |

---

### `fallacyParser.test.js` — 13 tests

Tests `src/utils/fallacyParser.js`.

The fallacy parser extracts fallacy annotations from judge verdict strings. Format used by the judge:
```
"Ad Hominem — DEFENSE in CROSS_1: accused the prosecutor of personal bias"
```

**Covers:**
- Parsing correctly formatted fallacy strings
- Extracting: fallacy name, who (DEFENSE/PROSECUTOR), phase, description
- Handling malformed or empty strings without throwing
- Edge cases: multiple fallacies, missing fields, unexpected formats

---

### `promptBuilder.test.js` — 17 tests

Tests `src/utils/promptBuilder.js`.

The prompt builder assembles LLM messages arrays from trial state. This is critical — wrong prompts produce wrong AI behavior.

**Covers:**
- `buildProsecutorPrompt` returns correctly structured messages array
- System prompt contains expected persona text for each phase (OPENING, CROSS_1-3, CLOSING)
- Transcript injection: messages from the trial appear in the correct order
- Tool results injected into context when provided
- `buildJudgePrompt` includes full transcript
- `buildDefenseHintPrompt` includes user style and unused argument types when provided
- Empty history handled gracefully

---

### `transcriptManager.test.js` — 18 tests

Tests `src/utils/transcriptManager.js`.

The transcript manager converts the `messages[]` array into formatted strings for the judge and for LiveKit data messages.

**Covers:**
- `buildFullTranscript(messages)` produces readable formatted output
- Each role (prosecutor, defense, judge, system) formatted correctly
- Phase and round labels included
- Messages in correct order
- Empty messages array returns empty string
- Long content not truncated
- Timestamps formatted consistently

---

### `tokenCounter.test.js` — 12 tests

Tests `src/utils/tokenCounter.js`.

Approximate token counting used to stay within model context limits.

**Covers:**
- Empty string → 0 tokens
- Known short strings → expected approximate count
- Longer texts scale proportionally
- Array of messages summed correctly
- Non-string input handled gracefully

---

### `placeholder.test.js` — 1 test

A single sanity-check test that the test environment itself is configured correctly. Confirms Vitest runs and `@testing-library/jest-dom` matchers are available.

---

## What Is Not Tested (and Why)

| Area | Reason Not Tested |
|---|---|
| LiveKit connection | Requires live WebSocket server; mocked at boundary in smoke tests |
| OpenAI TTS `/api/tts` | Requires API key; tested manually during development |
| Full voice pipeline | LiveKit WebRTC requires browser environment; covered by integration-level manual testing |
| React components (render) | Components are thin UI wrappers over the hooks; the hooks are tested |
| Agent tools individually | Most are pure memory reads; tested implicitly through smoke tests of the state machine |

---

## Adding New Tests

### For a new phase or state machine change

Add a test to `smoke.test.js` in the `useTrial state machine` describe block. Pattern:

```js
it('new behavior description', async () => {
  const { result } = renderHook(() => useTrial())

  // Set up state
  mockProsecutorResponse('...')
  await act(async () => { await result.current.startTrial('Test charge') })

  // Trigger the thing
  mockProsecutorResponse('...')
  await act(async () => { await result.current.submitDefense('my argument') })

  // Assert
  expect(result.current.phase).toBe(PHASES.CROSS_1)
  expect(result.current.messages).toHaveLength(3)
})
```

### For a new API endpoint

Add a test to the `API routing` describe block:

```js
it('new endpoint is called correctly', async () => {
  const { result } = renderHook(() => useTrial())
  // ... setup ...
  const call = mockFetch.mock.calls.find(([url]) => url === '/api/new-endpoint')
  expect(call).toBeTruthy()
  expect(JSON.parse(call[1].body).someField).toBe('expected value')
})
```

### For a new utility function

Create a new file `tests/unit/<util-name>.test.js`. Import the function directly and test with pure inputs/outputs — no React, no mocking needed.

---

## Coverage

Run `npm run test:coverage` to generate an HTML report in `coverage/`. Key files to watch:

- `src/hooks/useTrial.js` — state machine, highest importance
- `src/constants/phases.js` — phase transitions
- `src/utils/` — all utility functions should be near 100%
