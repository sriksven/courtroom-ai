# memory

## Purpose

This folder implements the per-trial memory system that allows agents to accumulate and recall information across multiple rounds of cross-examination within a single trial. Memory is stored in a process-level JavaScript Map keyed by trial ID and is automatically cleaned up once a verdict is issued. This in-memory approach avoids a database dependency while still giving the prosecutor and defense assistant meaningful continuity.

## Files

- **TrialMemory.js** - Defines the schema for a single trial's memory object. The schema has three namespaced sections: prosecution (strategy, used arguments, detected weaknesses), judge (running notes), and defense (hints already given). Exports a factory function that creates a fresh, empty memory instance.
- **memoryHelpers.js** - Exports named read and write helper functions for individual memory fields (e.g., `addUsedArgument`, `getUnusedEvidence`, `recordHint`). Agents call these helpers rather than mutating the memory object directly.
- **memoryStore.js** - Manages the `Map<trialId, TrialMemory>` singleton. Exports `getMemory`, `createMemory`, and `deleteMemory`. The `deleteMemory` function is called by the judge agent after a verdict so that stale trial state does not accumulate in the Railway process.

## How it fits in

The prosecutor agent (`agent/agents/prosecutorAgent.js`) is the heaviest consumer of this folder: it reads strategy and evidence state before generating a response and writes new observations afterward. The defense assistant reads the hints log to avoid repetition. The orchestrator (`agent/orchestrator.js`) calls `createMemory` at the start of a trial and passes the trial ID to all agents so they can look up the correct memory instance.
