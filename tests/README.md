# tests

## Purpose

This folder contains all automated tests for the courtroom AI project. Tests are organized into three tiers - unit, end-to-end, and integration - each with a different scope and toolchain. The separation makes it possible to run fast unit tests in CI on every commit while reserving slower browser tests for pre-deploy checks.

## Subdirectories

- **unit/** - 79 Vitest + React Testing Library unit tests covering the phase state machine, utility functions, and API routing logic. These tests run entirely in Node without a browser.
- **e2e/** - Playwright end-to-end tests that launch a real browser and exercise the full user flow from the landing page through a complete trial. Shared test helpers live in `e2e/helpers/`.
- **integration/** - Directory reserved for integration tests that exercise the interaction between the frontend and the `api/` serverless functions. Currently empty; placeholder structure is in place.

## How it fits in

Unit tests import directly from `src/` and run against the Vite-transformed source via Vitest's jsdom environment. End-to-end tests target the locally served Vite development server or a preview deployment URL. The test suite is the primary quality gate for changes to the state machine in `src/hooks/useTrial.js` and the utility functions in `src/utils/`.
