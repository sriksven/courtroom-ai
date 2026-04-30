# llm

## Purpose

This folder provides thin, reusable wrappers around the two LLM provider SDKs used in the agent process. Centralizing client construction here ensures that API keys are read from environment variables in one place and that all agents share the same configured instances. Neither file contains business logic; they only expose configured SDK clients.

## Files

- **groqClient.js** - Instantiates and exports a Groq SDK client configured with the `GROQ_API_KEY` environment variable. Used by the prosecutor agent and the defense assistant for fast, streaming inference with llama-3.3-70b.
- **openaiClient.js** - Instantiates and exports an OpenAI SDK client configured with the `OPENAI_API_KEY` environment variable. Used by the judge agent for GPT-4o calls and, if needed, for TTS within the agent process.

## How it fits in

All three agents in `agent/agents/` import one or both of these clients directly. The same pattern is mirrored in `api/openaiClient.js` for the Vercel serverless layer, but that module is separate so the two deployment environments remain independent. Swapping models or providers requires changes only in this folder.
