import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '../.env.local', override: true })

import { WorkerOptions, cli, defineAgent } from '@livekit/agents'
import { TrialOrchestrator } from './orchestrator.js'

export default defineAgent({
  entry: async (ctx) => {
    await ctx.connect()
    const room = ctx.room
    console.log(`[agent] Joined room: ${room.name}`)

    const orchestrator = new TrialOrchestrator(room)

    // Signal browser that agent is ready
    await publish(room, { type: 'agent_ready', room: room.name })

    room.on('dataReceived', async (payload, participant) => {
      if (!participant) return
      let msg
      try {
        msg = JSON.parse(new TextDecoder().decode(payload))
      } catch {
        return
      }

      console.log(`[agent] msg type=${msg.type} phase=${msg.phase ?? '—'}`)

      try {
        if (msg.type === 'defense_submitted') {
          const text = await orchestrator.handleDefenseSubmitted({
            trialId: msg.trialId ?? room.name,
            accusation: msg.accusation,
            phase: msg.phase,
            round: msg.round ?? 0,
            defenseText: msg.text ?? '',
          })
          await publish(room, { type: 'prosecutor_response', text, phase: msg.phase, round: msg.round })
        }

        else if (msg.type === 'closing_submitted') {
          const verdict = await orchestrator.handleClosingSubmitted({
            trialId: msg.trialId ?? room.name,
            accusation: msg.accusation,
            defenseText: msg.text ?? '',
          })
          await publish(room, { type: 'verdict', verdict })
        }

        else if (msg.type === 'hint_requested') {
          const hints = await orchestrator.handleHintRequested({
            trialId: msg.trialId ?? room.name,
            accusation: msg.accusation,
          })
          await publish(room, { type: 'hint_response', hints })
        }

      } catch (err) {
        console.error(`[agent] Error handling ${msg.type}:`, err)
        await publish(room, { type: 'error', originalType: msg.type, message: err.message })
      }
    })

    await new Promise(resolve => room.on('disconnected', resolve))
    console.log(`[agent] Room ${room.name} ended`)
  },
})

function publish(room, data) {
  return room.localParticipant.publishData(
    new TextEncoder().encode(JSON.stringify(data)),
    { reliable: true }
  )
}

cli.runApp(new WorkerOptions({
  agent: new URL(import.meta.url),
  wsURL: process.env.LIVEKIT_URL,
  apiKey: process.env.LIVEKIT_API_KEY,
  apiSecret: process.env.LIVEKIT_API_SECRET,
}))
