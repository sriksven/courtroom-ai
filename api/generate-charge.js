import Groq from 'groq-sdk'

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

const SYSTEM_PROMPT = `You are a pompous court clerk drafting formal criminal charges for a comedic courtroom simulation.

Given a topic, generate a single dramatic, formal legal charge in one sentence. The charge should:
- Sound like real legal language but be absurd or social in nature
- Reference a specific ridiculous offense related to the topic
- Start with "The defendant is accused of"
- Be 1 sentence, under 25 words
- No markdown, no quotes around the sentence

Examples:
Topic: "coffee" → "The defendant is accused of willfully and with malice aforethought consuming the last of the communal office coffee without brewing a replacement pot."
Topic: "cats" → "The defendant is accused of knowingly and deliberately allowing their cat to sit on the laptop keyboard during a critical video presentation."
Topic: "parking" → "The defendant is accused of the premeditated occupation of two parking spaces with a vehicle of entirely standard dimensions."`

export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { topic } = req.body
    if (!topic?.trim()) return res.status(400).json({ error: 'topic required' })

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 80,
      temperature: 0.9,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Topic: "${topic.trim()}"` },
      ],
    })
    const charge = completion.choices[0].message.content.trim()
    return res.status(200).json({ charge })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
