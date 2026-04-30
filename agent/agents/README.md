# agents

## Purpose

This folder contains the three AI agent implementations that drive the courtroom simulation. Each agent encapsulates a distinct role - prosecutor, judge, and defense assistant - with its own prompting strategy, LLM selection, and output format. The agents are called by the orchestrator in response to data channel events.

## Files

- **prosecutorAgent.js** - Implements Reginald P. Harrington III using a full ReAct loop. On each invocation it observes the current trial state using up to four tools, reasons about a strategy, and then generates a streaming response. After responding it writes updated observations to trial memory.
- **judgeAgent.js** - Implements Judge Constance Virtue using a GPT-4o chain-of-thought call that returns a structured JSON verdict. The verdict includes numerical scores across four dimensions, a list of detected fallacies, and the judge's formal closing statement.
- **defenseAssistant.js** - Implements The Strategist, an adaptive hint generator that reads what hints have already been given from memory and ensures it never repeats the same suggestion. Streams the hint sentence by sentence to the frontend.

## How it fits in

The orchestrator (`agent/orchestrator.js`) instantiates and calls these agents when matching data channel messages arrive. Each agent reads from and writes to the shared per-trial memory store (`agent/memory/`) and uses the LLM clients in `agent/llm/`. The prompts driving each agent live in `agent/prompts/`.
