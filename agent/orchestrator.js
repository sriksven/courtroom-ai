import { createTrialMemory } from './memory/TrialMemory.js'
import { setMemory, getMemory, scheduleCleanup } from './memory/memoryStore.js'
import { addTranscriptMessage } from './memory/memoryHelpers.js'
import { runProsecutorAgent } from './agents/prosecutorAgent.js'
import { runJudgeAgent } from './agents/judgeAgent.js'
import { runDefenseAssistant } from './agents/defenseAssistant.js'

const PHASE_TO_ROUND = {
  OPENING: 0,
  CROSS_1: 1,
  CROSS_2: 2,
  CROSS_3: 3,
  CLOSING: 4,
}

export class TrialOrchestrator {
  constructor(room) {
    this.room = room
    this.trialId = null
  }

  // ── Trial lifecycle ───────────────────────────────────────────────────────

  initTrial(trialId, accusation) {
    const memory = createTrialMemory(trialId, accusation)
    setMemory(trialId, memory)
    this.trialId = trialId
    console.log(`[orchestrator] Trial started: ${trialId} — "${accusation}"`)
    return memory
  }

  getMemory() {
    if (!this.trialId) return null
    return getMemory(this.trialId)
  }

  // ── Handle defense submission → prosecutor response ────────────────────

  async handleDefenseSubmitted({ trialId, accusation, phase, round, defenseText }) {
    let memory = getMemory(trialId)
    if (!memory) {
      memory = this.initTrial(trialId, accusation)
    }

    // Record defense in transcript
    if (defenseText) {
      addTranscriptMessage(memory, 'defense', defenseText, phase, round)
    }

    console.log(`[orchestrator] Prosecutor running: phase=${phase} round=${round}`)
    const prosecutorText = await runProsecutorAgent({ memory, defenseText, phase, round: PHASE_TO_ROUND[phase] ?? round })

    // Record prosecutor response in transcript
    addTranscriptMessage(memory, 'prosecutor', prosecutorText, phase, round)

    return prosecutorText
  }

  // ── Handle closing → verdict ───────────────────────────────────────────

  async handleClosingSubmitted({ trialId, accusation, defenseText }) {
    let memory = getMemory(trialId)
    if (!memory) {
      memory = this.initTrial(trialId, accusation)
    }

    // Record closing defense
    if (defenseText) {
      addTranscriptMessage(memory, 'defense', defenseText, 'CLOSING', 4)
    }

    console.log(`[orchestrator] Judge running verdict for trial ${trialId}`)
    const verdict = await runJudgeAgent({ memory })

    addTranscriptMessage(memory, 'judge', verdict.verdict_statement, 'VERDICT', 0)

    // Schedule memory cleanup after 10 minutes
    scheduleCleanup(trialId)

    return verdict
  }

  // ── Handle hint request → defense assistant ────────────────────────────

  async handleHintRequested({ trialId, accusation }) {
    let memory = getMemory(trialId)
    if (!memory) {
      memory = this.initTrial(trialId, accusation)
    }

    console.log(`[orchestrator] Defense assistant running for trial ${trialId}`)
    return runDefenseAssistant({ memory })
  }
}
