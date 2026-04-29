import Groq from 'groq-sdk'

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

const SYSTEM_PROMPT =
  'You are the Honorable Judge Constance Virtue. Analyze this trial transcript and return ONLY valid JSON — no preamble, no markdown fences, raw JSON only. Schema:\n{"guilty":boolean,"verdict_statement":"2-3 sentence formal pronouncement","scores":{"strength":1-10,"evidence":1-10,"logic":1-10,"persuasion":1-10},"fallacies":["Fallacy Name — DEFENSE/PROSECUTOR in [phase]: description"]}\nScoring: total >= 24 → guilty: false (Not Guilty). Override if defense was genuinely compelling or incoherent.'

export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { accusation, transcript } = req.body

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 600,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Accusation: ${accusation}\n\nTranscript:\n${transcript}`,
        },
      ],
    })

    const raw = completion.choices[0].message.content
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      // Strip markdown fences if model wrapped it anyway
      const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
      try {
        parsed = JSON.parse(cleaned)
      } catch {
        return res.status(500).json({ error: 'invalid_verdict' })
      }
    }

    return res.status(200).json(parsed)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
