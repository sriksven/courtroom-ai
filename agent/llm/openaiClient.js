import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function openaiChat({ messages, maxTokens = 600, temperature = 0.3 }) {
  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: maxTokens,
    temperature,
    messages,
  })
  return completion.choices[0].message.content
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    guilty: { type: 'boolean' },
    verdict_statement: { type: 'string' },
    scores: {
      type: 'object',
      properties: {
        strength: { type: 'number' },
        evidence: { type: 'number' },
        logic: { type: 'number' },
        persuasion: { type: 'number' },
      },
      required: ['strength', 'evidence', 'logic', 'persuasion'],
      additionalProperties: false,
    },
    fallacies: { type: 'array', items: { type: 'string' } },
    reasoning: { type: 'string' },
  },
  required: ['guilty', 'verdict_statement', 'scores', 'fallacies'],
  additionalProperties: false,
}

export async function openaiVerdict({ messages }) {
  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 800,
    temperature: 0.2,
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'verdict', strict: true, schema: VERDICT_SCHEMA },
    },
    messages,
  })
  return JSON.parse(completion.choices[0].message.content)
}
