// In-process store: Map<trialId, TrialMemory>
// Trials are cleaned up 10 minutes after verdict.

const store = new Map()
const cleanupTimers = new Map()

export function setMemory(trialId, memory) {
  store.set(trialId, memory)
}

export function getMemory(trialId) {
  return store.get(trialId) ?? null
}

export function deleteMemory(trialId) {
  store.delete(trialId)
  const t = cleanupTimers.get(trialId)
  if (t) { clearTimeout(t); cleanupTimers.delete(trialId) }
}

export function scheduleCleanup(trialId, delayMs = 10 * 60 * 1000) {
  const existing = cleanupTimers.get(trialId)
  if (existing) clearTimeout(existing)
  const t = setTimeout(() => deleteMemory(trialId), delayMs)
  cleanupTimers.set(trialId, t)
}

export function allTrialIds() {
  return [...store.keys()]
}
