import Groq from 'groq-sdk'

let _groq
function getGroq() {
  return _groq ??= new Groq({ apiKey: process.env.GROQ_API_KEY })
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { accusation, side = 'prosecution', count = 4 } = req.body

    const sideDesc = side === 'defense'
      ? 'character witnesses who testify IN FAVOR of the defendant and speak warmly about their character'
      : 'witnesses who testify AGAINST the defendant with damaging testimony'

    const systemPrompt = `You are a creative writer for a courtroom simulation. Generate ${count} fictional ${sideDesc} for a case where the accusation is: "${accusation}".

Each witness should be unique, colorful, and have a specific weakness that could be exploited in cross-examination.

Return ONLY valid JSON in this exact format:
{
  "witnesses": [
    {
      "id": "unique string id",
      "name": "Full Name",
      "title": "Their role/occupation/relationship to case",
      "relationship": "how they know the defendant or case",
      "summary": "one sentence about what they testify",
      "credibility": "low|medium|high",
      "weakness": "one sentence describing their exploitable weakness"
    }
  ]
}`

    const completion = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 800,
      temperature: 0.9,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: systemPrompt }],
    })

    const parsed = JSON.parse(completion.choices[0].message.content)
    return res.status(200).json({ witnesses: parsed.witnesses ?? [] })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
