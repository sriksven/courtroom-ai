import Groq from 'groq-sdk'

let _client
function client() { return _client ??= new Groq({ apiKey: process.env.GROQ_API_KEY }) }

function normalizeProsecutorText(raw) {
  if (raw == null) return ''
  const s = String(raw).trim()
  if (!s.startsWith('{')) return String(raw)
  try {
    const parsed = JSON.parse(s)
    if (typeof parsed.content === 'string' && parsed.content.trim()) return parsed.content.trim()
    if (typeof parsed.response === 'string' && parsed.response.trim()) return parsed.response.trim()
  } catch {
    /* keep raw */
  }
  return String(raw)
}

export async function groqChat({ messages, maxTokens = 300, temperature = 0.85 }) {
  const completion = await client().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: maxTokens,
    temperature,
    messages,
  })
  return normalizeProsecutorText(completion.choices[0].message.content)
}

export async function groqJSON({ messages, maxTokens = 400 }) {
  const completion = await client().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: maxTokens,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages,
  })
  const raw = completion.choices[0].message.content
  return JSON.parse(raw)
}
