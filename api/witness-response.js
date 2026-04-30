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
    const { witness, question, side, accusation, questionsAsked = 0 } = req.body

    const toneDesc = side === 'defense'
      ? 'You support the defendant. Answer honestly but try to maintain your supportive stance.'
      : 'You testify against the defendant. You are committed to your damaging testimony.'

    const weaknessNote = `Your weakness: "${witness.weakness}". If the question directly touches on this weakness, show defensiveness or evasion.`

    const systemPrompt = `You are ${witness.name}, ${witness.title}, testifying in a courtroom.
The case: "${accusation}"
${toneDesc}
${weaknessNote}

You are being cross-examined (question ${questionsAsked + 1}). Respond to the following question in character, in 2-3 sentences. Stay in character. Plain text only.`

    const completion = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 150,
      temperature: 0.85,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
    })

    const response = completion.choices[0].message.content.trim()

    // Check if the response text mentions the witness weakness
    const weaknessKeywords = witness.weakness.toLowerCase().split(/\s+/).filter(w => w.length > 4)
    const responseLower = response.toLowerCase()
    const weaknessRevealed = weaknessKeywords.some(kw => responseLower.includes(kw))

    return res.status(200).json({ response, weaknessRevealed })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
