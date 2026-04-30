# components

## Purpose

This folder contains all React UI components for the courtroom simulation, organized into feature-area subdirectories. Each subdirectory owns the components for one part of the application - case selection, the courtroom view, input controls, the landing page, the active trial, the verdict, and shared primitives. This structure keeps unrelated components from coupling to each other's internals.

## Subdirectories

- **CaseSelect/** - Components for the case selection flow: a grid of preset case cards and a free-text accusation input. Used as an alternative entry point to the landing page.
- **Courtroom/** - Alternative courtroom layout components including a chat bubble area, phase transition animation, and a sticky header. These are the non-Trial variants of the main trial view.
- **InputBar/** - Alternative input bar components: a defense textarea, a hint button, a mic toggle, and the bar wrapper. Counterparts to the `Trial/TrialInputBar.jsx` component.
- **Landing/** - The `LandingPage.jsx` component that serves as the application home screen, combining the hero section, case grid, voice mode selector, rounds picker, and start button.
- **Trial/** - The primary trial experience components: the main trial page, streaming chat area, input bar, and voice status indicators for both hybrid and LiveKit modes.
- **Verdict/** - Components that render the animated verdict screen: guilty/not-guilty banner, judge's statement, score grid, fallacy list, and the page wrapper.
- **shared/** - Small utility components used across multiple feature areas: an error banner, animated loading dots, and a tooltip wrapper.

## How it fits in

`App.jsx` renders the top-level page components (`LandingPage`, `TrialPage`, `VerdictPage`) which in turn compose the subdirectory components. State is supplied from `src/context/TrialContext.jsx` via hooks rather than prop drilling. Shared components are imported directly from `src/components/shared/` wherever they are needed.
