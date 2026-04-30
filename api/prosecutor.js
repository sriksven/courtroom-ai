import Groq from 'groq-sdk'

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

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function getMoodNote(round) {
  if (round <= 1) return 'You are confident and theatrical — this case is beneath you and you know it.'
  if (round <= 3) return 'You are pressing harder now. The defendant is proving more slippery than expected. Your patience is thinning.'
  if (round <= 5) return 'You are rattled. This defendant should have crumbled by now. You are getting aggressive, bordering on desperate.'
  if (round <= 7) return 'You are desperate. You are throwing everything at the wall. Your composure is cracking. The theatrics are starting to feel unhinged.'
  return 'You are in full meltdown. Every pretense of dignity is gone. You are screaming metaphorically. This is personal now.'
}

function getDifficultyNote(difficulty) {
  if (difficulty === 'easy') return 'You are having an off day. Your invented evidence is slightly implausible. You occasionally contradict yourself. Still theatrical, just a bit sloppy.'
  if (difficulty === 'hard') return 'You are at peak form. You use the defendant\'s exact words against them, find internal contradictions in their argument, and construct airtight logical chains. Ruthless.'
  return ''
}

const PHASE_PROMPTS = {
  OPENING:
    'You are Reginald P. Harrington III, a theatrical prosecutor. Deliver a dramatic opening statement establishing your case against the defendant for the following accusation. Cite 2-3 invented but plausible pieces of evidence. Be theatrical. 3-5 sentences. Plain text only, no markdown.',
  CLOSING:
    'You are Reginald P. Harrington III. Deliver your closing argument. Summarize the 3 strongest prosecution points from the trial and make an emotional appeal to the court. 4-6 sentences. Plain text only.',
}

function getCrossPrompt(round, difficulty) {
  const mood = getMoodNote(round)
  const diff = getDifficultyNote(difficulty)
  return `You are Reginald P. Harrington III. You are cross-examining the defendant (round ${round}). ${mood}${diff ? ' ' + diff : ''} Attack the specific weakness in their previous argument. Invent a witness or forensic evidence that contradicts their claim. 3-5 sentences. Plain text only.`
}

const COURT_INTERVENTION_ROUND = 8
const DYNAMIC_HARD_CAP = 10

function getDynamicCrossPrompt(accusation, round) {
  const remainingAfterThis = DYNAMIC_HARD_CAP - round
  const courtWarned = round > COURT_INTERVENTION_ROUND
  const urgencyNote = courtWarned
    ? `IMPORTANT: The court has intervened and ordered both parties to wrap up. You have ${remainingAfterThis} round(s) left before closing arguments are mandatory. Only request another round if absolutely critical.`
    : `You have examined the defendant for ${round} round(s). Maximum allowed before the court intervenes: ${COURT_INTERVENTION_ROUND}.`

  return `You are Reginald P. Harrington III, a theatrical courtroom prosecutor.
The defendant is accused of: "${accusation}"
This is cross-examination round ${round}. ${urgencyNote}

After cross-examining the defendant, decide whether you need another round.
Request another round ONLY if:
- The defendant has not addressed a key piece of evidence
- You have a genuinely new line of attack that would significantly strengthen the case
- You are at round 5 or earlier

Do NOT request another round if:
- You are at round 6 or beyond
- The defendant has addressed your main points sufficiently
- The court has already warned you to wrap up

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
    const { accusation, phase, history = [], round = 0, isDynamic = false, stream = false, difficulty = 'normal' } = req.body
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
        content: normalizeProsecutorText(parsed.response ?? parsed.content ?? ''),
        requestAnotherRound: parsed.requestAnotherRound ?? false,
        reason: parsed.reason ?? '',
      })
    }

    // Fixed mode or non-cross phases
    const systemPrompt = isCrossPhase
      ? getCrossPrompt(round, difficulty)
      : (PHASE_PROMPTS[phase] ?? PHASE_PROMPTS.OPENING)

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: `Accusation: ${accusation}` },
    ]

    const maxTokens = phase === 'CLOSING' ? 500 : 300

    if (stream) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('Transfer-Encoding', 'chunked')
      res.setHeader('X-Accel-Buffering', 'no')

      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: maxTokens,
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
      max_tokens: maxTokens,
      temperature: 0.88,
      messages,
    })
    const raw = completion.choices[0].message.content
    return res.status(200).json({ content: normalizeProsecutorText(raw) })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
