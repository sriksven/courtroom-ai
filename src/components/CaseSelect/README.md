# CaseSelect

## Purpose

This folder provides the components for the case selection flow, which is an alternative entry path into the trial. It presents the twelve preset cases as a visual grid and also allows the user to type a custom accusation. These components are designed to be reused independently of the main landing page layout.

## Files

- **CaseCard.jsx** - Renders a single selectable card displaying a case title and subtitle. Accepts an `onClick` handler and a selected state to apply active styling when the user picks a case.
- **CaseGrid.jsx** - Lays out a collection of `CaseCard` components in a responsive CSS grid. Receives the case list and the currently selected case ID as props and delegates click events upward.
- **CaseSelect.jsx** - The full case selection page. Composes `CaseGrid` and `CustomInput`, manages local selection state, and provides a confirmation button that triggers the trial start with the chosen or custom accusation.
- **CustomInput.jsx** - A textarea that allows the user to write a free-text accusation instead of choosing a preset case. Clears the grid selection when the user starts typing.

## How it fits in

`CaseSelect.jsx` is rendered by `App.jsx` as an alternative to `LandingPage.jsx` depending on routing logic. The selected accusation string flows into `TrialContext` which initializes the trial state machine in `src/hooks/useTrial.js`. The case data itself is defined in `src/constants/cases.js`.
