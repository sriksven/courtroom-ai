import { buildFullTranscript, buildRollingWindow } from '../../src/utils/transcriptManager.js'

describe('buildFullTranscript', () => {
  it('empty array returns empty string', () => {
    expect(buildFullTranscript([])).toBe('')
  })

  it('prosecutor message in OPENING phase includes === OPENING === header', () => {
    const messages = [{ role: 'prosecutor', phase: 'OPENING', content: 'Opening statement.' }]
    const result = buildFullTranscript(messages)
    expect(result).toContain('=== OPENING ===')
  })

  it('prosecutor message in OPENING phase includes PROSECUTOR: label', () => {
    const messages = [{ role: 'prosecutor', phase: 'OPENING', content: 'Opening statement.' }]
    const result = buildFullTranscript(messages)
    expect(result).toContain('PROSECUTOR:')
  })

  it('defense message in CROSS_1 phase includes === ROUND 1 === header', () => {
    const messages = [{ role: 'defense', phase: 'CROSS_1', content: 'Defense argument.' }]
    const result = buildFullTranscript(messages)
    expect(result).toContain('=== ROUND 1 ===')
  })

  it('defense message includes DEFENSE: label', () => {
    const messages = [{ role: 'defense', phase: 'CROSS_1', content: 'Defense argument.' }]
    const result = buildFullTranscript(messages)
    expect(result).toContain('DEFENSE:')
  })

  it('multiple messages appear in correct order', () => {
    const messages = [
      { role: 'prosecutor', phase: 'OPENING', content: 'First.' },
      { role: 'defense', phase: 'OPENING', content: 'Second.' },
    ]
    const result = buildFullTranscript(messages)
    expect(result.indexOf('First.')).toBeLessThan(result.indexOf('Second.'))
  })

  it('judge messages are excluded from transcript', () => {
    const messages = [
      { role: 'judge', phase: 'OPENING', content: 'Order in the court.' },
      { role: 'prosecutor', phase: 'OPENING', content: 'My statement.' },
    ]
    const result = buildFullTranscript(messages)
    expect(result).not.toContain('Order in the court.')
  })

  it('system messages are excluded from transcript', () => {
    const messages = [
      { role: 'system', phase: 'OPENING', content: 'System message.' },
      { role: 'prosecutor', phase: 'OPENING', content: 'Prosecutor speaks.' },
    ]
    const result = buildFullTranscript(messages)
    expect(result).not.toContain('System message.')
  })

  it('verdict messages are excluded from transcript', () => {
    const messages = [
      { role: 'verdict', phase: 'CLOSING', content: 'The verdict.' },
      { role: 'prosecutor', phase: 'CLOSING', content: 'Closing argument.' },
    ]
    const result = buildFullTranscript(messages)
    expect(result).not.toContain('The verdict.')
  })

  it('content appears after the role label', () => {
    const messages = [{ role: 'prosecutor', phase: 'OPENING', content: 'My opening words.' }]
    const result = buildFullTranscript(messages)
    expect(result).toContain('PROSECUTOR: My opening words.')
  })
})

describe('buildRollingWindow', () => {
  it('returns last 6 messages when history has more than 6', () => {
    const messages = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? 'prosecutor' : 'defense',
      content: `Message ${i}`,
    }))
    const result = buildRollingWindow(messages)
    expect(result.length).toBe(6)
  })

  it('returns all messages when history has 6 or fewer', () => {
    const messages = Array.from({ length: 4 }, (_, i) => ({
      role: i % 2 === 0 ? 'prosecutor' : 'defense',
      content: `Message ${i}`,
    }))
    const result = buildRollingWindow(messages)
    expect(result.length).toBe(4)
  })

  it('maps prosecutor role to assistant', () => {
    const messages = [{ role: 'prosecutor', content: 'prosecutor speaks' }]
    const result = buildRollingWindow(messages)
    expect(result[0].role).toBe('assistant')
  })

  it('maps defense role to user', () => {
    const messages = [{ role: 'defense', content: 'defense speaks' }]
    const result = buildRollingWindow(messages)
    expect(result[0].role).toBe('user')
  })

  it('excludes judge messages', () => {
    const messages = [
      { role: 'judge', content: 'Order!' },
      { role: 'prosecutor', content: 'Statement.' },
    ]
    const result = buildRollingWindow(messages)
    expect(result.length).toBe(1)
    expect(result[0].content).toBe('Statement.')
  })

  it('excludes system messages', () => {
    const messages = [
      { role: 'system', content: 'sys msg' },
      { role: 'defense', content: 'defense msg' },
    ]
    const result = buildRollingWindow(messages)
    expect(result.length).toBe(1)
  })

  it('returns objects with role and content properties', () => {
    const messages = [{ role: 'prosecutor', content: 'hello' }]
    const result = buildRollingWindow(messages)
    expect(result[0]).toHaveProperty('role')
    expect(result[0]).toHaveProperty('content')
  })

  it('custom windowSize parameter is respected', () => {
    const messages = Array.from({ length: 8 }, (_, i) => ({
      role: 'prosecutor',
      content: `msg ${i}`,
    }))
    const result = buildRollingWindow(messages, 4)
    expect(result.length).toBe(4)
  })
})
