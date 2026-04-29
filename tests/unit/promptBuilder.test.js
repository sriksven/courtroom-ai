import { buildProsecutorPrompt, buildJudgePrompt, buildDefenseAssistantPrompt } from '../../src/utils/promptBuilder.js'

describe('buildProsecutorPrompt', () => {
  it('returns an object with systemPrompt and messages', () => {
    const result = buildProsecutorPrompt('test accusation', 'OPENING', [])
    expect(result).toHaveProperty('systemPrompt')
    expect(result).toHaveProperty('messages')
  })

  it('systemPrompt is a string', () => {
    const { systemPrompt } = buildProsecutorPrompt('test accusation', 'OPENING', [])
    expect(typeof systemPrompt).toBe('string')
  })

  it('systemPrompt includes the accusation text', () => {
    const { systemPrompt } = buildProsecutorPrompt('stealing cookies', 'OPENING', [])
    expect(systemPrompt).toContain('stealing cookies')
  })

  it('messages array has at least one item when history is empty', () => {
    const { messages } = buildProsecutorPrompt('test accusation', 'OPENING', [])
    expect(messages.length).toBeGreaterThanOrEqual(1)
  })

  it('messages array starts with "Begin the trial." when history is empty', () => {
    const { messages } = buildProsecutorPrompt('test accusation', 'OPENING', [])
    expect(messages[0].content).toBe('Begin the trial.')
  })

  it('with 8-message history, rolling window limits to 6', () => {
    const history = Array.from({ length: 8 }, (_, i) => ({
      role: i % 2 === 0 ? 'prosecutor' : 'defense',
      content: `Message ${i}`,
    }))
    const { messages } = buildProsecutorPrompt('accusation', 'CROSS_1', history)
    expect(messages.length).toBe(6)
  })

  it('maps defense role to user in messages', () => {
    const history = [{ role: 'defense', content: 'defense argument' }]
    const { messages } = buildProsecutorPrompt('accusation', 'CROSS_1', history)
    expect(messages[0].role).toBe('user')
  })

  it('maps prosecutor role to assistant in messages', () => {
    const history = [{ role: 'prosecutor', content: 'prosecutor statement' }]
    const { messages } = buildProsecutorPrompt('accusation', 'CROSS_1', history)
    expect(messages[0].role).toBe('assistant')
  })

  it('filters out non-conversational roles from history', () => {
    const history = [
      { role: 'judge', content: 'order in the court' },
      { role: 'prosecutor', content: 'prosecutor speaks' },
    ]
    const { messages } = buildProsecutorPrompt('accusation', 'CROSS_1', history)
    expect(messages.length).toBe(1)
    expect(messages[0].content).toBe('prosecutor speaks')
  })
})

describe('buildJudgePrompt', () => {
  it('returns systemPrompt and messages', () => {
    const result = buildJudgePrompt('accusation', 'transcript text')
    expect(result).toHaveProperty('systemPrompt')
    expect(result).toHaveProperty('messages')
  })

  it('systemPrompt contains JSON schema structure', () => {
    const { systemPrompt } = buildJudgePrompt('accusation', 'transcript')
    expect(systemPrompt).toContain('"guilty"')
    expect(systemPrompt).toContain('"verdict_statement"')
    expect(systemPrompt).toContain('"scores"')
  })

  it('messages include the accusation in user content', () => {
    const { messages } = buildJudgePrompt('armed robbery', 'transcript text')
    expect(messages[0].content).toContain('armed robbery')
  })

  it('messages include the transcript text', () => {
    const { messages } = buildJudgePrompt('accusation', 'the full transcript here')
    expect(messages[0].content).toContain('the full transcript here')
  })
})

describe('buildDefenseAssistantPrompt', () => {
  it('returns systemPrompt and messages', () => {
    const result = buildDefenseAssistantPrompt('accusation', 'prosecutor said something')
    expect(result).toHaveProperty('systemPrompt')
    expect(result).toHaveProperty('messages')
  })

  it('messages include the prosecutor statement', () => {
    const { messages } = buildDefenseAssistantPrompt('theft', 'The defendant was caught red-handed.')
    expect(messages[0].content).toContain('The defendant was caught red-handed.')
  })

  it('messages include the accusation', () => {
    const { messages } = buildDefenseAssistantPrompt('grand theft auto', 'prosecutor statement')
    expect(messages[0].content).toContain('grand theft auto')
  })

  it('messages ask for 3 defense tactics', () => {
    const { messages } = buildDefenseAssistantPrompt('accusation', 'statement')
    expect(messages[0].content).toContain('3 defense tactics')
  })
})
