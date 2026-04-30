import { PHASE_LABELS, CROSS_PHASES } from '../../constants/phases.js'

export default function TrialHeader({ accusation, phase, round }) {
  const isCross = CROSS_PHASES.includes(phase)
  const phaseLabel = PHASE_LABELS[phase] || phase

  return (
    <div
      className="sticky top-0 z-10 border-b border-yellow-900/30"
      style={{ background: '#1a1008' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2">
        {/* Logo */}
        <span
          style={{
            color: '#C9A84C',
            fontSize: '0.7rem',
            letterSpacing: '0.15em',
            fontFamily: 'Georgia, serif',
            fontWeight: 'bold',
          }}
        >
          ALL RISE
        </span>

        {/* Phase badge */}
        <span
          style={{
            background: isCross ? '#4a0a0a' : 'rgba(201,168,76,0.12)',
            color: '#C9A84C',
            padding: '3px 12px',
            borderRadius: '999px',
            fontSize: '0.7rem',
            letterSpacing: '0.08em',
            fontFamily: 'Georgia, serif',
            fontVariant: 'small-caps',
            border: '1px solid rgba(201,168,76,0.25)',
          }}
        >
          {phaseLabel}
        </span>

        {/* Round counter */}
        <span
          style={{
            color: '#C9A84C',
            fontSize: '0.7rem',
            fontFamily: 'monospace',
            minWidth: '80px',
            textAlign: 'right',
            visibility: isCross ? 'visible' : 'hidden',
          }}
        >
          Round {round} of 3
        </span>
      </div>

      {/* Accusation banner */}
      {accusation && (
        <div
          className="px-4 pb-2"
          style={{
            color: '#F5F0E8',
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            fontSize: '0.78rem',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          The defendant stands accused of: {accusation}
        </div>
      )}
    </div>
  )
}
