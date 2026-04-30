# Landing

## Purpose

This folder contains the application's primary home screen. `LandingPage.jsx` is the first thing a user sees and is responsible for collecting all the inputs needed to start a trial - the case choice, the voice mode, and the number of rounds. It is self-contained and does not depend on trial state being initialized yet.

## Files

- **LandingPage.jsx** - The complete landing page component. Renders a hero headline, a grid of the twelve preset cases (from `src/constants/cases.js`), a voice mode selector (text, hybrid, or LiveKit WebRTC), a dynamic rounds picker, and a start button. When the user clicks start it dispatches the initial trial configuration into the state machine via context and navigates to the trial view.

## How it fits in

`App.jsx` renders `LandingPage` when the application phase is `SETUP`. Once the user starts a trial, the phase advances and `App.jsx` replaces this component with `Trial/TrialPage.jsx`. The landing page writes its selections into `src/context/TrialContext.jsx`, which initializes the `useReducer` state machine in `src/hooks/useTrial.js` with the chosen accusation, mode, and round count.
