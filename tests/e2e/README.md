# e2e

## Purpose

This folder contains Playwright end-to-end tests that exercise the application through a real browser. Unlike unit tests, these tests verify that the full user journey works correctly from the landing page through verdict, including DOM interactions, navigation, and visual state changes. They are intended to catch integration failures that unit tests cannot surface.

## Files

- **landing.spec.js** - Tests the landing page in isolation. Verifies that the case grid renders all twelve preset cases, that clicking a case card marks it as selected, that the custom accusation input clears the grid selection, and that the start button is disabled until a case or accusation is provided.
- **trial-flow.spec.js** - Tests the complete trial flow. Starts a trial with a preset case in text mode, submits a defense response, verifies that the prosecutor reply appears in the chat area, advances through all phases, and confirms that the verdict screen renders with the expected components.

## Subdirectories

- **helpers/** - Shared utility functions used by the spec files. Includes page object helpers for common interactions (selecting a case, submitting a defense response) and network intercept helpers that mock the `api/` endpoints so tests do not require live AI API keys.

## How it fits in

Playwright tests run against the Vite dev server (or a preview build URL) as configured in `playwright.config.js` at the project root. They treat the application as a black box and interact only through the browser DOM. The `helpers/` mocks intercept calls to `api/prosecutor.js`, `api/judge.js`, and `api/defense-hint.js` so the full flow can be tested deterministically without live LLM responses.
