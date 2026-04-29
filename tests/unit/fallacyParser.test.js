import { parseJudgeResponse } from '../../src/utils/fallacyParser.js'

describe('parseJudgeResponse', () => {
  const validResponse = JSON.stringify({
    guilty: true,
    verdict_statement: 'The defendant is guilty.',
    scores: { strength: 8, evidence: 7, logic: 9, persuasion: 6 },
    fallacies: ['Ad Hominem — DEFENSE in CROSS_1: attacked character'],
  })

  it('valid JSON string returns parsed object with all fields', () => {
    const result = parseJudgeResponse(validResponse)
    expect(result).toHaveProperty('guilty')
    expect(result).toHaveProperty('verdict_statement')
    expect(result).toHaveProperty('scores')
    expect(result).toHaveProperty('fallacies')
  })

  it('guilty: true is preserved correctly', () => {
    const result = parseJudgeResponse(validResponse)
    expect(result.guilty).toBe(true)
  })

  it('guilty: false is preserved correctly (not coerced)', () => {
    const input = JSON.stringify({ guilty: false, verdict_statement: 'Not guilty.', scores: {}, fallacies: [] })
    const result = parseJudgeResponse(input)
    expect(result.guilty).toBe(false)
  })

  it('missing fallacies key returns empty array', () => {
    const input = JSON.stringify({ guilty: true, verdict_statement: 'Guilty.', scores: {} })
    const result = parseJudgeResponse(input)
    expect(result.fallacies).toEqual([])
  })

  it('missing scores returns default zero scores', () => {
    const input = JSON.stringify({ guilty: true, verdict_statement: 'Guilty.' })
    const result = parseJudgeResponse(input)
    expect(result.scores).toEqual({ strength: 0, evidence: 0, logic: 0, persuasion: 0 })
  })

  it('partial scores use 0 for missing fields', () => {
    const input = JSON.stringify({ guilty: true, verdict_statement: 'Guilty.', scores: { strength: 5 } })
    const result = parseJudgeResponse(input)
    expect(result.scores.strength).toBe(5)
    expect(result.scores.evidence).toBe(0)
    expect(result.scores.logic).toBe(0)
    expect(result.scores.persuasion).toBe(0)
  })

  it('malformed JSON returns object with error: true', () => {
    const result = parseJudgeResponse('{not valid json}')
    expect(result.error).toBe(true)
  })

  it('empty string returns object with error: true', () => {
    const result = parseJudgeResponse('')
    expect(result.error).toBe(true)
  })

  it('JSON wrapped in markdown fences is correctly stripped and parsed', () => {
    const input = '```json\n' + validResponse + '\n```'
    const result = parseJudgeResponse(input)
    expect(result.error).toBeUndefined()
    expect(result.guilty).toBe(true)
  })

  it('JSON wrapped in plain markdown fences is correctly stripped and parsed', () => {
    const input = '```\n' + validResponse + '\n```'
    const result = parseJudgeResponse(input)
    expect(result.error).toBeUndefined()
    expect(result.guilty).toBe(true)
  })

  it('JSON with extra whitespace correctly parses', () => {
    const input = '   ' + validResponse + '   '
    const result = parseJudgeResponse(input)
    expect(result.error).toBeUndefined()
    expect(result.guilty).toBe(true)
  })

  it('error response still has fallacies and scores', () => {
    const result = parseJudgeResponse('bad input!')
    expect(result.fallacies).toEqual([])
    expect(result.scores).toEqual({ strength: 0, evidence: 0, logic: 0, persuasion: 0 })
  })

  it('missing verdict_statement uses default text', () => {
    const input = JSON.stringify({ guilty: true })
    const result = parseJudgeResponse(input)
    expect(typeof result.verdict_statement).toBe('string')
    expect(result.verdict_statement.length).toBeGreaterThan(0)
  })
})
