# constants

## Purpose

This folder contains static data and configuration values that are referenced by multiple parts of the application. None of these files perform side effects or hold runtime state - they export plain JavaScript values. Keeping this data separate from component and hook logic makes it easy to modify personas, cases, or phase structure without searching through business logic code.

## Files

- **agentPersonas.js** - Exports the system prompt strings for all three AI agents as named constants. These strings define the character voice, behavioral rules, and output instructions for the prosecutor, judge, and defense assistant when called from the `api/` serverless functions (as opposed to the agent process, which has its own prompt files in `agent/prompts/`).
- **cases.js** - Exports an array of twelve preset case objects, each with an `id`, `title`, `subtitle`, and `accusation` string. These are the selectable cases shown on the landing page and in the case selection grid.
- **fallacyTypes.js** - Exports an array of fallacy definition objects. Each object has a `type` key matching the identifier the judge agent emits and a human-readable `label` and `description`. Used by `FallacyList.jsx` to render friendly fallacy names.
- **phases.js** - Exports the phase name constants (`SETUP`, `OPENING`, `CROSS_1`, etc.) along with three utility functions: `buildPhaseOrder` (constructs the ordered phase array for a given round count), `buildPhaseTransitions` (produces the state machine transition map), and `getProgress` (returns a 0-1 progress value for a given phase). Consumed by `useTrial.js` and phase indicator components.

## How it fits in

`cases.js` is read by `LandingPage.jsx` and `CaseGrid.jsx` to populate the UI. `phases.js` is the single source of truth for the trial state machine structure in `src/hooks/useTrial.js`. `agentPersonas.js` is imported by the `api/` serverless functions to build LLM system messages. `fallacyTypes.js` is used by `FallacyList.jsx` and `src/utils/fallacyParser.js`.
