import { PHASES } from '../../constants/phases.js'

function getPlaceholder(phase) {
  if (phase === PHASES.CLOSING) return 'Deliver your closing argument...'
  return 'Type your defense here...'
}

export default function DefenseInput({ value, onChange, onSubmit, disabled, phase }) {
  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      if (!disabled && value.trim()) onSubmit()
    }
  }

  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      placeholder={getPlaceholder(phase)}
      rows={3}
      className="w-full resize-y bg-[#0f0a04] text-[#F5F0E8] font-serif text-base placeholder-[#F5F0E8]/30 border border-[#C9A84C]/30 rounded px-3 py-2 focus:outline-none focus:border-[#C9A84C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[4.5rem] max-h-40"
      style={{ minHeight: '4.5rem', maxHeight: '10rem' }}
    />
  )
}
