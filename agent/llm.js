import Groq from 'groq-sdk'
import OpenAI from 'openai'
import { PHASE_PROMPTS, JUDGE_SYSTEM_PROMPT, HINT_SYSTEM_PROMPT } from './prompts.js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Prosecutor via Groq — fast inference for voice turn-taking
export async function runProsecutor({ accusation, phase, history = [] }) {
  const systemPrompt = PHASE_PROMPTS[phase] || PHASE_PROMPTS.OPENING
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 200,
    temperature: 0.85,
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: `Accusation: ${accusation}` },
    ],
  })
  return completion.choices[0].message.content
}

// Judge via OpenAI GPT-4o — structured JSON reliability matters more than speed
export async function runJudge({ accusation, transcript }) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 600,
    messages: [
      { role: 'system', content: JUDGE_SYSTEM_PROMPT },
      { role: 'user', content: `Accusation: ${accusation}\n\nTranscript:\n${transcript}` },
    ],
  })
  const raw = completion.choices[0].message.content
  // Strip markdown fences if present
  const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
  return JSON.parse(cleaned)
}

// Defense hint via Groq
export async function runHint({ accusation, latestProsecutorStatement }) {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 200,
    messages: [
      { role: 'system', content: HINT_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Accusation: ${accusation}\n\nLatest prosecutor statement: ${latestProsecutorStatement}`,
      },
    ],
  })
  return completion.choices[0].message.content
}
