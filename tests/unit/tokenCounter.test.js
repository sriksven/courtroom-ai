import { estimate, shouldTruncate, getWindowSize } from '../../src/utils/tokenCounter.js'

describe('estimate', () => {
  it('empty string returns 0', () => {
    expect(estimate('')).toBe(0)
  })

  it('null/undefined returns 0', () => {
    expect(estimate(null)).toBe(0)
    expect(estimate(undefined)).toBe(0)
  })

  it('"hello" returns a positive integer', () => {
    const result = estimate('hello')
    expect(result).toBeGreaterThan(0)
    expect(Number.isInteger(result)).toBe(true)
  })

  it('returns approximately length/4 (within ±1)', () => {
    const text = 'abcdefghijklmnop' // 16 chars → expect 4
    const result = estimate(text)
    expect(Math.abs(result - text.length / 4)).toBeLessThanOrEqual(1)
  })

  it('uses Math.ceil for fractional tokens', () => {
    // 5 chars / 4 = 1.25 → ceil = 2
    expect(estimate('hello')).toBe(2)
  })
})

describe('shouldTruncate', () => {
  it('empty array returns false', () => {
    expect(shouldTruncate([])).toBe(false)
  })

  it('small messages return false', () => {
    const messages = [
      { content: 'short message' },
      { content: 'another short one' },
    ]
    expect(shouldTruncate(messages)).toBe(false)
  })

  it('many long messages return true', () => {
    // THRESHOLD is 3000 tokens = ~12000 chars
    const longContent = 'a'.repeat(4000)
    const messages = [
      { content: longContent },
      { content: longContent },
      { content: longContent },
      { content: longContent },
    ]
    expect(shouldTruncate(messages)).toBe(true)
  })

  it('messages with missing content field use 0 estimate', () => {
    const messages = [{ role: 'prosecutor' }, { role: 'defense' }]
    expect(shouldTruncate(messages)).toBe(false)
  })
})

describe('getWindowSize', () => {
  it('returns 6 when total tokens are below threshold', () => {
    const messages = [{ content: 'short message' }]
    expect(getWindowSize(messages)).toBe(6)
  })

  it('returns 4 when total tokens exceed threshold', () => {
    const longContent = 'a'.repeat(4000)
    const messages = [
      { content: longContent },
      { content: longContent },
      { content: longContent },
      { content: longContent },
    ]
    expect(getWindowSize(messages)).toBe(4)
  })

  it('returns 6 for empty messages array', () => {
    expect(getWindowSize([])).toBe(6)
  })
})
