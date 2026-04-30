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
    const { witness, side, accusation } = req.body

    const toneDesc = side === 'defense'
      ? 'You speak warmly and positively about the defendant, vouching for their character and supporting their innocence.'
      : 'You give damaging testimony against the defendant, emphasizing evidence or observations that support the prosecution.'

    const systemPrompt = `You are ${witness.name}, ${witness.title}. Your relationship to the case: ${witness.relationship}.
${toneDesc}
You are testifying in a case where the accusation is: "${accusation}"
Your testimony summary: ${witness.summary}

Deliver your initial testimony statement in 2-3 sentences, in first person, in character. Plain text only, no quotes around the entire response.`

    const completion = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 200,
      temperature: 0.85,
      messages: [{ role: 'user', content: systemPrompt }],
    })

    const testimony = completion.choices[0].message.content.trim()
    return res.status(200).json({ testimony })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
