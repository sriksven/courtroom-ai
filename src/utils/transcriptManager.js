const PHASE_HEADERS = {
  OPENING: 'OPENING',
  CROSS_1: 'ROUND 1',
  CROSS_2: 'ROUND 2',
  CROSS_3: 'ROUND 3',
  CLOSING: 'CLOSING',
}

const ROLE_LABELS = {
  prosecutor: 'PROSECUTOR',
  defense: 'DEFENSE',
}

export function buildFullTranscript(messages) {
  const ignored = new Set(['judge', 'system', 'verdict'])
  const filtered = messages.filter((m) => !ignored.has(m.role))

  const byPhase = new Map()
  const phaseOrder = []

  for (const msg of filtered) {
    const phase = msg.phase || 'UNKNOWN'
    if (!byPhase.has(phase)) {
      byPhase.set(phase, [])
      phaseOrder.push(phase)
    }
    byPhase.get(phase).push(msg)
  }

  const sections = []
  for (const phase of phaseOrder) {
    const header = PHASE_HEADERS[phase] || phase
    const lines = [`=== ${header} ===`]
    for (const msg of byPhase.get(phase)) {
      const label = ROLE_LABELS[msg.role] || msg.role.toUpperCase()
      lines.push(`${label}: ${msg.content}`)
    }
    sections.push(lines.join('\n'))
  }

  return sections.join('\n\n')
}

export function buildRollingWindow(messages, windowSize = 6) {
  const conversational = messages.filter(
    (m) => m.role === 'prosecutor' || m.role === 'defense'
  )
  return conversational.slice(-windowSize).map((m) => ({
    role: m.role === 'defense' ? 'user' : 'assistant',
    content: m.content,
  }))
}
