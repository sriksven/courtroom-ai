/**
 * Flow 2 — Full Voice Agent
 *
 * Joins the same room as the browser, but runs a full
 * STT → Prosecutor LLM → TTS pipeline using LiveKit's voice.AgentSession.
 * The browser streams mic audio; the agent responds with audio.
 *
 * Phase state is stored in agentState and updated via data messages from the browser.
 */
import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '../.env.local', override: true })

import {
  WorkerOptions,
  cli,
  defineAgent,
  JobContext,
  voice,
} from '@livekit/agents'
import * as openaiPlugin from '@livekit/agents-plugin-openai'
import { runProsecutor, runJudge, runHint } from './llm.js'
import { PHASE_PROMPTS } from './prompts.js'

// Custom LLM adapter that routes to Groq or OpenAI based on trial phase
class TrialLLM {
  constructor(getPhase, getAccusation, getHistory) {
    this._getPhase = getPhase
    this._getAccusation = getAccusation
    this._getHistory = getHistory
  }

  // LiveKit calls this with the conversation turn
  async chat({ messages }) {
    const phase = this._getPhase()
    const accusation = this._getAccusation()
    const history = this._getHistory()

    // Extract the latest user message as the defense text
    const userMsg = [...messages].reverse().find(m => m.role === 'user')
    const defenseText = userMsg?.content ?? ''

    if (phase === 'CLOSING') {
      // For closing, run the judge and return the verdict statement as speech
      const allMsgs = history.concat([{ role: 'defense', content: defenseText }])
      const transcript = allMsgs
        .map(m => `[${m.role.toUpperCase()}]: ${m.content}`)
        .join('\n\n')
      try {
        const verdict = await runJudge({ accusation, transcript })
        return {
          choices: [{
            message: {
              role: 'assistant',
              content: verdict.verdict_statement || 'The court has reached a verdict.',
            },
          }],
          _verdict: verdict,
        }
      } catch {
        return {
          choices: [{ message: { role: 'assistant', content: 'The court has reached a decision.' } }],
        }
      }
    }

    // All other phases — Prosecutor via Groq
    const prosecutorHistory = history
      .filter(m => m.role === 'prosecutor' || m.role === 'defense')
      .map(m => ({ role: m.role === 'prosecutor' ? 'assistant' : 'user', content: m.content }))

    const text = await runProsecutor({
      accusation,
      phase,
      history: prosecutorHistory,
    })

    return {
      choices: [{ message: { role: 'assistant', content: text } }],
    }
  }
}

function buildTranscript(messages) {
  return messages
    .filter(m => m.role !== 'system')
    .map(m => {
      const label = m.role === 'prosecutor' ? 'PROSECUTION'
        : m.role === 'defense' ? 'DEFENSE' : 'COURT'
      return `[${label}]: ${m.content}`
    })
    .join('\n\n')
}

export default defineAgent({
  entry: async (ctx) => {
    await ctx.connect()
    const room = ctx.room
    console.log(`[voice-agent] Joined room: ${room.name}`)

    // Mutable trial state updated via data messages
    const state = {
      phase: 'OPENING',
      round: 0,
      accusation: '',
      messages: [],
    }

    // Listen for state sync messages from browser
    room.on('dataReceived', async (payload, participant) => {
      if (!participant) return
      let msg
      try { msg = JSON.parse(new TextDecoder().decode(payload)) } catch { return }

      if (msg.type === 'trial_state') {
        state.phase = msg.phase ?? state.phase
        state.round = msg.round ?? state.round
        state.accusation = msg.accusation ?? state.accusation
        state.messages = msg.messages ?? state.messages
        console.log(`[voice-agent] State updated: phase=${state.phase} round=${state.round}`)
      }
    })

    const stt = new openaiPlugin.STT({ model: 'whisper-1', language: 'en' })
    const tts = new openaiPlugin.TTS({
      model: 'tts-1-hd',
      voice: 'onyx',   // Prosecutor voice — Judge uses 'alloy' (switched per phase)
    })

    const llm = new TrialLLM(
      () => state.phase,
      () => state.accusation,
      () => state.messages,
    )

    const session = new voice.AgentSession()

    session.on('user_input_transcribed', async ({ transcript, isFinal }) => {
      if (!isFinal) return
      console.log(`[voice-agent] User said: "${transcript}"`)

      // Record defense message
      state.messages.push({ role: 'defense', content: transcript, id: Date.now().toString() })

      // Tell browser we got the transcript
      await send(room, {
        type: 'defense_transcribed',
        text: transcript,
        phase: state.phase,
        round: state.round,
      })
    })

    session.on('agent_speech_committed', async ({ text }) => {
      console.log(`[voice-agent] Agent said: "${text.slice(0, 60)}…"`)

      // Record prosecutor message and notify browser
      const msgId = Date.now().toString()
      state.messages.push({ role: 'prosecutor', content: text, id: msgId })
      await send(room, {
        type: 'prosecutor_response',
        text,
        phase: state.phase,
        round: state.round,
      })
    })

    await session.start(room, {
      stt,
      tts,
      userAudioTrack: 'auto',
    })

    // Deliver opening statement immediately
    const opening = await runProsecutor({
      accusation: state.accusation || 'an unspecified charge',
      phase: 'OPENING',
      history: [],
    })
    await session.say(opening)

    // Keep alive
    await new Promise(resolve => room.on('disconnected', resolve))
  },
})

async function send(room, data) {
  const encoded = new TextEncoder().encode(JSON.stringify(data))
  await room.localParticipant.publishData(encoded, { reliable: true })
}

cli.runApp(new WorkerOptions({
  agent: new URL(import.meta.url),
  wsURL: process.env.LIVEKIT_URL,
  apiKey: process.env.LIVEKIT_API_KEY,
  apiSecret: process.env.LIVEKIT_API_SECRET,
}))
