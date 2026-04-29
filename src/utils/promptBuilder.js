import { PROSECUTOR_PERSONA, JUDGE_PERSONA, DEFENSE_ASSISTANT_PERSONA } from '../constants/agentPersonas.js'

function getPhaseInstruction(phase, accusation) {
  if (phase === 'OPENING') {
    return `Deliver a dramatic opening statement establishing your case against the defendant for: ${accusation}. Be theatrical, mention 2-3 invented pieces of evidence. Never hedge.`
  }
  if (phase === 'CROSS_1' || phase === 'CROSS_2' || phase === 'CROSS_3') {
    return `You are cross-examining the defendant. Attack the weaknesses in their previous argument. Invent a witness or piece of forensic evidence that contradicts their claim.`
  }
  if (phase === 'CLOSING') {
    return `Deliver your closing argument. Summarize the 3 strongest points from the trial and make an emotional appeal to the court.`
  }
  return ''
}

export function buildProsecutorPrompt(accusation, phase, history) {
  const phaseInstruction = getPhaseInstruction(phase, accusation)
  const systemPrompt = `${PROSECUTOR_PERSONA}\n\n${phaseInstruction}`

  let messages
  if (!history || history.length === 0) {
    messages = [{ role: 'user', content: 'Begin the trial.' }]
  } else {
    const conversational = history.filter(
      (m) => m.role === 'prosecutor' || m.role === 'defense'
    )
    const windowed = conversational.slice(-6)
    messages = windowed.map((m) => ({
      role: m.role === 'defense' ? 'user' : 'assistant',
      content: m.content,
    }))
  }

  return { systemPrompt, messages }
}

const JUDGE_SCHEMA_INSTRUCTION = `
You must return ONLY this JSON structure, nothing else:
{
  "guilty": boolean,
  "verdict_statement": "2-3 sentence formal judicial pronouncement",
  "scores": {
    "strength": integer 1-10,
    "evidence": integer 1-10,
    "logic": integer 1-10,
    "persuasion": integer 1-10
  },
  "fallacies": [
    "Fallacy Name — DEFENSE/PROSECUTOR in [phase]: brief description"
  ]
}
Threshold: score total >= 24 → guilty: false (Not Guilty). But you may override based on overall quality.`

export function buildJudgePrompt(accusation, transcript) {
  const systemPrompt = `${JUDGE_PERSONA}\n${JUDGE_SCHEMA_INSTRUCTION}`
  const messages = [
    {
      role: 'user',
      content: `Here is the complete trial transcript for Case: ${accusation}\n\n${transcript}`,
    },
  ]
  return { systemPrompt, messages }
}

export function buildDefenseAssistantPrompt(accusation, latestProsecutorStatement) {
  const systemPrompt = DEFENSE_ASSISTANT_PERSONA
  const messages = [
    {
      role: 'user',
      content: `Accusation: ${accusation}\n\nThe prosecutor just said: "${latestProsecutorStatement}"\n\nGive me 3 defense tactics.`,
    },
  ]
  return { systemPrompt, messages }
}
