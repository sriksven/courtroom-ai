import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '../.env.local', override: true })

import { WorkerOptions, cli, defineAgent, JobContext } from '@livekit/agents'
import { runProsecutor, runJudge, runHint } from './llm.js'

// Build a text transcript from message history for the judge
function buildTranscript(messages) {
  return messages
    .filter(m => m.role !== 'system')
    .map(m => {
      const label = m.role === 'prosecutor' ? 'PROSECUTION' : m.role === 'defense' ? 'DEFENSE' : 'COURT'
      return `[${label}]: ${m.content}`
    })
    .join('\n\n')
}

export default defineAgent({
  entry: async (ctx) => {
    await ctx.connect()

    const room = ctx.room
    console.log(`[agent] Joined room: ${room.name}`)

    // Send ready signal so the browser knows the agent is connected
    const readyMsg = JSON.stringify({ type: 'agent_ready', room: room.name })
    await room.localParticipant.publishData(
      new TextEncoder().encode(readyMsg),
      { reliable: true }
    )

    // Listen for data messages from browser participants
    room.on('dataReceived', async (payload, participant, _kind, topic) => {
      if (!participant) return // ignore messages from self

      let msg
      try {
        msg = JSON.parse(new TextDecoder().decode(payload))
      } catch {
        return
      }

      console.log(`[agent] Received type=${msg.type} phase=${msg.phase}`)

      try {
        if (msg.type === 'defense_submitted') {
          const text = await runProsecutor({
            accusation: msg.accusation,
            phase: msg.phase,
            history: msg.history ?? [],
          })
          await send(room, { type: 'prosecutor_response', text, phase: msg.phase, round: msg.round })
        }

        else if (msg.type === 'closing_submitted') {
          const transcript = buildTranscript(msg.messages ?? [])
          const verdict = await runJudge({ accusation: msg.accusation, transcript })
          await send(room, { type: 'verdict', verdict })
        }

        else if (msg.type === 'hint_requested') {
          const hints = await runHint({
            accusation: msg.accusation,
            latestProsecutorStatement: msg.latestProsecutorStatement ?? '',
          })
          await send(room, { type: 'hint_response', hints })
        }

      } catch (err) {
        console.error(`[agent] Error handling ${msg.type}:`, err.message)
        await send(room, { type: 'error', originalType: msg.type, message: err.message })
      }
    })

    // Keep agent alive until room closes
    await new Promise((resolve) => {
      room.on('disconnected', resolve)
    })

    console.log(`[agent] Room ${room.name} ended`)
  },
})

async function send(room, data) {
  const encoded = new TextEncoder().encode(JSON.stringify(data))
  await room.localParticipant.publishData(encoded, { reliable: true })
}

// Entry point
cli.runApp(new WorkerOptions({
  agent: new URL(import.meta.url),
  wsURL: process.env.LIVEKIT_URL,
  apiKey: process.env.LIVEKIT_API_KEY,
  apiSecret: process.env.LIVEKIT_API_SECRET,
}))
