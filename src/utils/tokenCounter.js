const THRESHOLD = 3000

export function estimate(text) {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

export function shouldTruncate(messages) {
  const total = messages.reduce((sum, m) => sum + estimate(m.content || ''), 0)
  return total > THRESHOLD
}

export function getWindowSize(messages) {
  return shouldTruncate(messages) ? 4 : 6
}
