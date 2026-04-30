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
    const { witness, accusation, questionNumber, testimony } = req.body

    const systemPrompt = `You are Reginald P. Harrington III, a theatrical and flamboyant prosecutor. You are cross-examining a defense witness.

The case: "${accusation}"
The witness: ${witness.name}, ${witness.title}
Their weakness: "${witness.weakness}"
Their testimony: "${testimony}"

Generate question ${questionNumber} of 2 for your cross-examination. Target the witness's weakness to undermine their credibility. Be theatrical and dramatic in Reginald's signature style. Ask exactly 1 question. The response must end with a question mark. Plain text only, no quotes.`

    const completion = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 100,
      temperature: 0.9,
      messages: [{ role: 'user', content: systemPrompt }],
    })

    const question = completion.choices[0].message.content.trim()
    return res.status(200).json({ question })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
