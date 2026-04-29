import Groq from 'groq-sdk'

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function groqChat({ messages, maxTokens = 300, temperature = 0.85 }) {
  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: maxTokens,
    temperature,
    messages,
  })
  return completion.choices[0].message.content
}

export async function groqJSON({ messages, maxTokens = 400 }) {
  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: maxTokens,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages,
  })
  const raw = completion.choices[0].message.content
  return JSON.parse(raw)
}
