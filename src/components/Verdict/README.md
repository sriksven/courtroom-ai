# Verdict

## Purpose

This folder contains the components that render the final verdict screen after the trial concludes. The verdict screen presents the judge's decision, numerical scores, and detected fallacies in an animated layout. These components are purely presentational and receive all data from the verdict object returned by the judge agent.

## Files

- **Verdict.jsx** - The page-level wrapper that composes all verdict sub-components and applies the entry animation when the verdict screen mounts.
- **VerdictPage.jsx** - The full animated verdict page. Sequences the reveal of each sub-component (banner, statement, score card, fallacy list) with staggered CSS animations and provides a "Play Again" button that resets the trial state.
- **VerdictBanner.jsx** - Displays the primary verdict headline ("Guilty" or "Not Guilty") in large type with role-appropriate color theming. The text and color are derived from the verdict object's outcome field.
- **VerdictStatement.jsx** - Renders Judge Constance Virtue's formal closing statement as a block quote. The statement text comes directly from the structured JSON returned by the judge agent.
- **ScoreCard.jsx** - Displays the four verdict scores (strength, evidence, logic, persuasion) in a labeled grid. Uses `src/hooks/useScoring.js` to derive the letter grade and weighted total from the raw score values.
- **FallacyList.jsx** - Renders the list of logical fallacies detected in the defense player's arguments. Each entry shows the fallacy name and the judge's explanation, drawn from `src/constants/fallacyTypes.js` for human-readable labels.

## How it fits in

`App.jsx` renders `VerdictPage` when the trial state machine enters the `VERDICT` phase. The verdict data object originates from `api/judge.js` (or `agent/agents/judgeAgent.js` in WebRTC mode), is stored in trial context, and is passed down to these components via `src/context/TrialContext.jsx`. Score derivation logic is isolated in `src/hooks/useScoring.js`.
