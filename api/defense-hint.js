import Groq from 'groq-sdk'

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

const SYSTEM_PROMPT =
  'You are a sharp legal strategist whispering tactics to the defendant. Give exactly 3 bullet points (using • character) suggesting specific defense tactics for their situation. No preamble, no headers, just the 3 bullets.'

export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { accusation, latestProsecutorStatement } = req.body

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 200,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Accusation: ${accusation}\n\nLatest prosecutor statement: ${latestProsecutorStatement}`,
        },
      ],
    })

    const hints = completion.choices[0].message.content
    return res.status(200).json({ hints })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
