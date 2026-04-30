# prompts

## Purpose

This folder centralizes all system prompt strings and structured output schemas used by the three agents. Keeping prompts separate from agent logic makes it straightforward to tune persona, tone, and output format without touching inference or memory code. Each file corresponds to one agent role.

## Files

- **prosecutorPrompts.js** - Exports phase-specific system prompts for Reginald P. Harrington III. Different prompts are selected for opening, cross-examination, and closing phases so the prosecutor's language and strategy shift appropriately as the trial progresses.
- **judgePrompts.js** - Exports the system prompt for Judge Constance Virtue along with the JSON schema that GPT-4o is instructed to populate. The schema defines the exact shape of the verdict object including score fields, fallacy array, and statement string.
- **defensePrompts.js** - Exports the system prompt for The Strategist. The prompt instructs the model to generate a single, actionable defense hint and to respect the list of already-given hints passed in at runtime.

## How it fits in

Each agent in `agent/agents/` imports its corresponding prompt module and passes the exported strings as the `system` message in LLM calls. The judge prompt schema is also used to validate or parse the GPT-4o response before the verdict is sent back to the frontend. Updating a persona or output format requires only changes to this folder.
