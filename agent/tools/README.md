# tools

## Purpose

This folder contains the ten deterministic tool functions that the prosecutor agent uses inside its ReAct loop. Each tool reads from or reasons over the current trial memory and returns a structured result without making any LLM calls. Keeping these tools deterministic makes the prosecutor's reasoning auditable and prevents compounding LLM errors during the observe phase.

## Files

- **checkVerdictConsistency.js** - Examines the prosecutor's accumulated arguments and flags any that contradict each other, helping the agent avoid self-defeating logic in later rounds.
- **computeScores.js** - Calculates interim scores across the four verdict dimensions (strength, evidence, logic, persuasion) based on the arguments and evidence presented so far.
- **detectFallacy.js** - Checks the defense player's most recent statement against a list of known fallacy patterns and returns any matches with the fallacy type and a brief explanation.
- **getProsecutorStrategy.js** - Reads the current strategy field from trial memory and returns it so the prosecutor can confirm or adjust its approach at the start of each round.
- **getUnusedArgumentTypes.js** - Compares the set of argument categories attempted so far against a full taxonomy and returns those that have not yet been used, prompting the prosecutor to vary its approach.
- **getUnusedEvidence.js** - Returns evidence items from the case definition that have not yet been cited by the prosecutor, ensuring the agent does not ignore relevant facts.
- **recallAttackStrategy.js** - Retrieves the recorded attack patterns used against the defense player in previous rounds so the prosecutor can escalate or pivot.
- **recallUserStyle.js** - Returns observations about the defense player's rhetorical style (verbosity, formality, preferred argument types) accumulated from prior rounds.
- **recallWeaknesses.js** - Returns the list of weaknesses in the defense player's past arguments that the prosecutor has noted in memory, enabling targeted follow-up.
- **tallyFallacies.js** - Aggregates the fallacy detections across all rounds and returns a count by type, giving the prosecutor a summary of how reliably the defense has argued.

## How it fits in

The prosecutor agent (`agent/agents/prosecutorAgent.js`) calls a subset of these tools during the observe phase of each ReAct iteration before composing its response. Tool results are concatenated into the prompt context alongside the trial transcript. All tools receive the trial's memory object from `agent/memory/` as input and return plain JavaScript objects.
