import { VOICE_MODE_STATES } from '../../hooks/useVoiceMode.js'

const CONFIG = {
  [VOICE_MODE_STATES.SPEAKING]: {
    label: (role) => role === 'judge' ? 'Judge is ruling…' : 'Prosecution is speaking…',
    sublabel: 'Listen carefully.',
    pulse: true,
    color: 'var(--prosecutor-border)',
    icon: '◉',
  },
  [VOICE_MODE_STATES.LISTENING]: {
    label: () => 'Your turn — speak your defense',
    sublabel: 'Speak clearly. Silence submits automatically.',
    pulse: true,
    color: 'var(--defense-border)',
    icon: '⬤',
  },
  [VOICE_MODE_STATES.PROCESSING]: {
    label: () => 'Submitting your defense…',
    sublabel: null,
    pulse: false,
    color: 'var(--text-muted)',
    icon: '○',
  },
  [VOICE_MODE_STATES.WAITING]: {
    label: () => 'The court considers…',
    sublabel: null,
    pulse: false,
    color: 'var(--text-muted)',
    icon: '○',
  },
  [VOICE_MODE_STATES.DONE]: {
    label: () => 'Verdict delivered.',
    sublabel: null,
    pulse: false,
    color: 'var(--text)',
    icon: '⚖',
  },
  [VOICE_MODE_STATES.IDLE]: {
    label: () => 'Voice mode active',
    sublabel: 'Waiting for the court…',
    pulse: false,
    color: 'var(--text-muted)',
    icon: '○',
  },
}

export default function VoiceStatus({ state, speakingRole, transcript, onExit }) {
  const cfg = CONFIG[state] || CONFIG[VOICE_MODE_STATES.IDLE]
  const label = cfg.label(speakingRole)

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--bg)',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      flexShrink: 0,
    }}>

      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span
          style={{
            fontSize: '18px',
            color: cfg.color,
            animation: cfg.pulse ? 'pulseDot 1.2s infinite' : 'none',
            lineHeight: 1,
          }}
        >
          {cfg.icon}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '13px',
            fontFamily: 'Georgia, serif',
            color: 'var(--text)',
            fontStyle: state === VOICE_MODE_STATES.LISTENING ? 'italic' : 'normal',
          }}>
            {label}
          </div>
          {cfg.sublabel && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {cfg.sublabel}
            </div>
          )}
        </div>
        <button
          onClick={onExit}
          title="Exit voice mode"
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            fontSize: '11px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            padding: '0.35rem 0.75rem',
            cursor: 'pointer',
            fontFamily: 'Georgia, serif',
          }}
        >
          Exit
        </button>
      </div>

      {/* Live transcript */}
      {transcript && (
        <div style={{
          padding: '0.65rem 0.85rem',
          background: 'var(--defense-bg)',
          borderLeft: '2px solid var(--defense-border)',
          fontSize: '13px',
          fontFamily: 'Georgia, serif',
          fontStyle: 'italic',
          color: 'var(--text)',
          lineHeight: 1.5,
        }}>
          "{transcript}"
        </div>
      )}

      {/* Waveform-like bars when listening */}
      {state === VOICE_MODE_STATES.LISTENING && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', height: '20px' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: '3px',
                background: 'var(--defense-border)',
                borderRadius: '2px',
                animation: `waveBar${(i % 4) + 1} ${0.6 + (i % 3) * 0.15}s ease-in-out infinite alternate`,
                height: `${8 + Math.sin(i * 1.2) * 6}px`,
                opacity: 0.7 + (i % 2) * 0.3,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
