export function useScoring(scores) {
  if (!scores) return { total: 0, percentage: 0, grade: 'N/A', breakdown: [] }

  const { strength = 0, evidence = 0, logic = 0, persuasion = 0 } = scores
  const total = strength + evidence + logic + persuasion
  const percentage = Math.round((total / 40) * 100)

  const grade = total >= 36 ? 'Outstanding'
    : total >= 28 ? 'Competent'
    : total >= 20 ? 'Struggling'
    : 'Dismal'

  const breakdown = [
    { label: 'Strength', value: strength, description: 'Forcefulness and confidence of arguments' },
    { label: 'Evidence', value: evidence, description: 'Quality and plausibility of cited evidence' },
    { label: 'Logic', value: logic, description: 'Internal consistency and logical structure' },
    { label: 'Persuasion', value: persuasion, description: 'Overall persuasive effect on the court' },
  ]

  return { total, percentage, grade, breakdown }
}
