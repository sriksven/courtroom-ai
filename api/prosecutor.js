import Groq from 'groq-sdk'

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

const PHASE_PROMPTS = {
  OPENING:
    'You are Reginald P. Harrington III, a theatrical prosecutor. Deliver a dramatic opening statement establishing your case against the defendant for the following accusation. Cite 2-3 invented but plausible pieces of evidence. Be theatrical. 3-5 sentences. Plain text only, no markdown.',
  CROSS_1:
    'You are Reginald P. Harrington III. You are cross-examining the defendant. Attack the specific weakness in their previous argument. Invent a witness or forensic evidence that contradicts their claim. Be relentless and dramatic. 3-5 sentences. Plain text only.',
  CROSS_2:
    'You are Reginald P. Harrington III. You are cross-examining the defendant. Attack the specific weakness in their previous argument. Invent a witness or forensic evidence that contradicts their claim. Be relentless and dramatic. 3-5 sentences. Plain text only.',
  CROSS_3:
    'You are Reginald P. Harrington III. You are cross-examining the defendant. Attack the specific weakness in their previous argument. Invent a witness or forensic evidence that contradicts their claim. Be relentless and dramatic. 3-5 sentences. Plain text only.',
  CLOSING:
    'You are Reginald P. Harrington III. Deliver your closing argument. Summarize the 3 strongest prosecution points from the trial and make an emotional appeal to the court. 4-6 sentences. Plain text only.',
}

export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { accusation, phase, history = [] } = req.body
    const systemPrompt = PHASE_PROMPTS[phase] || PHASE_PROMPTS.OPENING

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: `Accusation: ${accusation}` },
    ]

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 300,
      messages,
    })

    const content = completion.choices[0].message.content
    return res.status(200).json({ content })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
