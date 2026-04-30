import Groq from 'groq-sdk'

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

const PHASE_PROMPTS = {
  OPENING:
    'You are Reginald P. Harrington III, a theatrical prosecutor. Deliver a dramatic opening statement establishing your case against the defendant for the following accusation. Cite 2-3 invented but plausible pieces of evidence. Be theatrical. 3-5 sentences. Plain text only, no markdown.',
  CLOSING:
    'You are Reginald P. Harrington III. Deliver your closing argument. Summarize the 3 strongest prosecution points from the trial and make an emotional appeal to the court. 4-6 sentences. Plain text only.',
}

function getCrossPrompt(round) {
  return `You are Reginald P. Harrington III. You are cross-examining the defendant (round ${round}). Attack the specific weakness in their previous argument. Invent a witness or forensic evidence that contradicts their claim. Be relentless and dramatic. 3-5 sentences. Plain text only.`
}

function getDynamicCrossPrompt(accusation, round) {
  return `You are Reginald P. Harrington III, a theatrical courtroom prosecutor.
The defendant is accused of: "${accusation}"
This is cross-examination round ${round}. Maximum rounds allowed: 6.

After cross-examining the defendant, decide whether you need another round.
Request another round ONLY if:
- The defendant has not addressed a key piece of evidence
- You have a new line of attack that would significantly strengthen the case
- You are at round 3 or earlier

Do NOT request another round if:
- You are at round 4 or beyond
- The defendant has addressed your main points sufficiently
- You have made your case

Respond ONLY with valid JSON - no markdown, no extra text:
{
  "response": "your cross-examination text here (3-5 sentences, theatrical, dramatic, plain text)",
  "requestAnotherRound": true or false,
  "reason": "one sentence explaining your decision"
}`
}

export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { accusation, phase, history = [], round = 0, isDynamic = false, stream = false } = req.body
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const isCrossPhase = phase?.startsWith('CROSS_')

    // Dynamic cross-examination - return JSON with continue/close decision (no streaming)
    if (isDynamic && isCrossPhase) {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 350,
        temperature: 0.88,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: getDynamicCrossPrompt(accusation, round) },
          ...history,
        ],
      })

      let parsed
      try {
        parsed = JSON.parse(completion.choices[0].message.content)
      } catch {
        parsed = { response: completion.choices[0].message.content, requestAnotherRound: false, reason: '' }
      }

      return res.status(200).json({
        content: parsed.response ?? parsed.content ?? '',
        requestAnotherRound: parsed.requestAnotherRound ?? false,
        reason: parsed.reason ?? '',
      })
    }

    // Fixed mode or non-cross phases
    const systemPrompt = isCrossPhase
      ? getCrossPrompt(round)
      : (PHASE_PROMPTS[phase] ?? PHASE_PROMPTS.OPENING)

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: `Accusation: ${accusation}` },
    ]

    if (stream) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('Transfer-Encoding', 'chunked')
      res.setHeader('X-Accel-Buffering', 'no')

      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 300,
        temperature: 0.88,
        stream: true,
        messages,
      })

      for await (const chunk of completion) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) res.write(text)
      }
      return res.end()
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 300,
      temperature: 0.88,
      messages,
    })

    return res.status(200).json({ content: completion.choices[0].message.content })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
